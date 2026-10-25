import type { Family } from './types.js';
import { int, frac, term, cTex } from './util.js';

export const usubGauss: Family = {
  id: 'usub_gauss', difficulty: 2, trap: false,
  make(rng) {
    const a = rng.signed(1, 4);
    const half = rng.next() < 0.5; // b = 1/2 or 1
    const expArg = half ? 'x^2/2' : 'x^2';
    const expTex = half ? 'e^{\\frac{x^{2}}{2}}' : 'e^{x^{2}}';
    return {
      difficulty: 2, family: 'usub_gauss',
      statementTex: int(`${cTex(a)}x\\,${expTex}`), integrand: term(`${a}`, `x*exp(${expArg})`),
      liveDomain: [-1.2, 1.2], finalDomains: [[-1.5, 1.5]],
      reference: term(half ? `${a}` : frac(a, 2), `exp(${expArg})`), trap: false,
    };
  },
};
