import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';
import { createApp, type RunnerApp } from '../src/http/app.js';
import { connectStdb } from '../src/stdb.js';

const TOKEN = 'b'.repeat(32);
let app: RunnerApp | undefined;
afterEach(async () => { await app?.stop(); app = undefined; });

async function boot() {
  const env = loadEnv({ FC_DIRECTOR_TOKEN: TOKEN, FC_ENGINE: 'mock', FC_RUNNER_PORT: '0', FC_PUBLIC_PORT: '0' });
  app = createApp(env, { publicHost: '127.0.0.1' });
  return app.start();
}

describe('http app', () => {
  it('serves public health', async () => {
    const { publicPort } = await boot();
    const r = await fetch(`http://127.0.0.1:${publicPort}/api/public/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it('rejects admin calls without bearer, accepts with it', async () => {
    const { adminPort } = await boot();
    const r = await fetch(`http://127.0.0.1:${adminPort}/admin/health`);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: { code: 'unauthorized', message: expect.any(String) } });
    const bad = await fetch(`http://127.0.0.1:${adminPort}/admin/health`, { headers: { Authorization: 'Bearer nope' } });
    expect(bad.status).toBe(401);
    const ok = await fetch(`http://127.0.0.1:${adminPort}/admin/health`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    expect(ok.status).toBe(404);   // authorized, but no director is wired in this test, so the admin router is empty
    expect((await ok.json()).error.code).toBe('not_found');
  });

  it('answers CORS preflight for the local web origin only', async () => {
    const { adminPort } = await boot();
    const r = await fetch(`http://127.0.0.1:${adminPort}/admin/health`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    const other = await fetch(`http://127.0.0.1:${adminPort}/admin/health`, { method: 'OPTIONS', headers: { Origin: 'http://evil.test' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('stdb without bindings', () => {
  it('returns a down implementation that rejects with stdb_down', async () => {
    const s = await connectStdb({ FC_STDB_URI: 'ws://127.0.0.1:1', FC_STDB_DB: 'x', FC_STDB_TOKEN: undefined });
    expect(s.status()).toBe('down');
    expect(s.identity()).toBeNull();
    await expect(s.lockMatch({ matchId: 'm' })).rejects.toThrow('stdb_down');
  });
});
