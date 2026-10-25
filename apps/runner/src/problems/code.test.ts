import { describe, expect, it } from 'vitest';
import { generateCodeProblems, checkCode } from './code.js';

const seedA = '0123456789abcdef0123456789abcdef';
const seedB = 'fedcba9876543210fedcba9876543210';

describe('Code Duel problems', () => {
  it('generates five increasing, seeded problems with working reference functions', () => {
    for (const seed of [seedA, seedB]) {
      const problems = generateCodeProblems(seed);
      expect(problems.map((p) => p.difficulty)).toEqual([1, 2, 3, 4, 5]);
      expect(generateCodeProblems(seed)).toEqual(problems);
      for (const problem of problems) {
        const evaluation = problem.evaluation;
        expect(evaluation?.kind).toBe('code');
        if (!evaluation || evaluation.kind !== 'code') throw new Error('expected code evaluation');
        expect(evaluation.format).toBe('javascript');
        expect(evaluation.tests).toHaveLength(12);
        expect(checkCode(problem, problem.reference, true)).toMatchObject({ ok: true, passRate: 1 });
      }
    }
  }, 30_000);

  it('allows a candidate to pass live tests and fail the full review', () => {
    const [problem] = generateCodeProblems(seedA);
    const codeProblem = { ...problem!, evaluation: { ...problem!.evaluation!, tests: [
      { inputJson: '{"n":1}', outputJson: '1' }, { inputJson: '{"n":2}', outputJson: '2' },
      { inputJson: '{"n":3}', outputJson: '3' }, { inputJson: '{"n":99}', outputJson: '0' },
    ], liveTests: 3 } };
    const candidate = '(input) => input.n === 99 ? 42 : input.n';
    expect(checkCode(codeProblem, candidate, false)).toMatchObject({ ok: true, passRate: 1 });
    expect(checkCode(codeProblem, candidate, true)).toMatchObject({ ok: false, passRate: 0.75 });
  });

  it('rejects malformed, asynchronous, non-JSON, overlong, and oversized source answers', () => {
    const [problem] = generateCodeProblems(seedA);
    for (const candidate of [
      'not a function', 'async (input) => 1', '(input) => Promise.resolve(1)',
      '(input) => { const x = {}; x.self = x; return x; }', '(input) => NaN',
      '(input) => Infinity', '(input) => undefined', '(input) => ({ value: 1n })',
      '(input) => { process.exit(1); return 0; }', '(input) => require("fs")',
      '(input) => fetch("https://example.com")', '(input) => { while (true) {} }',
      '(input) => { let x = []; while (true) x.push(x); }',
    ]) expect(checkCode(problem!, candidate, false).ok).toBe(false);
    expect(checkCode(problem!, 'x'.repeat(10_001), false)).toMatchObject({ ok: false, reason: 'invalid_syntax' });
  }, 30_000);

  it('keeps VM prototype mutations inside the isolated runtime', () => {
    const problem = generateCodeProblems(seedA)[0]!;
    const candidate = '(input) => { Object.prototype.codeDuelPollution = true; return input.values.reduce((sum, value) => sum + value, 0); }';
    expect(checkCode(problem, candidate, false).ok).toBe(true);
    expect(({} as Record<string, unknown>).codeDuelPollution).toBeUndefined();
  });

  it('does not let candidate code replace the result serializer or smuggle values through toJSON', () => {
    const problem = generateCodeProblems(seedA)[0]!;
    expect(checkCode(problem, '(input) => { JSON.stringify = () => "0"; return 999; }', false).ok).toBe(false);
    expect(checkCode(problem, '(input) => { Object.prototype.toJSON = () => 0; return -999; }', false).ok).toBe(false);
  });

  it('rejects evaluator JSON nesting beyond the host canonicalizer limit safely', () => {
    const [problem] = generateCodeProblems(seedA);
    const evaluation = problem!.evaluation;
    if (!evaluation || evaluation.kind !== 'code') throw new Error('expected code evaluation');
    const deep = `${'['.repeat(30)}0${']'.repeat(30)}`;
    const malformedDepth = { ...problem!, evaluation: { ...evaluation, tests: [{ inputJson: '{}', outputJson: deep }], liveTests: 1 } };
    expect(checkCode(malformedDepth, '() => null', false).ok).toBe(false);
  });
});
