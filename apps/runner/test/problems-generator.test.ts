import { randomBytes } from 'node:crypto';
import { all, create } from 'mathjs';
import { describe, expect, it } from 'vitest';
import { problemSetSchema } from '@fc/contracts';
import { generateProblemSet } from '../src/problems/generator.js';
import { FAMILIES } from '../src/problems/families/index.js';

// real-valued mathjs: invalid ops give NaN, not complex numbers
const math = create(all, { predictable: true });
const seeds = (n: number) => Array.from({ length: n }, () => randomBytes(16).toString('hex'));

function fn(expr: string): (x: number) => number {
  const code = math.compile(expr);
  return (x) => Number(code.evaluate({ x }));
}

describe('generateProblemSet', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const s = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    expect(generateProblemSet(s)).toEqual(generateProblemSet(s));
    const sigs = new Set(seeds(30).map((x) => JSON.stringify(generateProblemSet(x).problems)));
    expect(sigs.size).toBeGreaterThan(25);
    expect(generateProblemSet('0'.repeat(32))).not.toEqual(generateProblemSet('f'.repeat(32)));
  });

  it('rejects malformed seeds', () => {
    expect(() => generateProblemSet('nope')).toThrow();
  });

  it('200 random seeds give valid sets with a trap, and references are antiderivatives', () => {
    const seen = new Set<string>();
    let genMs = 0;
    for (const seed of seeds(200)) {
      const t0 = performance.now();
      const set = generateProblemSet(seed);
      genMs += performance.now() - t0;
      expect(problemSetSchema.parse(set)).toBeTruthy();
      expect(set.seed).toBe(seed);
      expect(set.problems.map((p) => p.idx)).toEqual([1, 2, 3, 4, 5]);
      expect(set.problems.map((p) => p.difficulty)).toEqual([1, 2, 3, 4, 5]);
      expect(set.problems.map((p) => p.points)).toEqual([10, 20, 30, 40, 50]);
      expect(set.problems.some((p) => p.trap)).toBe(true);
      for (const p of set.problems) {
        seen.add(p.family);
        const f = fn(p.integrand), F = fn(p.reference);
        const domains = [p.liveDomain, ...p.finalDomains];
        for (const [lo, hi] of domains) {
          expect(hi).toBeGreaterThan(lo);
          for (let i = 0; i < 24; i++) {
            const x = lo + ((hi - lo) * (i + 0.5)) / 24;
            const h = 1e-4;
            const d = (-F(x + 2 * h) + 8 * F(x + h) - 8 * F(x - h) + F(x - 2 * h)) / (12 * h);
            const fx = f(x);
            const msg = `${p.family} ${p.integrand} | ${p.reference} @ x=${x}`;
            expect(Number.isFinite(fx), msg).toBe(true);
            expect(Number.isFinite(F(x)), msg).toBe(true);
            expect(Math.abs(d - fx), msg).toBeLessThanOrEqual(1e-6 * (1 + Math.abs(fx)));
          }
        }
      }
    }
    // every family should appear across 200 sets
    expect([...seen].sort()).toEqual(FAMILIES.map((f) => f.id).sort());
    const per = genMs / 200;
    console.log(`FC-N-007: generateProblemSet ${per.toFixed(3)} ms/set avg over 200 sets`);
    expect(per).toBeLessThan(50);
  });
});
