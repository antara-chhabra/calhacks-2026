import type { Family } from './types.js';
import { int } from './util.js';

export const trigTan: Family = {
  id: 'trig_tan', difficulty: 3, trap: true,
  make() {
    const L: [number, number] = [-1.2, 1.2];
    return {
      difficulty: 3, family: 'trig_tan',
      statementTex: int('\\tan x'), integrand: 'tan(x)',
      liveDomain: L, finalDomains: [L, [1.8, 2.9]],
      reference: '-log(abs(cos(x)))', trap: true,
    };
  },
};
