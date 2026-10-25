import type { Family } from './types.js';
import { int, ax, axTex } from './util.js';

export const partsXTrig: Family = {
  id: 'parts_x_trig', difficulty: 3, trap: false,
  make(rng) {
    const a = rng.int(1, 3);
    return {
      difficulty: 3, family: 'parts_x_trig',
      statementTex: int(`x\\sin(${axTex(a)})`), integrand: `x*sin(${ax(a)})`,
      liveDomain: [-2, 2], finalDomains: [[-3, 3]],
      reference: `sin(${ax(a)})/${a * a} - x*cos(${ax(a)})/${a}`.replace('/1 ', ' ').replace(/\/1$/, ''),
      trap: false,
    };
  },
};
