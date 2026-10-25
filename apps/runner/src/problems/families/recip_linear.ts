import type { Family } from './types.js';
import { int, lin } from './util.js';

export const recipLinear: Family = {
  id: 'recip_linear', difficulty: 1, trap: true,
  make(rng) {
    const a = rng.signed(1, 6), b = rng.signed(1, 4);
    const L: [number, number] = [-b + 0.5, -b + 3];
    return {
      difficulty: 1, family: 'recip_linear',
      statementTex: int(`\\frac{${a}}{${lin(b)}}`), integrand: `${a}/(${lin(b)})`,
      liveDomain: L, finalDomains: [L, [-b - 3, -b - 0.5]],
      reference: `${a}*log(abs(${lin(b)}))`, trap: true,
    };
  },
};
