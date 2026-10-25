// Fighter stats and card frames (PRD §8.3, §11.9). K-04.
import type { CardFrame, EntryRow, FighterId, FighterStats } from '@fc/contracts';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function computeStats(_fighterId: FighterId, _entries: EntryRow[], _timeLimitMs: number, _prev: FighterStats | null): FighterStats { return NI('computeStats'); }
export function cardFrame(_stats: FighterStats, _provisional: boolean, _now: number): CardFrame { return NI('cardFrame'); }
