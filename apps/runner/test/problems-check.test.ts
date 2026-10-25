import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Problem } from '@fc/contracts';
import { checkLive, checkFinal } from '../src/problems/check.js';
import { parseAnswer } from '../src/problems/parse.js';

const fx = JSON.parse(readFileSync(fileURLToPath(new URL('../../../fixtures/matches/mock-basic.json', import.meta.url)), 'utf8'));
const problems: Problem[] = fx.problemSet.problems;
const trap = problems.find((p) => p.trap)!;

describe('references', () => {
  for (const p of problems) {
    it(`reference passes live+final (${p.family})`, () => {
      expect(checkLive(p, p.reference)).toEqual({ ok: true });
      expect(checkFinal(p, p.reference)).toEqual({ ok: true, passRate: 1 });
    });
    it(`reference + constant passes (${p.family})`, () => {
      for (const a of [`${p.reference} + 7`, `${p.reference} + C`, `(${p.reference}) - 3.5`, `${p.reference}+c`]) {
        expect(checkLive(p, a).ok).toBe(true);
        expect(checkFinal(p, a).ok).toBe(true);
      }
    });
    it(`wrong answer mismatches (${p.family})`, () => {
      const r = checkLive(p, `${p.reference} + x`);
      expect(r).toMatchObject({ ok: false, reason: 'mismatch' });
      expect(checkFinal(p, 'x^2').ok).toBe(false);
    });
  }
});

describe('trap', () => {
  it('missing abs passes live, fails final; abs survives', () => {
    const sloppy = '3*log(x+1)';
    expect(trap.reference).toContain('abs');
    expect(checkLive(trap, sloppy).ok).toBe(true);
    const f = checkFinal(trap, sloppy);
    expect(f.ok).toBe(false);
    expect(f.passRate).toBeLessThan(0.95);
    expect(checkFinal(trap, '3*ln(abs(x+1)) + C').ok).toBe(true);
  });
});

describe('syntax / injection', () => {
  const bad = [
    'import({a: 1})', 'evaluate("1+1")', '__proto__', 'f(x)=x', 'x=3', 'constructor', 'x.constructor', 'sin.constructor("1")',
    'parse("x")', 'simplify(x)', 'derivative(x^2,x)', 'createUnit("a")', '[1,2,3]', '{a:1}', '"abc"', 'x[1]', 'foo(x)', 'y', 'log(x, 2)',
    'sin(x,x)', 'x > 1 ? x : 2', '1;2', 'x!', '5 cm', 'i', '1e999', '', '   ', 'x'.repeat(401), '(('.repeat(60) + 'x' + '))'.repeat(60),
    '2+', 'log(', 'x==x', 'x mod 2', 'sin',
  ];
  for (const a of bad) {
    it(`rejects ${JSON.stringify(a.slice(0, 30))}`, () => {
      expect(checkLive(trap, a)).toMatchObject({ ok: false, reason: 'invalid_syntax' });
      expect(checkFinal(trap, a)).toEqual({ ok: false, passRate: 0 });
    });
  }
  it('accepts the grammar', () => {
    for (const a of ['2x', 'x**2', 'ln(x)', 'pi*x + e', '-x^2', 'sec(x)', 'sqrt(abs(x))', '3*x + C', 'atan(x)']) {
      expect('error' in parseAnswer(a)).toBe(false);
    }
  });
});

describe('timing (FC-N-007)', () => {
  it('live <= 50ms, final within budget', () => {
    const t = (fn: () => unknown) => { const s = performance.now(); fn(); return performance.now() - s; };
    let liveMax = 0, finalMax = 0;
    for (let i = 0; i < 3; i++) for (const p of problems) {
      liveMax = Math.max(liveMax, t(() => checkLive(p, p.reference)));
      finalMax = Math.max(finalMax, t(() => checkFinal(p, p.reference)));
    }
    console.log(`checkLive max ${liveMax.toFixed(1)}ms, checkFinal max ${finalMax.toFixed(1)}ms`);
    expect(liveMax).toBeLessThan(50);
    expect(finalMax).toBeLessThan(500);
  });
});
