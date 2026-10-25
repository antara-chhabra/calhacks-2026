// Seeded problem-set generator (PRD §11.4, FC-F-020). Fully deterministic for a seed.
import type { Difficulty, Problem, ProblemIdx, ProblemSet } from '@fc/contracts';
import { createRng } from './rng.js';
import { familiesFor } from './families/index.js';
import type { Family } from './families/index.js';

const POINTS = { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 } as const;

export function generateProblemSet(seed: string): ProblemSet {
  const rng = createRng(seed);
  const draws: Family[] = ([1, 2, 3, 4, 5] as const).map((d) => rng.pick(familiesFor(d)));
  // Trap rule: if the draw has no trap family, swap the 1★ or 3★ draw for that tier's trap family.
  if (!draws.some((f) => f.trap)) {
    const tier = rng.next() < 0.5 ? 1 : 3;
    draws[tier - 1] = familiesFor(tier).find((f) => f.trap)!;
  }
  const problems: Problem[] = draws.map((fam, i) => {
    const d = (i + 1) as Difficulty;
    return { idx: d as ProblemIdx, points: POINTS[d], ...fam.make(rng) };
  });
  return { category: 'integrals', seed, problems };
}
