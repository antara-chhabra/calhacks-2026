import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Director } from '../src/control/director.js';
import { createAdminRouter } from '../src/http/admin.js';

const TOKEN = 'c'.repeat(32);
let server: Server | undefined;
afterEach(() => { server?.close(); server = undefined; });

async function boot(over: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const director = new Director({
    mode: 'live', engine: 'mock',
    runMatch: async () => ({ matchId: 'm_1' }),
    lockMatch: (id) => { calls.push(`lock ${id}`); },
    holdMatch: (id, s) => { calls.push(`hold ${id} ${s}`); },
    voidMatch: (id, r) => { calls.push(`void ${id} ${r}`); },
    stdbStatus: () => 'ok', secrets: () => ['gpt-secret-model'],
    ...over,
  });
  const app = express();
  app.use('/admin', (req, res, next) => (req.headers.authorization === `Bearer ${TOKEN}` ? next() : res.status(401).json({ error: { code: 'unauthorized', message: 'x' } })));
  app.use(express.json());
  app.use(createAdminRouter({ director }));
  server = await new Promise<Server>((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = (method: string, path: string, body?: unknown) => fetch(base + path, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { base, call, calls, director };
}

describe('admin routes', () => {
  it('requires bearer', async () => {
    const { base } = await boot();
    expect((await fetch(`${base}/admin/health`)).status).toBe(401);
  });
  it('health has the §8.10 shape', async () => {
    const { call } = await boot();
    const r = await call('GET', '/admin/health');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      ok: true, mode: 'live', engine: 'mock', stdb: 'ok', droid: 'mock', payments: 'off',
      season: { on: false, played: 0, creditsHour: 0, pausedReason: null },
    });
  });
  it('start -> 201, second start -> 409, bad body -> 400', async () => {
    const { call } = await boot();
    const a = await call('POST', '/admin/matches', { betWindowS: 20 });
    expect(a.status).toBe(201);
    expect(await a.json()).toEqual({ matchId: 'm_1' });
    const b = await call('POST', '/admin/matches', {});
    expect(b.status).toBe(409);
    expect((await b.json()).error.code).toBe('match_active');
    expect((await call('POST', '/admin/matches', { betWindowS: 'x' })).status).toBe(400);
  });
  it('lock/hold/void map to the director; unknown id 404', async () => {
    const { call, calls } = await boot();
    await call('POST', '/admin/matches', {});
    expect((await call('POST', '/admin/matches/m_1/lock')).status).toBe(204);
    expect((await call('POST', '/admin/matches/m_1/hold', { seconds: 15 })).status).toBe(204);
    expect((await call('POST', '/admin/matches/m_1/hold', {})).status).toBe(400);
    expect((await call('POST', '/admin/matches/nope/lock')).status).toBe(404);
    expect((await call('POST', '/admin/matches/m_1/void', { reason: 'oops' })).status).toBe(204);
    expect(calls).toEqual(['lock m_1', 'hold m_1 15', 'void m_1 oops']);
    expect((await call('POST', '/admin/matches', {})).status).toBe(201);   // slot freed by void
  });
  it('season, demo and redacted log', async () => {
    const { call, director } = await boot({ runDemo: async () => {} });
    expect((await call('POST', '/admin/season', { on: true })).status).toBe(204);
    expect((await call('GET', '/admin/health').then((r) => r.json())).season.on).toBe(true);
    expect((await call('POST', '/admin/season', {})).status).toBe(400);
    expect((await call('POST', '/admin/demo', { fixture: 'smoke' })).status).toBe(204);
    director.log('using gpt-secret-model with token=abc123 Bearer zzz');
    const { lines } = await call('GET', '/admin/log').then((r) => r.json());
    const last = lines[lines.length - 1];
    expect(last).not.toMatch(/gpt-secret-model|abc123|zzz/);
  });
  it('keeps only the last 50 log lines', async () => {
    const { call, director } = await boot();
    for (let i = 0; i < 80; i++) director.log(`l${i}`);
    const { lines } = await call('GET', '/admin/log').then((r) => r.json());
    expect(lines).toHaveLength(50);
    expect(lines[49]).toBe('l79');
  });
});
