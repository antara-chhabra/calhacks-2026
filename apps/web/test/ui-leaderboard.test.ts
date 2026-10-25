import { describe, expect, it } from 'vitest';
import { HOUSE_FIGHTERS, HOUSE_ROSTER } from '@fc/contracts';
import type { FighterCardData, MatchRow } from '../src/data/store';
import { selectLeaderboard, selectProfile } from '../src/ui/leaderboard/selectors';

const mk = (i: number, over: Partial<FighterCardData> = {}): FighterCardData => {
  const id = HOUSE_FIGHTERS[i]!;
  return { ...HOUSE_ROSTER[id], origin: 'house', creatorHandle: null, status: 'active', elo: 1500 + i * 10, frame: 'silver', walletAddress: null, version: 1,
    stats: { fighterId: id, category: 'integrals', matches: 10, wins: 5 + i, podiums: 8, avgScorePct: 0.6, spd: 60, acc: 60, clu: 60, dis: 60, grt: 60, con: 60, ovr: 60 + i,
      form: 'WLWPL', streak: 1, upsetUntil: null, eloHistory: [1500 + i * 10], backersWon: 12345, earningsUsdc: 1.5 }, ...over } as FighterCardData;
};
const fighters = Object.fromEntries([0, 1, 2, 3].map((i) => [HOUSE_FIGHTERS[i]!, mk(i, i === 3 ? { origin: 'community', creatorHandle: 'zed' } : {})]));
const match = (id: string, number: number, status: MatchRow['status'], winnerId: string | null): MatchRow => ({ id, number, status, mode: 'standard', isDemo: false,
  fighterIds: [HOUSE_FIGHTERS[0]!, HOUSE_FIGHTERS[1]!], problems: [], commitHash: '', bettingClosesAt: 0, startedAt: null, timeLimitMs: 0, winnerId } as unknown as MatchRow);

describe('leaderboard selectors', () => {
  it('sorts by Elo descending with 1-based ranks', () => {
    const rows = selectLeaderboard({ fighters });
    expect(rows.map((r) => r.elo)).toEqual([1530, 1520, 1510, 1500]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    expect(rows[0]!.winPct).toBe('80%');
    expect(rows[0]!.backers).toBe('$123.45');
  });
  it('keeps every category enabled and gives unrated fighters a clean baseline', () => {
    expect(selectLeaderboard({ fighters }, 'integrals', 'community').map((r) => r.id)).toEqual([HOUSE_FIGHTERS[3]]);
    expect(selectLeaderboard({ fighters }, 'integrals', 'house')).toHaveLength(3);
    const code = selectLeaderboard({ fighters }, 'code');
    expect(code).toHaveLength(4);
    expect(code.every((r) => r.elo === 1000 && r.matches === 0 && r.ovr === null && r.backers === '–')).toBe(true);
  });
  it('uses category-specific stats and never borrows another category rating', () => {
    const id = HOUSE_FIGHTERS[0]!;
    const categoryStats = { code: { ...mk(0).stats!, category: 'code' as const, eloHistory: [1180], ovr: 72, matches: 3, wins: 2 } };
    const byCategory = { ...fighters, [id]: mk(0, { categoryStats }) };
    const rows = selectLeaderboard({ fighters: byCategory }, 'code');
    expect(rows.find((r) => r.id === id)).toMatchObject({ elo: 1180, ovr: 72, matches: 3, wins: 2 });
    expect(rows.find((r) => r.id === HOUSE_FIGHTERS[1])).toMatchObject({ elo: 1000, matches: 0, ovr: null });
  });
  it('profile lists history with links and the next open match', () => {
    const matches = { a: match('a', 1, 'settled', HOUSE_FIGHTERS[0]!), b: match('b', 2, 'open', null) };
    const vm = selectProfile({ fighters, matches, openMatchId: 'b' }, HOUSE_FIGHTERS[0]!)!;
    expect(vm.history).toHaveLength(1);
    expect(vm.history[0]).toMatchObject({ won: true, resultsHref: '/match/a/results', receiptHref: '/match/a/receipt' });
    expect(vm.next).toMatchObject({ href: '/match/b', isOpen: true });
    expect(selectProfile({ fighters, matches, openMatchId: null }, 'nope')).toBeNull();
  });
});
