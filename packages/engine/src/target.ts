// Target rule (ADR-002, PRD §8.6). K-03.
import type { FighterId } from '@fc/contracts';
import type { MatchState } from './state.js';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function pickTarget(_s: MatchState, _attacker: FighterId): FighterId { return NI('pickTarget'); }
