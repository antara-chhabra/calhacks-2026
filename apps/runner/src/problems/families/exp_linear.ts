import type { Family } from './types.js';
import { int, frac, axTex, ax, term, cTex } from './util.js';

export const expLinear: Family = {
  id: 'exp_linear', difficulty: 1, trap: false,
  make(rng) {
    const a = rng.signed(1, 6), b = rng.signed(1, 3);
    return {
      difficulty: 1, family: 'exp_linear',
      statementTex: int(`${cTex(a)}e^{${axTex(b)}}`), integrand: term(`${a}`, `exp(${ax(b)})`),
      liveDomain: [-1.5, 1.5], finalDomains: [[-2, 2]],
      reference: term(frac(a, b), `exp(${ax(b)})`), trap: false,
    };
  },
};
