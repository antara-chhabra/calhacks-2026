// Multi-player Elo (PRD §8.3, §11.9). K-04.
import type { FighterId } from '@fc/contracts';

const NI = (name: string): never => { throw new Error(`not implemented: ${name}`); };
export function updateElo(_rows: { fighterId: FighterId; elo: number; rank: number; matches: number }[]): Record<FighterId, number> { return NI('updateElo'); }
export function ovrFromElo(elo: number): number { return Math.min(99, Math.max(40, Math.round(60 + (elo - 1000) / 10))); }
