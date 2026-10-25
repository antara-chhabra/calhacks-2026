// Parimutuel pools (PRD §8.3, FC-F-105, FC-F-107). K-04. Also vendored into the Spacetime module (ADR-019):
// keep this file free of imports so scripts/vendor-engine.mjs can copy it verbatim.

export type PoolState = { outcome: string; staked: number; seed: number }[];

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function decimalOdds(_pools: PoolState, _rakeBps: number): Record<string, number> { return NI('decimalOdds'); }
export function settleMarket(_pools: PoolState, _bets: { id: string; outcome: string; stake: number }[], _result: string, _rakeBps: number):
  { payouts: Record<string, number>; rake: number; seedReturn: number; dust: number } { return NI('settleMarket'); }
