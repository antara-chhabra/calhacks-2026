// Match state types (PRD §8.6). Functions live in reduce/cues/feed/status/target.ts.
import type { Category, FighterId, FightEvent, MatchMode, MatchStatus, ProblemIdx, ProblemMeta, ProblemSet, Slot, Standing } from '@fc/contracts';

export type FighterLive = {
  id: FighterId; slot: Slot; points: number; damagePct: number;              // damagePct is cosmetic (ADR-002)
  hits: number; misses: number; overturned: number; yellow: number; red: number;
  status: 'waiting' | 'thinking' | 'working' | 'done' | 'out' | 'winner' | 'ko';
  solved: Partial<Record<ProblemIdx, { atMs: number; target: FighterId; points: number; final: 'pending' | 'held' | 'overturned' }>>;
  attempts: Partial<Record<ProblemIdx, number>>;
  lastSay: { text: string; t: number } | null; rank: number | null;
};
export type FeedLine = { seq: number; t: number; kind: 'hit' | 'miss' | 'card' | 'var' | 'ko' | 'say' | 'system' | 'money'; text: string; fighterId?: FighterId };
export type MatchState = {
  matchId: string | null; status: MatchStatus; mode: MatchMode; isDemo: boolean; category: Category;
  commitHash: string | null; problems: ProblemMeta[]; timeLimitMs: number;
  order: FighterId[]; fighters: Record<FighterId, FighterLive>;
  startedT: number | null; t: number; lastSeq: number;
  feed: FeedLine[];                                     // newest last, capped at 120
  standings: Standing[] | null; reveal: { problemSet: ProblemSet; salt: string } | null;
  settled: Extract<FightEvent, { type: 'match.settled' }>['data'] | null;
  purses: { fighterId: FighterId; kind: 'entry' | 'paid'; amountUsdc: number; ref: string | null }[];
  voidReason: string | null;
};
