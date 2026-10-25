import type { Family } from './types.js';
import { int, ax, axTex } from './util.js';

export const expTrigCyclic: Family = {
  id: 'exp_trig_cyclic', difficulty: 4, trap: false,
  make(rng) {
    const a = rng.signed(1, 2), b = rng.int(1, 3);
    const e = `exp(${ax(a)})`;
    return {
      difficulty: 4, family: 'exp_trig_cyclic',
      statementTex: int(`e^{${axTex(a)}}\\sin(${axTex(b)})`), integrand: `${e}*sin(${ax(b)})`,
      liveDomain: [-1.5, 1.5], finalDomains: [[-2, 2]],
      reference: `${e}*(${a}*sin(${ax(b)}) - ${b}*cos(${ax(b)}))/${a * a + b * b}`,
      trap: false,
    };
  },
};
