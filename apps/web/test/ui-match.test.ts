import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyReveal } from '@fc/engine';
import { stopReplay, useStore } from '../src/data/store';
import { loadFixture } from '../src/data/replay';
import { checkFairness, clockText, FEED_STYLE, feedTone, matchSourceFor, mmss, plates, podium, problemGems, resultIsInstant, sourceFor, varOverturns } from '../src/ui/match/model';

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
  it('reveals results immediately for reduced motion, hidden arena and settled snapshots', () => {
    expect(resultIsInstant({ reducedMotion: true, hudOnly: false, initiallySettled: false })).toBe(true);
    expect(resultIsInstant({ reducedMotion: false, hudOnly: true, initiallySettled: false })).toBe(true);
    expect(resultIsInstant({ reducedMotion: false, hudOnly: false, initiallySettled: true })).toBe(true);
    expect(resultIsInstant({ reducedMotion: false, hudOnly: false, initiallySettled: false })).toBe(false);
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
});
