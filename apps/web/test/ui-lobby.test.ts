import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stopReplay, useStore } from '../src/data/store';
import {
  countdown, isValidHandle, needsDemo, registerErrorText, selectFeed, selectLive, selectMe, selectPoster, selectResults, shortHash, suggestHandle,
} from '../src/ui/lobby/selectors';
import { loadFixture } from '../src/data/replay';

const flush = async () => { await vi.advanceTimersByTimeAsync(0); await Promise.resolve(); };
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { stopReplay(); vi.useRealTimers(); });

describe('lobby selectors on mock-basic', () => {
  it('needs demo data only when offline and empty', () => {
    expect(needsDemo({ conn: 'offline', matches: {} })).toBe(true);
    expect(needsDemo({ conn: 'live', matches: {} })).toBe(false);
  });

  it('poster has 4 fighters with x.xx odds and a short commit', async () => {
    await loadFixture('mock-basic');
    useStore.getState().openReplay('mock-basic', 1);
    await flush();
    await vi.advanceTimersByTimeAsync(2000);
    const p = selectPoster(useStore.getState())!;
    expect(p.badge).toBe('MOCK');
    expect(p.fighters).toHaveLength(4);
    for (const f of p.fighters) { expect(f.oddsText).toMatch(/^\d+\.\d{2}$/); expect(f.impliedPct).toBeGreaterThan(0); expect(f.color).toMatch(/^#/); }
    expect(p.href).toBe(`/match/${p.matchId}`);
    expect(p.commitShort.length).toBeLessThanOrEqual(11);
  });

  it('settled match yields a result and bet feed uses cents formatting', async () => {
    const fx = await loadFixture('mock-basic');
    useStore.getState().openReplay('mock-basic', 1);
    await flush();
    expect(selectLive(useStore.getState())).toBeNull();
    await vi.advanceTimersByTimeAsync(fx.events[fx.events.length - 1]!.t + 1000);
    const s = useStore.getState();
    const r = selectResults(s);
    expect(r).toHaveLength(1);
    expect(r[0]!.winner?.name).toBeTruthy();
    const feed = selectFeed(s);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0]!.stakeText).toMatch(/^\$\d/);
  });

  it('me, handle and countdown helpers', () => {
    expect(selectMe(useStore.getState())).toMatchObject({ signedIn: false, balanceText: '$0.00', moneyModeText: 'Ledger mode · no funds moved' });
    expect(isValidHandle(suggestHandle())).toBe(true);
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('has space')).toBe(false);
    expect(registerErrorText(new Error('not_connected'))).toBe('Connect to a live match to play');
    expect(countdown(65_000, 0)).toBe('1:05');
    expect(countdown(1000, 5000)).toBe('Closed');
    expect(shortHash('abcdef0123456789abcdef')).toBe('abcdef…cdef');
  });
});
