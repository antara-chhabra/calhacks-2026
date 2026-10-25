import type { Family } from './types.js';
import { int, poly, sqrtStr } from './util.js';

export const arctanShift: Family = {
  id: 'arctan_shift', difficulty: 4, trap: false,
  make(rng) {
    const p = rng.int(-2, 2), s2 = rng.int(1, 6);
    const q = p * p + s2;
    const s = sqrtStr(s2);
    const den = (tex: boolean) => poly([q, 2 * p, 1], tex);
    const shift = p === 0 ? 'x' : p > 0 ? `x + ${p}` : `x - ${-p}`;
    return {
      difficulty: 4, family: 'arctan_shift',
      statementTex: int(`\\frac{1}{${den(true)}}`), integrand: `1/(${den(false)})`,
      liveDomain: [-2, 2], finalDomains: [[-4, 4]],
      reference: s === '1' ? `atan(${shift})` : `atan((${shift})/${s})/${s}`,
      trap: false,
    };
  },
};
