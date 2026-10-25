// Feed lines in the §10.4 voice (PRD §8.6 table). K-03.
import type { FightEnvelope } from '@fc/contracts';
import type { FeedLine, MatchState } from './state.js';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function feedLine(_prev: MatchState, _e: FightEnvelope): FeedLine | null { return NI('feedLine'); }
