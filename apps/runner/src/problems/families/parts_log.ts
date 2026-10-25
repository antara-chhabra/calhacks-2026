import type { Family } from './types.js';
import { int } from './util.js';

export const partsLog: Family = {
  id: 'parts_log', difficulty: 3, trap: false,
  make(rng) {
    const n = rng.int(1, 2);
    const xn = n === 1 ? 'x' : `x^${n}`;
    const xt = n === 1 ? 'x' : `x^{${n}}`;
    return {
      difficulty: 3, family: 'parts_log',
      statementTex: int(`${xt}\\ln x`), integrand: `${xn}*log(x)`,
      liveDomain: [0.3, 3], finalDomains: [[0.1, 5]],
      reference: `x^${n + 1}*log(x)/${n + 1} - x^${n + 1}/${(n + 1) ** 2}`,
      trap: false,
    };
  },
};
