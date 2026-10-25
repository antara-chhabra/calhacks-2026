import type { Family } from './types.js';
import { int, lin, poly, term } from './util.js';

export const partialFrac: Family = {
  id: 'partial_frac', difficulty: 4, trap: true,
  make(rng) {
    const r1 = rng.int(-3, 1), r2 = r1 + rng.int(2, 4);
    const A = rng.signed(1, 4), B = rng.signed(1, 4);
    const p = A + B, q = -(A * r2 + B * r1);
    const den = (tex: boolean) => (tex ? `(${lin(-r1)})(${lin(-r2)})` : `(${lin(-r1)})*(${lin(-r2)})`);
    const L: [number, number] = [r2 + 0.5, r2 + 3];
    const lg = (c: number, r: number) => term(`${c}`, `log(abs(${lin(-r)}))`);
    const parts = [lg(A, r1), lg(B, r2)];
    return {
      difficulty: 4, family: 'partial_frac',
      statementTex: int(`\\frac{${poly([q, p], true)}}{${den(true)}}`), integrand: `(${poly([q, p])})/(${den(false)})`,
      liveDomain: L, finalDomains: [L, [r1 + 0.2, r2 - 0.2], [r1 - 3, r1 - 0.5]],
      reference: parts[1]!.startsWith('-') ? `${parts[0]} - ${parts[1]!.slice(1)}` : `${parts[0]} + ${parts[1]}`,
      trap: true,
    };
  },
};
