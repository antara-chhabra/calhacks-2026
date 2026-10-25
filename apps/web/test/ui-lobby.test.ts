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

    const id = Object.keys(s.matches)[0]!;
    const squadMatch = { ...s.matches[id]!, category: 'squads' as const, winnerId: 'vex', slots: [3, 0, 2, 1] as (0 | 1 | 2 | 3)[] };
    const squadSnapshot = {
      ...s,
      matches: { ...s.matches, [id]: squadMatch },
      markets: { ...s.markets, [`${id}:team_winner`]: { ...Object.values(s.markets)[0]!, id: `${id}:team_winner`, kind: 'team_winner' as const, result: 'team_a' } },
      bets: [{ ...s.bets[0]!, id: 'squad-bet', matchId: id, outcome: 'TEAM_A', placedAt: Number.MAX_SAFE_INTEGER }, ...s.bets.slice(1)],
    };
    expect(selectPoster(squadSnapshot, 'squads')?.fighters.map((f) => f.team)).toEqual(['B', 'A', 'B', 'A']);
    expect(selectFeed(squadSnapshot, 6, 'squads')[0]!.outcome).toBe('Team A');
    expect(selectResults(squadSnapshot, 5, 'squads')[0]!.winnerName).toBe('Team A');
  });

  it('shows lobby data only for the selected category', async () => {
    await loadFixture('mock-basic');
    useStore.getState().openReplay('mock-basic', 1);
    await flush();
    await vi.advanceTimersByTimeAsync(2000);
    const s = useStore.getState();
    expect(selectPoster(s, 'code')).toBeNull();
    expect(selectResults(s, 5, 'code')).toEqual([]);
    expect(selectFeed(s, 6, 'code')).toEqual([]);

    const id = Object.keys(s.matches)[0]!;
    const categorized = { ...s, matches: { ...s.matches, [id]: { ...s.matches[id]!, category: 'code' as const } } };
    expect(selectPoster(categorized, 'code')?.matchId).toBe(id);
    expect(selectPoster(categorized, 'integrals')).toBeNull();
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
