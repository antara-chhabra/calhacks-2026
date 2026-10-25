import type { Family } from './types.js';
import { int, r2 } from './util.js';

export const sqrtCircle: Family = {
  id: 'sqrt_circle', difficulty: 5, trap: false,
  make(rng) {
    const a = rng.int(1, 4);
    const a2 = a * a;
    return {
      difficulty: 5, family: 'sqrt_circle',
      statementTex: int(`\\sqrt{${a2} - x^{2}}`), integrand: `sqrt(${a2} - x^2)`,
      liveDomain: [r2(-0.8 * a), r2(0.8 * a)], finalDomains: [[r2(-0.95 * a), r2(0.95 * a)]],
      reference: `(x*sqrt(${a2} - x^2) + ${a2}*asin(x/${a}))/2`, trap: false,
    };
  },
};
