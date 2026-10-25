// Pure settlement math (PRD §8.8, §11.8, FC-F-107; ADR-019). No DB access: reducers feed rows in, apply the plan out.
import { settleMarket, type PoolState } from '../vendor/parimutuel.js';

export type SettleBetIn = { id: bigint; bettor: string; outcome: string; stake: bigint };
export type SettleMarketIn = {
  marketId: string;
  rakeBps: number;
  pools: { outcome: string; staked: bigint; seed: bigint }[];
  bets: SettleBetIn[];            // that market's open bets only
  result: string;
};
export type BetOutcome = { id: bigint; bettor: string; status: 'won' | 'lost'; payout: bigint };
export type MarketPlan = {
  marketId: string; result: string; bets: BetOutcome[];
  rake: bigint; seedReturn: bigint; dust: bigint; treasury: bigint; paid: bigint; total: bigint;
};

/** Settle one market with the engine's settleMarket, verbatim. A bet is "won" iff it backed the result. */
export function planMarket(m: SettleMarketIn): MarketPlan {
  const pools: PoolState = m.pools.map((p) => ({ outcome: p.outcome, staked: Number(p.staked), seed: Number(p.seed) }));
  const r = settleMarket(pools, m.bets.map((b) => ({ id: String(b.id), outcome: b.outcome, stake: Number(b.stake) })), m.result, m.rakeBps);
  let total = 0;
  for (const p of pools) total += p.staked + p.seed;
  let paid = 0;
  const bets: BetOutcome[] = m.bets.map((b) => {
    const payout = r.payouts[String(b.id)] ?? 0;
    paid += payout;
    return { id: b.id, bettor: b.bettor, status: b.outcome === m.result ? 'won' : 'lost', payout: BigInt(payout) };
  });
  return {
    marketId: m.marketId, result: m.result, bets,
    rake: BigInt(r.rake), seedReturn: BigInt(r.seedReturn), dust: BigInt(r.dust),
    treasury: BigInt(r.rake + r.seedReturn + r.dust), paid: BigInt(paid), total: BigInt(total),
  };
}

/** Sum of bettor credits across plans, keyed by identity string (one ledger row per bettor per match). */
export function creditsByBettor(plans: MarketPlan[]): Map<string, bigint> {
  const out = new Map<string, bigint>();
  for (const p of plans) for (const b of p.bets) if (b.payout > 0n) out.set(b.bettor, (out.get(b.bettor) ?? 0n) + b.payout);
  return out;
}

export function ovrFromElo(elo: number): number {
  return Math.min(99, Math.max(40, Math.round(60 + (elo - 1000) / 10)));
}

/** Provisional fighters become active at 5 matches (FC-F-107 / §8.8). */
export function nextFighterStatus(status: string, matches: number): string {
  return status === 'provisional' && matches >= 5 ? 'active' : status;
}
