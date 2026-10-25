// Fight events (PRD §8.4). The zod schemas (fightEventSchema and per-type data schemas) live in schemas.ts.
import type { FighterId } from './roster.js';
import type { Category, MatchMode, ProblemIdx, ProblemMeta, ProblemSet, Slot, Standing } from './domain.js';

export type FightEnvelope<T extends FightEvent = FightEvent> = {
  v: 1; matchId: string;
  seq: number;          // assigned by the module, 1-based, gapless per match
  t: number;            // ms since match.created, assigned by the module from ctx.timestamp
} & T;

export type ToolKind = 'read' | 'write' | 'run' | 'other';

export type FightEvent =
  | { type: 'match.created';   data: { category: Category; mode: MatchMode; isDemo: boolean; fighters: FighterId[]; slots: Slot[];
                                       problems: ProblemMeta[]; commitHash: string; bettingClosesAt: number; timeLimitMs: number } }   // module-emitted
  | { type: 'betting.locked';  data: { pools: Record<string, Record<string, number>> } }                                              // module-emitted
  | { type: 'purse.entry';     data: { fighterId: FighterId; amountUsdc: number; txRef: string | null; coveredByHouse: boolean } }   // module-emitted (record_purse)
  | { type: 'match.intro';     data: { lines: Record<FighterId, string> } }
  | { type: 'match.started';   data: {} }                                                                                             // module-emitted
  | { type: 'fighter.thinking';data: { fighterId: FighterId } }
  | { type: 'fighter.tool';    data: { fighterId: FighterId; tool: ToolKind; label: string } }                                        // label ≤ 48
  | { type: 'fighter.say';     data: { fighterId: FighterId; text: string; source: 'model' | 'canned' } }                              // ≤ 80
  | { type: 'fighter.submit';  data: { fighterId: FighterId; problem: ProblemIdx; attempt: 1 | 2 | 3 } }
  | { type: 'verdict.live';    data: { fighterId: FighterId; problem: ProblemIdx; ok: boolean; points: number;                         // +points on ok, −5 on miss
                                       reason: 'hit' | 'mismatch' | 'invalid_syntax' | 'time_up' | 'attempts'; replaced: boolean } }
  | { type: 'referee.card';    data: { fighterId: FighterId; color: 'yellow' | 'red'; reason: string; penalty: number } }              // reason ≤ 60
  | { type: 'fighter.hint';    data: { fighterId: FighterId; problem: ProblemIdx; txRef: string | null } }                            // COULD
  | { type: 'fighter.done';    data: { fighterId: FighterId } }
  | { type: 'fighter.out';     data: { fighterId: FighterId; reason: 'red_card' | 'timeout' | 'crash' | 'budget' } }
  | { type: 'match.timeup';    data: {} }                                                                                             // module-emitted (begin_review)
  | { type: 'verdict.final';   data: { fighterId: FighterId; problem: ProblemIdx; overturned: boolean; points: number } }             // points removed (≤ 0)
  | { type: 'match.result';    data: { standings: Standing[] } }                                                                      // module-emitted (finalize_match)
  | { type: 'match.revealed';  data: { problemSet: ProblemSet; salt: string } }                                                       // module-emitted (reveal_match)
  | { type: 'match.settled';   data: { results: { marketId: string; outcome: string }[]; totalPaid: number;
                                       elo: Record<FighterId, [number, number]>; ovr: Record<FighterId, [number, number]> } }        // module-emitted
  | { type: 'purse.paid';      data: { fighterId: FighterId; amountUsdc: number; txHash: string; to: string } }                     // module-emitted (record_purse)
  | { type: 'match.void';      data: { reason: string } };                                                                            // module-emitted

export type FightEventType = FightEvent['type'];
export const RUNNER_POSTABLE: FightEventType[] = ['match.intro', 'fighter.thinking', 'fighter.tool', 'fighter.say',
  'fighter.submit', 'verdict.live', 'referee.card', 'fighter.hint', 'fighter.done', 'fighter.out', 'verdict.final'];
