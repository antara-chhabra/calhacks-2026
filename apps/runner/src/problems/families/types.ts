import type { Problem } from '@fc/contracts';
import type { Rng } from '../rng.js';

export type MadeProblem = Omit<Problem, 'idx' | 'points'>;
export type Family = {
  id: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** true when the family carries a sloppy-answer trap (PRD §11.4) */
  trap: boolean;
  make(rng: Rng): MadeProblem;
};
