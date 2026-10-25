import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyReveal } from '@fc/engine';
import { stopReplay, useStore } from '../src/data/store';
import { loadFixture } from '../src/data/replay';
import { checkFairness, clockText, FEED_STYLE, feedTone, matchSourceFor, mmss, plates, podium, problemGems, ResultsRevealGate, settledMarketsForMatch, sourceFor, varOverturns } from '../src/ui/match/model';

afterEach(() => { stopReplay(); vi.useRealTimers(); });

async function settledState() {
  vi.useFakeTimers();
  const fx = await loadFixture('mock-basic');
  useStore.getState().openReplay('mock-basic', 1);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(fx.events[fx.events.length - 1]!.t + 1000);
  return useStore.getState();
}

describe('match view models', () => {
  it('formats clocks', () => { expect(mmss(47_000)).toBe('0:47'); expect(mmss(-5)).toBe('0:00'); });
  it('styles every feed kind', () => {
    for (const k of Object.keys(FEED_STYLE)) expect(feedTone(k as keyof typeof FEED_STYLE)).toBeTruthy();
  });
  it('routes fixtures to replay unless live and known', () => {
    expect(sourceFor('mock-basic', 'offline', {})).toBe('replay');
    expect(sourceFor('m1', 'live', { m1: {} })).toBe('live');
    expect(sourceFor('mock-basic', 'live', {})).toBe('replay');
  });
  it('waits for live match hydration and only replays bundled fixtures', () => {
    expect(matchSourceFor({ target: 'db-match', conn: 'connecting', matches: {}, fixtures: ['mock-basic'] })).toBe('wait');
    expect(matchSourceFor({ target: 'db-match', conn: 'live', matches: { 'db-match': {} }, fixtures: ['mock-basic'] })).toBe('live');
    expect(matchSourceFor({ target: 'missing', conn: 'offline', matches: {}, fixtures: ['mock-basic'] })).toBe('none');
    expect(matchSourceFor({ target: 'mock-basic', conn: 'offline', matches: {}, fixtures: ['mock-basic'] })).toBe('replay');
  });
  it('waits for the matching podium after a live transition and resets for a new match', () => {
    const gate = new ResultsRevealGate();
    expect(gate.update({ matchId: 'm1', status: 'live', playbackRevision: 1, reducedMotion: false, hudOnly: false })).toBe(false);
    expect(gate.update({ matchId: 'm1', status: 'settled', playbackRevision: 1, reducedMotion: false, hudOnly: false })).toBe(false);
    expect(gate.podium('other')).toBe(false);
    expect(gate.podium('m1')).toBe(true);
    expect(gate.update({ matchId: 'm1', status: 'settled', playbackRevision: 1, reducedMotion: false, hudOnly: false })).toBe(true);
    expect(gate.update({ matchId: 'm2', status: 'live', playbackRevision: 3, reducedMotion: false, hudOnly: false })).toBe(false);
    expect(gate.update({ matchId: 'm2', status: 'settled', playbackRevision: 4, reducedMotion: false, hudOnly: false })).toBe(true);
  });
  it('reveals a settled snapshot, reduced-motion or hud-only result immediately and has a fallback', () => {
    const snapshot = new ResultsRevealGate();
    expect(snapshot.update({ matchId: 'm1', status: 'settled', playbackRevision: 4, reducedMotion: false, hudOnly: false })).toBe(true);
    for (const opts of [{ reducedMotion: true, hudOnly: false }, { reducedMotion: false, hudOnly: true }]) {
      const gate = new ResultsRevealGate();
      gate.update({ matchId: 'm2', status: 'live', playbackRevision: 1, ...opts });
      expect(gate.update({ matchId: 'm2', status: 'settled', playbackRevision: 1, ...opts })).toBe(true);
    }
    const fallback = new ResultsRevealGate();
    fallback.update({ matchId: 'm3', status: 'live', playbackRevision: 1, reducedMotion: false, hudOnly: false });
    expect(fallback.update({ matchId: 'm3', status: 'settled', playbackRevision: 1, reducedMotion: false, hudOnly: false })).toBe(false);
    expect(fallback.fallback()).toBe(true);
  });
  it('builds plates, podium, gems and verifies fairness from the settled fixture', async () => {
    const st = await settledState();
    const s = st.watch.state;
    expect(s.status).toBe('settled');
    const ps = plates(s, st.fighters);
    expect(ps).toHaveLength(4);
    expect(ps.every((p) => p.name.length > 0 && p.skin)).toBe(true);
    const pod = podium(s, st.fighters);
    expect(pod.map((p) => p.rank)).toEqual([1, 2, 3, 4]);
    expect(pod[0]!.pose).toBe('victory');
    expect(varOverturns(s)).toBeGreaterThanOrEqual(0);
    expect(problemGems(s)).toHaveLength(5);
    expect(clockText(s)).toBe('0:00');
    expect(s.reveal).not.toBeNull();
    expect(await verifyReveal(s.commitHash!, s.reveal!.problemSet, s.reveal!.salt)).toBe(true);
    expect(await checkFairness(s)).toBe('ok');
    expect(await checkFairness({ commitHash: '0'.repeat(64), reveal: s.reveal })).toBe('bad');
    expect(await checkFairness({ commitHash: null, reveal: null })).toBe('none');
  });
  it('keeps other matches and unsettled markets out of a result page on a global live board', async () => {
    const st = await settledState();
    const first = Object.values(st.markets)[0]!;
    const foreign = { ...first, id: `${st.watch.state.matchId}_other:winner`, label: 'Foreign result', status: 'settled' as const };
    const open = { ...first, id: `${st.watch.state.matchId}:pending`, status: 'open' as const };
    const board = { ...st.markets, [foreign.id]: foreign, [open.id]: open };
    const selected = settledMarketsForMatch(board, st.watch.state.matchId);
    expect(selected.map((m) => m.id)).toEqual(Object.values(st.markets).map((m) => m.id));
    expect(settledMarketsForMatch(board, null)).toEqual([]);
  });
});
