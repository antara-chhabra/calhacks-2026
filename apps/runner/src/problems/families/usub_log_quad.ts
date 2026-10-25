import type { Family } from './types.js';
import { int, poly } from './util.js';

export const usubLogQuad: Family = {
  id: 'usub_log_quad', difficulty: 2, trap: true,
  make(rng) {
    const r1 = rng.int(-4, 1), r2 = r1 + rng.int(2, 4);
    const p = -(r1 + r2), q = r1 * r2;
    const num = (tex: boolean) => poly([p, 2], tex);
    const den = (tex: boolean) => poly([q, p, 1], tex);
    const L: [number, number] = [r2 + 0.5, r2 + 3];
    return {
      difficulty: 2, family: 'usub_log_quad',
      statementTex: int(`\\frac{${num(true)}}{${den(true)}}`), integrand: `(${num(false)})/(${den(false)})`,
      liveDomain: L, finalDomains: [L, [r1 + 0.2, r2 - 0.2]],
      reference: `log(abs(${den(false)}))`, trap: true,
    };
  },
};
