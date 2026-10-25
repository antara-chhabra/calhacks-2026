import type { Family } from './types.js';
import { int, sqrtStr } from './util.js';

export const xOverX4: Family = {
  id: 'x_over_x4', difficulty: 5, trap: false,
  make(rng) {
    const c = rng.pick([1, 2, 3, 4, 5, 9, 16]);
    const s = sqrtStr(c);
    return {
      difficulty: 5, family: 'x_over_x4',
      statementTex: int(`\\frac{x}{x^{4} + ${c}}`), integrand: `x/(x^4 + ${c})`,
      liveDomain: [-2, 2], finalDomains: [[-4, 4]],
      reference: `atan(x^2/${s})/(2*${s})`.replace('/1)', ')').replace('/(2*1)', '/2'),
      trap: false,
    };
  },
};
