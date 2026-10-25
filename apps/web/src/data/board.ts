// Derive the non-match store slices (fighters, matches, markets, bets) from a fixture + how far it has played.
import type { FighterId } from '@fc/contracts';
import { decimalOdds, type MatchState } from '@fc/engine';
import type { BetRow, FighterCardData, MarketView, MatchRow } from './store';
import type { MockBasicFixture } from './replay';

export function fixtureFighters(fx: MockBasicFixture): Record<FighterId, FighterCardData> {
  const out: Record<FighterId, FighterCardData> = {};
  for (const f of fx.fighters) {
    out[f.id] = { ...f, origin: 'house', creatorHandle: null, status: 'active', elo: 1000, stats: null, frame: 'bronze', walletAddress: null, version: 1 };
  }
  return out;
}

export function matchRow(fx: MockBasicFixture, s: MatchState): MatchRow {
  const created = fx.events.find((e) => e.type === 'match.created');
  const c = created && created.type === 'match.created' ? created.data : null;
  const winner = s.standings?.find((x) => x.rank === 1)?.fighterId ?? null;
  return {
    slots: c?.slots, category: c?.category ?? 'integrals', id: fx.matchId, number: fx.number, status: s.status, mode: c?.mode ?? 'mock', isDemo: c?.isDemo ?? false,
    fighterIds: c?.fighters ?? fx.fighters.map((f) => f.id), problems: c?.problems ?? [], commitHash: c?.commitHash ?? '',
    bettingClosesAt: c?.bettingClosesAt ?? 0, startedAt: s.startedT, timeLimitMs: c?.timeLimitMs ?? 0, winnerId: winner,
  };
}

/** Markets/bets as of `cursor` events applied: locked after betting.locked (real pools), settled after match.settled. */
export function marketsAndBets(fx: MockBasicFixture, cursor: number): { markets: Record<string, MarketView>; bets: BetRow[] } {
  const applied = fx.events.slice(0, cursor);
  let locked: Record<string, Record<string, number>> | null = null;
  let results: Map<string, string> | null = null;
  let voided = false;
  for (const e of applied) {
    if (e.type === 'betting.locked') locked = e.data.pools;
    else if (e.type === 'match.settled') results = new Map(e.data.results.map((r) => [r.marketId, r.outcome]));
    else if (e.type === 'match.void') voided = true;
  }
  const bettors = (marketId: string, o: string): number =>
    new Set(fx.bets.filter((b) => b.marketId === marketId && b.outcome === o).map((b) => b.handle)).size;
  const markets: Record<string, MarketView> = {};
  for (const m of fx.markets) {
    const pools: MarketView['pools'] = {};
    m.outcomes.forEach((o, i) => {
      // Pre-lock: stakes are the fixture bets so far (shown from the start); at lock, the authoritative pool snapshot.
      const staked = locked ? (locked[m.id]?.[o] ?? 0) : fx.bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0);
      pools[o] = { staked, seed: m.seeds[i] ?? 0, bettors: bettors(m.id, o) };
    });
    const status: MarketView['status'] = voided ? 'void' : results ? 'settled' : locked ? 'locked' : 'open';
    markets[m.id] = { ...m, status, result: results?.get(m.id) ?? null, pools,
      odds: decimalOdds(m.outcomes.map((o) => ({ outcome: o, staked: pools[o]!.staked, seed: pools[o]!.seed })), m.rakeBps) };
  }
  const bets: BetRow[] = fx.bets.map((b, i) => {
    const result = results?.get(b.marketId);
    const payout = results ? (fx.expected.payouts[b.marketId]?.payouts[b.id] ?? 0) : 0;
    const status: BetRow['status'] = voided ? 'refunded' : !results ? 'open' : result === b.outcome ? 'won' : 'lost';
    return { id: b.id, marketId: b.marketId, matchId: fx.matchId, handle: b.handle, outcome: b.outcome, stake: b.stake, status, payout,
      placedAt: i, mine: false };
  });
  return { markets, bets };
}
