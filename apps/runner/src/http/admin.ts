// Admin API (PRD §8.10, R-03). Bearer auth is applied by app.ts to /admin/*; paths here are full.
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { categorySchema } from '@fc/contracts';
import { Director, DirectorError } from '../control/director.js';
import { DemoError } from '../match/demo.js';

const err = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const startBody = z.object({
  category: categorySchema.optional(),
  fighters: z.array(z.string().min(1)).min(2).max(8).optional(),
  betWindowS: z.number().int().min(1).max(3600).optional(),
}).strict();
const holdBody = z.object({ seconds: z.number().int().min(1).max(3600) }).strict();
const voidBody = z.object({ reason: z.string().min(1).max(300) }).strict();
const seasonBody = z.object({ on: z.boolean() }).strict();
const demoBody = z.object({ fixture: z.string().min(1).max(100) }).strict();

export type AdminDeps = { director: Director };

export function createAdminRouter(deps?: AdminDeps): Router {
  const r = Router();
  if (!deps) return r;
  const { director } = deps;

  const handle = (fn: (req: Request, res: Response) => Promise<void> | void) =>
    async (req: Request, res: Response) => {
      try { await fn(req, res); }
      catch (e) {
        if (e instanceof DirectorError) return void err(res, e.status, e.code, e.message);
        if (e instanceof DemoError) return void err(res, e.code === 'stdb_down' ? 503 : 400, e.code, e.message);
        director.log(`admin error: ${(e as Error)?.message ?? 'unknown'}`);
        err(res, 500, 'internal', 'Internal error');
      }
    };
  const body = <T>(schema: z.ZodType<T>, req: Request, res: Response): T | null => {
    const p = schema.safeParse(req.body ?? {});
    if (!p.success) { err(res, 400, 'bad_request', p.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')); return null; }
    return p.data;
  };

  r.get('/admin/health', handle((_q, res) => { res.json(director.health()); }));
  r.get('/admin/log', handle((_q, res) => { res.json({ lines: director.logLines() }); }));
  r.post('/admin/matches', handle(async (req, res) => {
    const b = body(startBody, req, res); if (!b) return;
    res.status(201).json(await director.startMatch(b));
  }));
  r.post('/admin/matches/:id/lock', handle(async (req, res) => { await director.lock(String(req.params.id)); res.status(204).end(); }));
  r.post('/admin/matches/:id/hold', handle(async (req, res) => {
    const b = body(holdBody, req, res); if (!b) return;
    await director.hold(String(req.params.id), b.seconds); res.status(204).end();
  }));
  r.post('/admin/matches/:id/void', handle(async (req, res) => {
    const b = body(voidBody, req, res); if (!b) return;
    await director.void(String(req.params.id), b.reason); res.status(204).end();
  }));
  r.post('/admin/season', handle((req, res) => {
    const b = body(seasonBody, req, res); if (!b) return;
    director.setSeason(b.on); res.status(204).end();
  }));
  r.post('/admin/demo', handle(async (req, res) => {
    const b = body(demoBody, req, res); if (!b) return;
    await director.demo(b.fixture); res.status(204).end();
  }));
  return r;
}
