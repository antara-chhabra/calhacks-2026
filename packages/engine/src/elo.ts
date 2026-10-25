// Multi-player Elo (PRD §8.3, §11.8, FC-F-180). K-04.
import type { FighterId } from '@fc/contracts';

/** Returns new (unrounded) ratings. N = rows.length; K = 32 while matches < 10 else 20; Rᵢ' = Rᵢ + K/(N−1) × Σⱼ(Sᵢⱼ − Eᵢⱼ). */
export function updateElo(rows: { fighterId: FighterId; elo: number; rank: number; matches: number }[]): Record<FighterId, number> {
  const n = rows.length;
  const out = {} as Record<FighterId, number>;
  for (const a of rows) {
    let sum = 0;
    for (const b of rows) {
      if (b === a) continue;
      const s = a.rank < b.rank ? 1 : a.rank === b.rank ? 0.5 : 0;
      const e = 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
      sum += s - e;
    }
    const k = a.matches < 10 ? 32 : 20;
    out[a.fighterId] = n > 1 ? a.elo + (k / (n - 1)) * sum : a.elo;
  }
  return out;
}
export function ovrFromElo(elo: number): number { return Math.min(99, Math.max(40, Math.round(60 + (elo - 1000) / 10))); }
