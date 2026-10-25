import type { Family } from './types.js';
import { int, poly, frac, term, sum } from './util.js';

export const polyFamily: Family = {
  id: 'poly', difficulty: 1, trap: false,
  make(rng) {
    const n = rng.int(2, 5);
    let m = rng.int(1, 3);
    if (m === n) m = 1;
    const a = rng.signed(1, 6), b = rng.signed(1, 6), c = rng.signed(1, 6);
    const cs: number[] = [c, 0, 0, 0, 0, 0];
    cs[n] = a; cs[m] = b;
    const body = poly(cs);
    return {
      difficulty: 1, family: 'poly',
      statementTex: int(poly(cs, true)), integrand: body,
      liveDomain: [-2, 2], finalDomains: [[-3, 3]],
      reference: sum([term(frac(a, n + 1), `x^${n + 1}`), term(frac(b, m + 1), `x^${m + 1}`), term(`${c}`, 'x')]),
      trap: false,
    };
  },
};
