import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkInvariants } from '@fc/engine';
import { FakeStdb } from '../../test/fakes/fake-stdb.js';
import { loadDemoFixture, runDemoMatch, validateDemoFixture } from './demo.js';

afterEach(() => vi.useRealTimers());

describe('demo replay through lifecycle reducers', () => {
  it('uses fresh IDs, module lifecycle, DEMO flag, original timings and fresh settlement', async () => {
    const fx = await loadDemoFixture('mock-basic');
    const stdb = new FakeStdb();
    vi.useFakeTimers();
    const run = runDemoMatch({ stdb, sleep: async (ms) => { await vi.advanceTimersByTimeAsync(ms); } }, { fixture: fx, matchId: 'm_demo_test' });
    const result = await run;
    expect(result).toMatchObject({ matchId: 'm_demo_test', isDemo: true, status: 'settled', elo: [],
      usage: { sessions: 0, factoryCredits: 0 }, invariantViolations: [] });
    const match = stdb.matches.get(result.matchId)!;
    expect(match.args.isDemo).toBe(true);
    expect(match.args.bettingWindowMs).toBe(6000);
    expect(match.args.markets.every((m) => m.id.startsWith('m_demo_test:'))).toBe(true);
    expect(stdb.settles[0]).toMatchObject({ elo: [], stats: [] });
    expect(stdb.settles[0]!.results.every((r) => r.marketId.startsWith('m_demo_test:'))).toBe(true);
    const events = stdb.events(result.matchId);
    expect(checkInvariants(events)).toEqual({ ok: true, violations: [] });
    expect(events.find((e) => e.type === 'match.started')!.t).toBe(9000);
    expect(events.find((e) => e.type === 'match.settled')!.t).toBe(134400);
    expect(events.some((e) => e.type === 'purse.entry' || e.type === 'purse.paid')).toBe(false);
    expect(stdb.postBatches.every((b) => b.types.every((t) => !['match.started', 'match.result', 'match.settled'].includes(t)))).toBe(true);
    for (const b of stdb.postBatches) b.types.forEach((t, i) => {
      if (t === 'fighter.submit') expect(b.types[i + 1]).toBe('verdict.live');
    });
    stdb.close();
  });

  it('rejects absent golden fixtures and traversal instead of substituting mock data', async () => {
    await expect(loadDemoFixture('unavailable-demo-fixture')).rejects.toMatchObject({ code: 'fixture_unavailable' });
    await expect(loadDemoFixture('../mock-basic')).rejects.toMatchObject({ code: 'bad_fixture_name' });
  });

  it('validates reveal and timing before creating a match', async () => {
    const fx = await loadDemoFixture('mock-basic');
    const reveal = fx.events.find((e) => e.type === 'match.revealed')!;
    if (reveal.type === 'match.revealed') reveal.data.salt = 'changed';
    const stdb = new FakeStdb();
    await expect(runDemoMatch({ stdb }, { fixture: fx })).rejects.toThrow('commitment');
    expect(stdb.calls).toEqual([]);
    const outOfOrder = await loadDemoFixture('mock-basic');
    outOfOrder.events[1]!.t = 1_000_000;
    await expect(validateDemoFixture(outOfOrder)).rejects.toThrow('timing');
  });

  it('voids an interrupted replay for ledger refunds', async () => {
    const fx = await loadDemoFixture('mock-basic');
    const stdb = new FakeStdb(), ctl = new AbortController();
    vi.useFakeTimers();
    const result = runDemoMatch({ stdb, sleep: async (ms) => { await vi.advanceTimersByTimeAsync(ms); } }, { fixture: fx, matchId: 'm_demo_abort', signal: ctl.signal,
      onCreated: () => { ctl.abort(); } }).catch((e: unknown) => e);
    expect(await result).toMatchObject({ code: 'demo_aborted' });
    expect(stdb.statusOf('m_demo_abort')).toBe('void');
    expect(stdb.settles).toEqual([]);
    stdb.close();
  });

  it('voids reducer failures and never settles a partial replay', async () => {
    const fx = await loadDemoFixture('mock-basic');
    const stdb = new FakeStdb();
    stdb.postEvents = async () => { throw new Error('post_failed'); };
    vi.useFakeTimers();
    const result = runDemoMatch({ stdb, sleep: async (ms) => { await vi.advanceTimersByTimeAsync(ms); } }, { fixture: fx, matchId: 'm_demo_failed' }).catch((e: unknown) => e);
    expect(await result).toMatchObject({ message: 'post_failed' });
    expect(stdb.statusOf('m_demo_failed')).toBe('void');
    expect(stdb.settles).toEqual([]);
    stdb.close();
  });
});
