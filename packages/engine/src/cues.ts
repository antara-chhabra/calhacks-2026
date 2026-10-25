// Arena cues (PRD §8.6). deriveCues implements the event → cue table (K-03).
import type { FighterId, FightEnvelope, ProblemIdx, Slot, ToolKind } from '@fc/contracts';
import type { MatchState } from './state.js';

export type Power = 'light' | 'heavy' | 'special';          // 10 → light · 20–30 → heavy · 40–50 → special
export type ArenaCue =
  | { kind: 'dropIn';   fighter: FighterId; slot: Slot; line: string | null }
  | { kind: 'countdown' }
  | { kind: 'think';    fighter: FighterId }
  | { kind: 'toolUse';  fighter: FighterId; tool: ToolKind }
  | { kind: 'say';      fighter: FighterId; text: string }
  | { kind: 'attack';   fighter: FighterId; target: FighterId; power: Power; problem: ProblemIdx; points: number; label: string }
  | { kind: 'whiff';    fighter: FighterId; target: FighterId; problem: ProblemIdx; label: string }
  | { kind: 'card';     fighter: FighterId; color: 'yellow' | 'red' }
  | { kind: 'potion';   fighter: FighterId }
  | { kind: 'done';     fighter: FighterId }
  | { kind: 'out';      fighter: FighterId; reason: string }
  | { kind: 'timeup' }
  | { kind: 'var';      fighter: FighterId; target: FighterId; problem: ProblemIdx; overturned: boolean; points: number }
  | { kind: 'ko';       fighter: FighterId; order: number; rank: number }
  | { kind: 'victory';  fighter: FighterId }
  | { kind: 'coin';     fighter: FighterId; amountUsdc: number }
  | { kind: 'void';     reason: string };

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function deriveCues(_prev: MatchState, _e: FightEnvelope): ArenaCue[] { return NI('deriveCues'); }
