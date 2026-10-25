// Market seeding and resolution (PRD §8.3, §11.8, FC-F-102). K-04.
import type { FighterId, MarketSpec } from '@fc/contracts';
import type { MatchState } from './state.js';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function winProbabilities(_elos: Record<FighterId, number>): Record<FighterId, number> { return NI('winProbabilities'); }
export function seedSplit(_probs: number[], _total: number): number[] { return NI('seedSplit'); }
export function scoreLine(_history: number[]): number { return NI('scoreLine'); }
export function resolveMarkets(_state: MatchState, _markets: MarketSpec[]): { marketId: string; outcome: string }[] { return NI('resolveMarkets'); }
