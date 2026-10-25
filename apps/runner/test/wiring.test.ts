import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../src/env.js';
import { createApp, type RunnerApp } from '../src/http/app.js';
import { wire, type Runtime } from '../src/wiring.js';
import { FakeStdb } from './fakes/fake-stdb.js';

const TOKEN = 'c'.repeat(32);
let app: RunnerApp | undefined;
let rt: Runtime | undefined;
afterEach(async () => { await rt?.shutdown(); await app?.stop(); rt?.stdb.close(); app = undefined; rt = undefined; });

async function boot(over: { mode?: 'live' | 'demo'; kill?: boolean; demoFail?: boolean; realDemoClock?: boolean; holdDemo?: boolean; stdbDown?: boolean; upsertError?: boolean } = {}) {
  const env = loadEnv({ FC_DIRECTOR_TOKEN: TOKEN, FC_ENGINE: 'mock', FC_MODE: over.mode, FC_KILL: over.kill ? '1' : undefined, FC_RUNNER_PORT: '0', FC_PUBLIC_PORT: '0', FC_SEASON_BET_WINDOW_S: '0.06', FC_MODEL_VEX: 'secret-model-xyz' });
  const stdb = new FakeStdb();
  const houseUpserts: Parameters<FakeStdb['upsertHouseFighter']>[0][] = [];
  if (over.stdbDown) stdb.status = () => 'down';
  stdb.upsertHouseFighter = async (args) => {
    if (over.upsertError) throw new Error('permission denied');
    houseUpserts.push(args);
  };
  if (over.demoFail) stdb.postEvents = async () => { throw new Error('demo write failed'); };
  let demoClock = 1_000_000;
  let demoOpen = false;
  let unblockDemo: (() => void) | undefined;
  rt = await wire(env, {
    stdb, mockTimeScale: 20, seasonGapMs: 50, log: () => {},
    ...(over.realDemoClock ? {} : { demoNow: () => demoClock, demoSleep: async (ms: number) => {
      demoClock += Math.max(1, ms);
      if (over.holdDemo && !demoOpen) await new Promise<void>((resolve) => { unblockDemo = resolve; });
    } }),
    matchOpts: { timeLimitMs: 4000, bettingWindowMs: 60, introMs: 20, toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 10, abortGraceMs: 300, lockGraceMs: 200 },
  });
  app = createApp(env, { publicHost: '127.0.0.1', director: rt.director });
  const ports = await app.start();
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${ports.adminPort}${path}`, {
      ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    });
  return { rt, call, houseUpserts, releaseDemo: () => { demoOpen = true; unblockDemo?.(); } };
}

describe('runner wiring (mock engine, fake stdb)', () => {
  it('registers all house fighters with only public data, strategy and tier before wire returns', async () => {
    const { rt, houseUpserts } = await boot();
    expect(houseUpserts).toHaveLength(6);
    expect(houseUpserts.map((x) => x.fighter.id).sort()).toEqual(['brick', 'glitch', 'pip', 'quill', 'sage', 'vex']);
    expect(houseUpserts[0]?.fighter).toHaveProperty('strategy');
    expect(houseUpserts[0]?.fighter).toHaveProperty('tier');
    expect(JSON.stringify(houseUpserts)).not.toMatch(/modelId|persona|FC_MODEL/);
    expect(rt.stdb.status()).toBe('ok');
  });

  it('skips house registration when SpacetimeDB is down', async () => {
    const { houseUpserts, rt } = await boot({ stdbDown: true });
    expect(houseUpserts).toHaveLength(0);
    expect(rt.stdb.status()).toBe('down');
  });

  it('fails wire startup and closes SpacetimeDB when house registration is rejected', async () => {
    const stdb = new FakeStdb();
    let closed = false;
    stdb.close = () => { closed = true; };
    stdb.upsertHouseFighter = async () => { throw new Error('permission denied'); };
    const env = loadEnv({ FC_DIRECTOR_TOKEN: TOKEN, FC_ENGINE: 'mock' });
    await expect(wire(env, { stdb, log: () => {} })).rejects.toThrow(/House fighter registration failed/);
    expect(closed).toBe(true);
  });

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

  it('validates the requested demo fixture before acquiring the shared match slot', async () => {
    const { call, rt } = await boot();
    const missing = await call('/admin/demo', { method: 'POST', body: '{"fixture":"golden-var"}' });
    expect(missing.status).toBe(404);
    expect((await missing.json() as { error: { code: string } }).error.code).toBe('fixture_unavailable');
    expect((await call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(201);
    expect(rt.director.currentMatch()?.id).toMatch(/^m_[a-f0-9]+$/);
  });

  it('uses one active slot in both directions for demos and live matches', async () => {
    const first = await boot({ holdDemo: true });
    const { call } = first;
    const demo = await call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' });
    expect(demo.status).toBe(204);
    expect((await call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(409);
    expect(first.rt.director.currentMatch()?.id).toMatch(/^m_demo_[a-f0-9]+$/);
    first.releaseDemo();

    await first.rt.shutdown(); first.rt.stdb.close();
    const next = await boot();
    expect((await next.call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(201);
    expect((await next.call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' })).status).toBe(409);
  }, 20000);

  it('routes ordinary starts through golden-var in demo mode and reports its absence', async () => {
    const { call, rt } = await boot({ mode: 'demo' });
    const response = await call('/admin/matches', { method: 'POST', body: '{}' });
    expect(response.status).toBe(404);
    expect((await response.json() as { error: { code: string } }).error.code).toBe('fixture_unavailable');
    expect((rt.stdb as FakeStdb).calls.some((c) => c.name === 'createMatch')).toBe(false);
  });

  it('kill switch blocks every new match path', async () => {
    const { call, rt } = await boot({ kill: true });
    expect((await call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(409);
    expect((await call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' })).status).toBe(409);
    expect((rt.stdb as FakeStdb).calls.some((c) => c.name === 'createMatch')).toBe(false);
  });

  it('does not add mock/demo matches to candidate history or real season counters', async () => {
    const { call, rt } = await boot();
    await call('/admin/matches', { method: 'POST', body: '{}' });
    const stdb = rt.stdb as FakeStdb;
    for (let i = 0; i < 400 && ![...stdb.matches.values()].some((m) => m.status === 'settled'); i++) await new Promise((r) => setTimeout(r, 25));
    expect((await rt.candidates.list()).every((c) => c.lastMatchAt === 0)).toBe(true);
    expect(rt.director.health().season.played).toBe(0);
    await call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' });
    for (let i = 0; i < 400 && rt.director.currentMatch(); i++) await new Promise((r) => setTimeout(r, 10));
    expect((await rt.candidates.list()).every((c) => c.lastMatchAt === 0)).toBe(true);
    expect(rt.director.health().season.played).toBe(0);
  }, 20000);

  it('releases the shared slot after a demo fails following creation', async () => {
    const { call, rt } = await boot({ demoFail: true });
    expect((await call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' })).status).toBe(204);
    for (let i = 0; i < 200 && rt.director.currentMatch(); i++) await new Promise((r) => setTimeout(r, 10));
    expect((await call('/admin/matches', { method: 'POST', body: '{}' })).status).toBe(201);
  }, 20000);

  it('shutdown aborts and awaits an active demo run', async () => {
    const { call, rt } = await boot({ realDemoClock: true });
    expect((await call('/admin/demo', { method: 'POST', body: '{"fixture":"mock-basic"}' })).status).toBe(204);
    await rt.shutdown();
    const matches = [...(rt.stdb as FakeStdb).matches.values()];
    expect(matches.length).toBe(1);
    expect(['settled', 'void']).toContain(matches[0]!.status);
  }, 20000);
});
