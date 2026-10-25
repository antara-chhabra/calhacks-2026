import { describe, expect, it } from 'vitest';
import { arenaMatch, marketTotals, ongoingFight } from '../src/ui/lobby/market-board';
import type { MarketView, MatchRow } from '../src/data/store';

const match = (id: string, status: MatchRow['status'], more: Partial<MatchRow> = {}): MatchRow => ({
  id, number: 1, status, mode: 'live', isDemo: false, fighterIds: [], problems: [], commitHash: '', bettingClosesAt: 0,
  startedAt: 1, timeLimitMs: 120000, winnerId: null, ...more,
});

describe('ongoing fight navigation', () => {
  it('ignores stale pointers and completed matches while retaining labelled broadcasts', () => {
    const active = match('ongoing', 'live', { number: 4 });
    const matches = Object.fromEntries([
      match('old', 'settled'), match('mock', 'live', { mode: 'mock', number: 8 }),
      match('demo', 'live', { isDemo: true, number: 9 }), active,
    ].map((m) => [m.id, m]));
    expect(ongoingFight({ matches, liveMatchId: 'old' })?.id).toBe('demo');
    expect(ongoingFight({ matches, liveMatchId: 'ongoing' })?.id).toBe(active.id);
    expect(ongoingFight({ matches, liveMatchId: 'mock' })?.mode).toBe('mock');
    expect(ongoingFight({ matches: { old: matches.old! }, liveMatchId: 'old' })).toBeNull();
  });
  it('uses the active pointer, otherwise the latest ongoing fight including VAR', () => {
    const matches = { a: match('a', 'live'), b: match('b', 'review', { startedAt: 2 }) };
    expect(ongoingFight({ matches, liveMatchId: 'a' })?.id).toBe('a');
    expect(ongoingFight({ matches, liveMatchId: null })?.id).toBe('b');
  });
});

it('separates real staked volume from seeded pool size', () => {
  const market = { pools: { yes: { staked: 300, seed: 500, bettors: 2 }, no: { staked: 700, seed: 500, bettors: 1 } } } as unknown as MarketView;
  expect(marketTotals(market)).toMatchObject({ volume: 1000, pool: 2000 });
});

it('selects a locked backend match and an explicitly opened replay with its original mode', () => {
  const locked = match('locked', 'locked', { isDemo: true });
  expect(ongoingFight({ matches: { locked }, liveMatchId: 'locked' })).toBe(locked);
  const replay = match('replay', 'settled', { mode: 'mock' });
  const snapshot = { matches: { replay }, liveMatchId: null, openMatchId: null, conn: 'replay' as const,
    watch: { mode: 'replay', matchId: 'replay', state: { matchId: 'replay' } } } as unknown as Parameters<typeof arenaMatch>[0];
  expect(arenaMatch(snapshot)).toBe(replay);
  expect(arenaMatch({ ...snapshot, watch: { ...snapshot.watch, matchId: null } })).toBeNull();
});

it('keeps watched results visible, switches to the next broadcast, and survives reconnect', () => {
  const completed = match('completed', 'settled');
  const next = match('next', 'live', { number: 2 });
  const snapshot = { matches: { completed }, liveMatchId: null, openMatchId: null, conn: 'live' as const,
    watch: { mode: 'live', matchId: 'completed', state: { matchId: 'completed' } } } as unknown as Parameters<typeof arenaMatch>[0];
  expect(arenaMatch(snapshot)?.id).toBe('completed');
  expect(arenaMatch({ ...snapshot, conn: 'offline' })?.id).toBe('completed');
  expect(arenaMatch({ ...snapshot, matches: { completed, next }, liveMatchId: 'next' })?.id).toBe('next');
});
