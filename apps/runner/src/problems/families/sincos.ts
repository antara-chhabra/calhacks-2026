import type { Family } from './types.js';
import { int, ax, axTex } from './util.js';

export const sincos: Family = {
  id: 'sincos', difficulty: 2, trap: false,
  make(rng) {
    const a = rng.int(1, 3);
    return {
      difficulty: 2, family: 'sincos',
      statementTex: int(`\\sin(${axTex(a)})\\cos(${axTex(a)})`), integrand: `sin(${ax(a)})*cos(${ax(a)})`,
      liveDomain: [-2, 2], finalDomains: [[-3, 3]],
      reference: `-cos(${2 * a}*x)/${4 * a}`, trap: false,
    };
  },
};
