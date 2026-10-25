// Parimutuel pools (PRD §8.3, FC-F-105, FC-F-107, §11.8). K-04. Also vendored into the Spacetime module (ADR-019):
// keep this file free of imports so scripts/vendor-engine.mjs can copy it verbatim.
// All amounts are integer US cents.

export type PoolState = { outcome: string; staked: number; seed: number }[];

/** Decimal odds per outcome = net / (staked + seed), net = total − floor(total × rakeBps / 10 000). Unrounded; 0 when the outcome pool is 0 (shown "—"). */
export function decimalOdds(pools: PoolState, rakeBps: number): Record<string, number> {
  let total = 0;
  for (const p of pools) total += p.staked + p.seed;
  const net = total - Math.floor((total * rakeBps) / 10000);
  const out: Record<string, number> = {};
  for (const p of pools) {
    const w = p.staked + p.seed;
    out[p.outcome] = w > 0 ? net / w : 0;
  }
  return out;
}

/**
 * Settles one market. payouts has one entry per bet id (0 for losing bets).
 * Invariant: Σ payouts + seedReturn + dust + rake = total (Σ staked + Σ seeds).
 * When the winning pool is 0 (nobody backed, no seed) there is no winner: net goes to dust (treasury).
 */
export function settleMarket(pools: PoolState, bets: { id: string; outcome: string; stake: number }[], result: string, rakeBps: number):
  { payouts: Record<string, number>; rake: number; seedReturn: number; dust: number } {
  let total = 0;
  let w = 0;
  let seedResult = 0;
  for (const p of pools) {
    total += p.staked + p.seed;
    if (p.outcome === result) { w += p.staked + p.seed; seedResult += p.seed; }
  }
  const rake = Math.floor((total * rakeBps) / 10000);
  const net = total - rake;
  const payouts: Record<string, number> = {};
  let paid = 0;
  for (const b of bets) {
    const amt = b.outcome === result && w > 0 ? Math.floor((b.stake * net) / w) : 0;
    payouts[b.id] = amt;
    paid += amt;
  }
  const seedReturn = w > 0 ? Math.floor((seedResult * net) / w) : 0;
  const dust = net - paid - seedReturn;
  return { payouts, rake, seedReturn, dust };
}
