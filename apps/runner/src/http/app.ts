// Runner HTTP listeners (PRD §8.10): admin (127.0.0.1, bearer auth) and public (0.0.0.0, tunnelled).
import { timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express, { type ErrorRequestHandler, type Express, type NextFunction, type Request, type Response } from 'express';
import type { Director } from '../control/director.js';
import type { Env } from '../env.js';
import type { Payments } from '../payments/index.js';
import { createAdminRouter } from './admin.js';
import { createByoRouter } from './byo.js';
import { createPublicBookieRouter } from './public-bookie.js';

export type AppOptions = {
  adminHost?: string;      // default 127.0.0.1
  publicHost?: string;     // default 0.0.0.0
  payments?: Pick<Payments, 'hintRoute' | 'entryRoute'>;
  director?: Director;
};
export type RunnerApp = {
  start(): Promise<{ adminPort: number; publicPort: number }>;
  stop(): Promise<void>;
  adminApp: Express;
  publicApp: Express;
};

export const apiError = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function finish(app: Express) {
  app.use((_req, res) => apiError(res, 404, 'not_found', 'Not found'));
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (res.headersSent) return;
    const e = err as { status?: number; type?: string };
    if (e.type === 'entity.parse.failed') return apiError(res, 400, 'bad_json', 'Malformed JSON body');
    if (e.type === 'entity.too.large') return apiError(res, 413, 'too_large', 'Body too large');
    console.warn(`[http] unhandled error: ${(err as Error)?.message ?? 'unknown'}`);
    apiError(res, e.status && e.status >= 400 && e.status < 600 ? e.status : 500, 'internal', 'Internal error');
  };
  app.use(onError);
}

export function createApp(env: Env, opts: AppOptions = {}): RunnerApp {
  // ---- admin
  const adminApp = express();
  adminApp.disable('x-powered-by');
  const allowed = new Set(['http://localhost:5173']);
  if (env.FC_PUBLIC_WEB_URL) allowed.add(new URL(env.FC_PUBLIC_WEB_URL).origin);
  // Any loopback dev port (each workstream runs web on 5173+n); the listener is 127.0.0.1-only and bearer-protected.
  const loopback = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
  adminApp.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && (allowed.has(origin) || loopback.test(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') return void res.status(204).end();
    next();
  });
  adminApp.use('/admin', (req: Request, res: Response, next: NextFunction) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!m || !safeEqual(m[1]!, env.FC_DIRECTOR_TOKEN)) return apiError(res, 401, 'unauthorized', 'Missing or invalid bearer token');
    next();
  });
  adminApp.use(express.json({ limit: '100kb' }));
  adminApp.use(createAdminRouter(opts.director ? { director: opts.director } : undefined));   // router defines full /admin/* paths (§8.10)
  finish(adminApp);

  // ---- public
  const publicApp = express();
  publicApp.disable('x-powered-by');
  publicApp.use(express.json({ limit: '100kb' }));
  publicApp.get('/api/public/health', (_req, res) => { res.json({ ok: true }); });
  publicApp.use(createByoRouter());
  publicApp.use(createPublicBookieRouter());
  if (opts.payments?.entryRoute) publicApp.use(opts.payments.entryRoute);
  if (opts.payments?.hintRoute) publicApp.use(opts.payments.hintRoute);
  finish(publicApp);

  let servers: Server[] = [];
  const listen = (app: Express, port: number, host: string) =>
    new Promise<Server>((resolve, reject) => {
      const s = app.listen(port, host, () => resolve(s));
      s.once('error', reject);
    });

  return {
    adminApp, publicApp,
    async start() {
      const a = await listen(adminApp, env.FC_RUNNER_PORT, opts.adminHost ?? '127.0.0.1');
      let p: Server;
      try { p = await listen(publicApp, env.FC_PUBLIC_PORT, opts.publicHost ?? '0.0.0.0'); }
      catch (e) { a.close(); throw e; }
      servers = [a, p];
      return { adminPort: (a.address() as AddressInfo).port, publicPort: (p.address() as AddressInfo).port };
    },
    async stop() {
      const ss = servers; servers = [];
      await Promise.all(ss.map((s) => new Promise<void>((r) => { s.close(() => r()); s.closeAllConnections?.(); })));
    },
  };
}
