import { describe, expect, it } from 'vitest';
import { ovrFromElo, updateElo } from '../src/elo.js';

describe('updateElo', () => {
  it('equal ratings, ranks 1..4, all established (K=20): hand-computed', () => {
    // E = 0.5 vs everyone. Σ(S−E): rank1 = 3×0.5 = 1.5; rank2 = 0.5+(-0.5)+(-0.5)... = 1−.5, 0−.5, 0−.5 → wait S=(1,0,0)→ .5−1 = −... computed below
    // rank1: S=1,1,1 → 1.5 ; rank2: S=0,1,1 → 0.5 ; rank3: S=0,0,1 → −0.5 ; rank4: S=0,0,0 → −1.5
    // Δ = K/(N−1) × Σ = 20/3 × Σ
    const r = updateElo([1, 2, 3, 4].map((rank) => ({ fighterId: `f${rank}`, elo: 1000, rank, matches: 20 })));
    expect(r.f1).toBeCloseTo(1000 + 10, 9);
    expect(r.f2).toBeCloseTo(1000 + 20 / 3 * 0.5, 9);
    expect(r.f3).toBeCloseTo(1000 - 20 / 3 * 0.5, 9);
    expect(r.f4).toBeCloseTo(1000 - 10, 9);
  });
  it('is zero-sum when all K are equal', () => {
    const rows = [{ fighterId: 'a', elo: 1210, rank: 3, matches: 12 }, { fighterId: 'b', elo: 980, rank: 1, matches: 30 }, { fighterId: 'c', elo: 1105, rank: 2, matches: 15 }, { fighterId: 'd', elo: 840, rank: 4, matches: 10 }];
    const r = updateElo(rows);
    expect(rows.reduce((s, x) => s + r[x.fighterId] - x.elo, 0)).toBeCloseTo(0, 9);
  });
  it('uses K=32 while provisional (<10 matches) and K=20 otherwise', () => {
    const mk = (m: number) => updateElo([{ fighterId: 'a', elo: 1000, rank: 1, matches: m }, { fighterId: 'b', elo: 1000, rank: 2, matches: 99 }]);
    expect(mk(9).a - 1000).toBeCloseTo(32 * 0.5, 9);
    expect(mk(10).a - 1000).toBeCloseTo(20 * 0.5, 9);
  });
  it('ties share the expectation; upset pays more than a favourite win', () => {
    const tie = updateElo([{ fighterId: 'a', elo: 1000, rank: 1, matches: 20 }, { fighterId: 'b', elo: 1000, rank: 1, matches: 20 }]);
    expect(tie.a).toBeCloseTo(1000, 9);
    const fav = updateElo([{ fighterId: 'a', elo: 1200, rank: 1, matches: 20 }, { fighterId: 'b', elo: 1000, rank: 2, matches: 20 }]).a - 1200;
    const dog = updateElo([{ fighterId: 'a', elo: 1000, rank: 1, matches: 20 }, { fighterId: 'b', elo: 1200, rank: 2, matches: 20 }]).a - 1000;
    expect(dog).toBeGreaterThan(fav);
  });
});
describe('ovrFromElo', () => {
  it('clamps and rounds', () => { expect(ovrFromElo(1000)).toBe(60); expect(ovrFromElo(5000)).toBe(99); expect(ovrFromElo(0)).toBe(40); expect(ovrFromElo(1234)).toBe(83); });
});
