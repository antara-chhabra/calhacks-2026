// Pure match reducer (PRD §8.5.1, §8.6). K-03.
import type { FightEnvelope } from '@fc/contracts';
import type { MatchState } from './state.js';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function initialMatchState(): MatchState { return NI('initialMatchState'); }
export function reduceMatch(_s: MatchState, _e: FightEnvelope): MatchState { return NI('reduceMatch'); }
