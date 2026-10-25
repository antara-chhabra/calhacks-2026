import { describe, expect, it } from 'vitest';
import { createSeasonLoop, type SeasonLoopDeps } from '../src/season/index.js';
import type { MatchSummary } from '../src/match/lifecycle.js';

const cand = (id: string) => ({ fighter: { id } }) as never;
const summary = (n: number): MatchSummary => ({
  matchId: `m${n}`, status: 'settled', mode: 'ranked' as never, isDemo: false,
  standings: [{}, {}] as never, results: [], elo: [], overturned: 0, endedBy: 'bell', invariantViolations: [],
});

function rig(over: Partial<SeasonLoopDeps> & { stopAfter?: number } = {}) {
  let t = 1_000_000;
  const calls: { bettingWindowMs: number }[] = [];
  let n = 0;
  const loop: ReturnType<typeof createSeasonLoop> = createSeasonLoop({
    runMatch: async (o) => { calls.push({ bettingWindowMs: o.bettingWindowMs }); n++; return summary(n); },
    candidates: () => [cand('a'), cand('b')],
    matchOpts: { timeLimitMs: 1000, introMs: 0 },
    now: () => t,
    sleep: async (ms) => { t += ms; await new Promise((r) => setImmediate(r)); if (over.stopAfter && n >= over.stopAfter) void loop.stop(); },
    log: () => {},
    ...over,
  });
  return { loop, calls, clock: { get: () => t, add: (ms: number) => { t += ms; } } };
}

describe('season loop', () => {
  it('runs N matches back to back with the betting window', async () => {
    const { loop, calls } = rig({ stopAfter: 3, betWindowS: 7 });
    loop.start(); await loop.idle();
    expect(calls).toHaveLength(3);
    expect(calls[0].bettingWindowMs).toBe(7000);
    expect(loop.status()).toMatchObject({ played: 3, pausedReason: null, season: 1 });
  });

  it('pauses at the session cap with a reason and resumes after the hour rolls', async () => {
    // cap 10, reserve 2, 2 sessions per match -> 4 matches fit (8 <= 8)
    const { loop, calls } = rig({ maxSessionsPerHour: 10, demoReserve: 2, gapMs: 1000, pollMs: 60_000 });
    loop.start();
    for (let i = 0; i < 50 && calls.length < 4; i++) await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(calls).toHaveLength(4);
    expect(loop.status().pausedReason).toMatch(/session cap/);
    expect(loop.status().nextMatchEta).not.toBeNull();
    expect(loop.reserveAvailable()).toBe(true);   // 2 left == reserve
    // the fake sleep jumps the clock to the oldest entry's expiry, so it resumes on its own
    for (let i = 0; i < 200 && calls.length < 5; i++) await new Promise((r) => setImmediate(r));
    expect(calls.length).toBeGreaterThan(4);
    await loop.stop();
  });

  it('pauses on the credit cap using creditsOf', async () => {
    const { loop, calls } = rig({ maxCreditsPerHour: 100, creditsOf: () => 60, gapMs: 0 });
    loop.start();
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.length).toBeLessThan(5);
    expect(loop.status().creditsHour).toBeGreaterThanOrEqual(100);
    await loop.stop();
  });

  it('kill switch blocks matches, then lets them run when cleared', async () => {
    let killed = true;
    const { loop, calls } = rig({ killed: () => killed });
    loop.start();
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
    expect(calls).toHaveLength(0);
    expect(loop.status().pausedReason).toMatch(/kill/i);
    killed = false;
    for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
    expect(calls.length).toBeGreaterThan(0);
    expect(loop.status().pausedReason).toBeNull();
    await loop.stop();
  });

  it('errors do not stop the loop', async () => {
    let n = 0;
    const { loop } = rig({
      runMatch: async () => { n++; if (n === 1) throw new Error('boom'); return summary(n); },
      stopAfter: 0,
    });
    loop.start();
    for (let i = 0; i < 30 && loop.status().played < 2; i++) await new Promise((r) => setImmediate(r));
    expect(loop.status().played).toBeGreaterThanOrEqual(2);
    await loop.stop();
  });

  it('never runs two matches at once and stop() halts cleanly', async () => {
    let active = 0, max = 0;
    const { loop } = rig({
      runMatch: async () => { active++; max = Math.max(max, active); await new Promise((r) => setImmediate(r)); active--; return summary(1); },
    });
    loop.start(); loop.start();
    for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
    await loop.stop();
    const p = loop.status().played;
    await new Promise((r) => setImmediate(r));
    expect(max).toBe(1);
    expect(loop.status()).toMatchObject({ on: false, played: p });
  });
});
