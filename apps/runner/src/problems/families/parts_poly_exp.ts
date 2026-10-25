import type { Family } from './types.js';
import { int, ax, axTex } from './util.js';

export const partsPolyExp: Family = {
  id: 'parts_poly_exp', difficulty: 3, trap: false,
  make(rng) {
    const a = rng.signed(1, 3);
    const sq = rng.next() < 0.5;
    const e = `exp(${ax(a)})`;
    const eTex = `e^{${axTex(a)}}`;
    return {
      difficulty: 3, family: 'parts_poly_exp',
      statementTex: int(sq ? `x^{2}${eTex}` : `x\\,${eTex}`), integrand: sq ? `x^2*${e}` : `x*${e}`,
      liveDomain: [-1.5, 1.5], finalDomains: [[-2, 2]],
      reference: sq
        ? `${e}*(${a * a}*x^2 - ${2 * a}*x + 2)/${a ** 3}`.replace('- -', '+ ')
        : `${e}*(${a}*x - 1)/${a * a}`,
      trap: false,
    };
  },
};
