import type { Family } from './types.js';
import { int } from './util.js';

export const secCubed: Family = {
  id: 'sec_cubed', difficulty: 5, trap: true,
  make() {
    const L: [number, number] = [-1, 1];
    return {
      difficulty: 5, family: 'sec_cubed',
      statementTex: int('\\sec^{3} x'), integrand: 'sec(x)^3',
      liveDomain: L, finalDomains: [L, [2.0, 2.8]],
      reference: '(sec(x)*tan(x) + log(abs(sec(x)+tan(x))))/2', trap: true,
    };
  },
};
