import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';
import { createApp, type RunnerApp } from '../src/http/app.js';
import { wire, type Runtime } from '../src/wiring.js';
import { FakeStdb } from './fakes/fake-stdb.js';

const TOKEN = 'c'.repeat(32);
let app: RunnerApp | undefined;
let rt: Runtime | undefined;
afterEach(async () => { await rt?.shutdown(); await app?.stop(); rt?.stdb.close(); app = undefined; rt = undefined; });

async function boot() {
  const env = loadEnv({ FC_DIRECTOR_TOKEN: TOKEN, FC_ENGINE: 'mock', FC_RUNNER_PORT: '0', FC_PUBLIC_PORT: '0', FC_SEASON_BET_WINDOW_S: '0.06', FC_MODEL_VEX: 'secret-model-xyz' });
  rt = await wire(env, {
    stdb: new FakeStdb(), mockTimeScale: 20, seasonGapMs: 50, log: () => {},
    matchOpts: { timeLimitMs: 4000, bettingWindowMs: 60, introMs: 20, toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 10, abortGraceMs: 300, lockGraceMs: 200 },
  });
  app = createApp(env, { publicHost: '127.0.0.1', director: rt.director });
  const ports = await app.start();
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${ports.adminPort}${path}`, {
      ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    });
  return { rt, call };
}

describe('runner wiring (mock engine, fake stdb)', () => {
  it('runs a full mock match to settled via the director', async () => {
    const { rt, call } = await boot();
    const stdb = rt.stdb as FakeStdb;
    const r = await call('/admin/matches', { method: 'POST', body: '{}' });
    expect(r.status).toBe(201);
    const { matchId } = await r.json() as { matchId: string };
    expect((await call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(409);
    for (let i = 0; i < 400 && stdb.statusOf(matchId) !== 'settled'; i++) await new Promise((r) => setTimeout(r, 25));
    expect(stdb.statusOf(matchId)).toBe('settled');
    expect(stdb.settles.length).toBe(1);
    await new Promise((r) => setTimeout(r, 50));
    expect(rt.director.currentMatch()).toBeNull();
    const log = (await (await call('/admin/log')).json() as { lines: string[] }).lines.join('\n');
    expect(log).not.toContain('secret-model-xyz');
  });

  it('health has the §8.10 shape and the season loop toggles via /admin/season', async () => {
    const { rt, call } = await boot();
    const h = await (await call('/admin/health')).json() as Record<string, unknown>;
    expect(h).toMatchObject({ ok: true, mode: 'live', engine: 'mock', stdb: 'ok', droid: 'mock', payments: 'off',
      season: { on: false, played: 0, creditsHour: 0, pausedReason: null } });
    expect((await call('/admin/season', { method: 'POST', body: '{"on":true}' })).status).toBe(204);
    expect(rt.season.status().on).toBe(true);
    expect((await (await call('/admin/health')).json() as { season: { on: boolean } }).season.on).toBe(true);
    expect((await call('/admin/season', { method: 'POST', body: '{"on":false}' })).status).toBe(204);
    await rt.season.idle();
    expect(rt.season.status().on).toBe(false);
  });

  it('season loop plays a match end to end and reports it in health', async () => {
    const { rt, call } = await boot();
    const stdb = rt.stdb as FakeStdb;
    await call('/admin/season', { method: 'POST', body: '{"on":true}' });
    for (let i = 0; i < 600 && rt.season.status().played < 1; i++) await new Promise((r) => setTimeout(r, 25));
    expect(rt.season.status().played).toBeGreaterThanOrEqual(1);
    expect([...stdb.matches.values()].some((m) => m.status === 'settled')).toBe(true);
    const h = await (await call('/admin/health')).json() as { season: { played: number } };
    expect(h.season.played).toBeGreaterThanOrEqual(1);
    await call('/admin/season', { method: 'POST', body: '{"on":false}' });
    await rt.season.idle();
  }, 20000);
});
