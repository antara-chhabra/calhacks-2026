import type { Family } from './types.js';
import { int, ax, axTex } from './util.js';

export const logistic: Family = {
  id: 'logistic', difficulty: 5, trap: false,
  make(rng) {
    const a = rng.signed(1, 3);
    return {
      difficulty: 5, family: 'logistic',
      statementTex: int(`\\frac{1}{1 + e^{${axTex(a)}}}`), integrand: `1/(1 + exp(${ax(a)}))`,
      liveDomain: [-2, 2], finalDomains: [[-4, 4]],
      reference: a === 1 ? `x - log(1 + exp(x))` : `x - log(1 + exp(${ax(a)}))/${a}`,
      trap: false,
    };
  },
};
