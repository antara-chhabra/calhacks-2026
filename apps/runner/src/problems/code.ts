import { getQuickJS } from 'quickjs-emscripten';
import type { CodeEvaluation, Problem, ProblemIdx } from '@fc/contracts';
import { createRng } from './rng.js';

const QuickJS = await getQuickJS();
const POINTS = [10, 20, 30, 40, 50] as const;
const MAX_SOURCE = 10_000;
const MAX_JSON = 10_000;
const MEMORY_LIMIT = 8 * 1024 * 1024;
const STACK_LIMIT = 512 * 1024;
const TEST_TIMEOUT_MS = 100;
const FINAL_PASS_RATE = 0.95;

type TestCase = CodeEvaluation['tests'][number];
type CodeSpec = { family: string; prompt: string; reference: string; tests: TestCase[] };

function json(input: unknown): string { return JSON.stringify(input); }

function buildSpecs(seed: string): CodeSpec[] {
  const rng = createRng(seed);
  const a = [rng.int(1, 20), rng.int(1, 20), rng.int(1, 20)];
  const b = [rng.int(1, 20), rng.int(1, 20)];
  const bucketXs = Array.from({ length: 4 }, () => rng.int(-8, 12));
  const uniqueXs = Array.from({ length: 7 }, () => rng.int(0, 5));
  const topXs = Array.from({ length: 8 }, () => rng.int(-20, 30));

  const sumInputs = [a, [], [0, -3, 8], [1], [5, 7, 9], [-2, -4], [100, 250, -10], b, [rng.int(-9, 9), rng.int(-9, 9), rng.int(-9, 9)], [3, 3, 3], [12, -12, 0], [1, 2, 3, 4, 5]];
  const wordInputs = ['', '   ', 'one', 'one two', '  one   two\nthree ', 'en garde arena', 'a\tb\nc', ' spaced  words ', 'four tiny words here', 'x'.repeat(20), 'red blue green gold', ' leading and trailing '];
  const groupInputs = [
    bucketXs.map((value, i) => ({ category: ['red', 'blue', 'red', 'gold'][i]!, value })), [],
    [{ category: 'blue', value: -3 }, { category: 'red', value: 8 }, { category: 'blue', value: 5 }],
    [{ category: 'gold', value: 0 }], [{ category: 'red', value: 1 }, { category: 'red', value: 2 }],
    [{ category: 'blue', value: 7 }, { category: 'gold', value: -2 }],
    [{ category: 'green', value: 4 }, { category: 'blue', value: 4 }, { category: 'green', value: -1 }],
    [{ category: 'red', value: 12 }, { category: 'gold', value: 3 }, { category: 'blue', value: 9 }],
    [{ category: 'gold', value: -5 }, { category: 'gold', value: 5 }],
    [{ category: 'green', value: 10 }, { category: 'red', value: -10 }],
    [{ category: 'blue', value: 1 }, { category: 'blue', value: 1 }, { category: 'blue', value: 1 }],
    [{ category: 'red', value: 0 }, { category: 'green', value: 0 }, { category: 'gold', value: 0 }],
  ];
  const uniqueInputs = [uniqueXs, [], [1, 1, 2, 1, 3, 2], ['a', 'b', 'a', 'c'], [0, false, 0, false], [9], [5, 4, 5, 4, 3], ['x', 'x', 'x'], [-1, -1, 0, 1, 0], ['red', 'blue', 'red'], [3, 2, 1], [null, null, 1]];
  const topInputs = [
    { values: topXs, k: rng.int(1, 6) }, { values: [], k: 3 }, { values: [1, 9, 4, 7], k: 2 },
    { values: [5, 5, 5, 1], k: 3 }, { values: [-2, -9, -1], k: 2 }, { values: [8], k: 1 },
    { values: [2, 1, 3], k: 0 }, { values: [4, 7, 2, 9], k: 8 }, { values: [0, -1, 0, 5], k: 3 },
    { values: [6, 6, 2, 6, 1], k: 2 }, { values: [3, -3, 12, 0], k: 4 }, { values: [10, 2], k: 1 },
  ];
  const expected = (xs: number[]) => xs.reduce((sum, value) => sum + value, 0);
  const groupExpected = (items: { category: string; value: number }[]) => {
    const result: Record<string, number> = {};
    for (const item of items) result[item.category] = (result[item.category] ?? 0) + item.value;
    return result;
  };
  const uniqueExpected = (xs: unknown[]) => [...new Set(xs)];
  const topExpected = ({ values, k }: { values: number[]; k: number }) => [...values].sort((x, y) => y - x).slice(0, Math.max(0, k));
  const cases = <T>(inputs: T[], solve: (input: T) => unknown): TestCase[] => inputs.map((input) => ({ inputJson: json(input), outputJson: json(solve(input)) }));

  return [
    { family: 'code_array_sum', prompt: 'Write a pure JavaScript function expression that receives an object with a `values` array of finite numbers and returns their sum. An empty array returns 0. Example: {"values":[2,-1,4]} → 5.', reference: '(input) => input.values.reduce((sum, value) => sum + value, 0)', tests: cases(sumInputs.map((values) => ({ values })), (input) => expected(input.values)) },
    { family: 'code_word_count', prompt: 'Write a pure JavaScript function expression that receives `{text}` and returns the number of whitespace-delimited words. Empty or whitespace-only text returns 0. Example: {"text":" red  blue\\ngold "} → 3.', reference: '(input) => input.text.trim().split(/\\s+/).filter(Boolean).length', tests: cases(wordInputs.map((text) => ({ text })), (input) => input.text.trim().split(/\s+/).filter(Boolean).length) },
    { family: 'code_group_sums', prompt: 'Write a pure JavaScript function expression that receives `{items:[{category,value}]}` and returns an object mapping each category to the sum of its values. Omit categories with no items; return `{}` for an empty array. Example: {"items":[{"category":"red","value":2},{"category":"blue","value":4},{"category":"red","value":3}]} → {"red":5,"blue":4}.', reference: '(input) => input.items.reduce((totals, item) => { totals[item.category] = (totals[item.category] ?? 0) + item.value; return totals; }, {})', tests: cases(groupInputs.map((items) => ({ items })), (input) => groupExpected(input.items)) },
    { family: 'code_stable_unique', prompt: 'Write a pure JavaScript function expression that receives `{values}` and returns a new array with duplicate values removed, preserving the first occurrence order. Compare primitive values by JavaScript Set equality. Example: {"values":[3,1,3,2,1]} → [3,1,2].', reference: '(input) => [...new Set(input.values)]', tests: cases(uniqueInputs.map((values) => ({ values })), (input) => uniqueExpected(input.values)) },
    { family: 'code_top_k', prompt: 'Write a pure JavaScript function expression that receives `{values,k}` and returns up to k largest numbers in descending order. If k is zero or negative return []; if k exceeds the array length return every value. Preserve repeated values. Example: {"values":[4,9,1,7],"k":2} → [9,7].', reference: '(input) => input.values.slice().sort((a, b) => b - a).slice(0, Math.max(0, input.k))', tests: cases(topInputs, topExpected) },
  ];
}

/** Build five seeded Code Duel tasks with private deterministic cases and a pure-function reference. */
export function generateCodeProblems(seed: string): Problem[] {
  const specs = buildSpecs(seed);
  return specs.map((spec, i) => {
    const difficulty = (i + 1) as 1 | 2 | 3 | 4 | 5;
    const evaluation: CodeEvaluation = { kind: 'code', format: 'javascript', prompt: spec.prompt, tests: spec.tests, liveTests: 3 };
    return {
      idx: difficulty as ProblemIdx, difficulty, points: POINTS[i]!, family: spec.family,
      statementTex: spec.prompt.slice(0, 500), integrand: '0', liveDomain: [0, 1], finalDomains: [[0, 1]],
      reference: spec.reference, trap: false, evaluation,
    };
  });
}

function canonical(value: unknown, depth = 0): string {
  if (depth > 24) throw new Error('JSON nesting too deep');
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item, depth + 1)).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key], depth + 1)}`).join(',')}}`;
}

function runOne(source: string, test: TestCase): string | null {
  const started = performance.now();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT);
  runtime.setMaxStackSize(STACK_LIMIT);
  runtime.setInterruptHandler(() => performance.now() - started >= TEST_TIMEOUT_MS);
  let context: ReturnType<typeof runtime.newContext> | null = null;
  try {
    context = runtime.newContext();
    const input = context.newString(test.inputJson);
    context.setProp(context.global, '__inputJson', input);
    input.dispose();
    const setup = context.evalCode('Object.defineProperty(globalThis, "Date", { value: undefined, writable: false, configurable: false }); Object.defineProperty(Math, "random", { value: () => { throw new Error("randomness disabled"); }, writable: false, configurable: false }); const stringify = JSON.stringify, ownKeys = Object.keys, isArray = Array.isArray, getProto = Object.getPrototypeOf, create = Object.create, setProto = Object.setPrototypeOf, finite = Number.isFinite, objectProto = Object.prototype; const serialize = (value) => { const ancestors = []; const normalize = (item, depth) => { if (depth > 24) throw new TypeError("result nesting too deep"); if (item === null || typeof item === "string" || typeof item === "boolean") return item; if (typeof item === "number") { if (!finite(item)) throw new TypeError("result is not finite JSON"); return item; } if (typeof item !== "object") throw new TypeError("result is not JSON"); for (let i = 0; i < ancestors.length; i++) if (ancestors[i] === item) throw new TypeError("cyclic result"); ancestors[ancestors.length] = item; let copy; if (isArray(item)) { copy = []; setProto(copy, null); for (let i = 0; i < item.length; i++) copy[i] = normalize(item[i], depth + 1); } else { const proto = getProto(item); if (proto !== objectProto && proto !== null) throw new TypeError("result object must be plain"); copy = create(null); const keys = ownKeys(item); for (let i = 0; i < keys.length; i++) copy[keys[i]] = normalize(item[keys[i]], depth + 1); } ancestors.length--; return copy; }; return stringify(normalize(value, 0)); }; Object.defineProperty(globalThis, "__serialize", { value: serialize, writable: false, configurable: false }); globalThis.__input = JSON.parse(__inputJson);');
    if (setup.error) { setup.error.dispose(); return null; }
    setup.value.dispose();
    const candidateResult = context.evalCode(`(${source})`);
    if (candidateResult.error) { candidateResult.error.dispose(); return null; }
    const candidate = candidateResult.value;
    try {
      context.setProp(context.global, '__candidate', candidate);
    } catch { candidate.dispose(); return null; }
    candidate.dispose();
    const execution = context.evalCode('(() => { if (typeof __candidate !== "function" || __candidate.constructor.name !== "Function") throw new TypeError("expected a synchronous function"); const output = __candidate(__input); if (output != null && typeof output.then === "function") throw new TypeError("async output is not supported"); return __serialize(output); })()');
    if (execution.error) { execution.error.dispose(); return null; }
    const output: unknown = context.dump(execution.value);
    execution.value.dispose();
    if (typeof output !== 'string' || output.length > MAX_JSON) return null;
    return output;
  } catch {
    return null;
  } finally {
    try { context?.dispose(); } finally { runtime.dispose(); }
  }
}

/** Run one candidate against the live subset or full final suite in a fresh, resource-limited QuickJS VM per case. */
export function checkCode(p: Problem, answer: string, final: boolean): { ok: boolean; reason?: 'mismatch' | 'invalid_syntax'; passRate: number } {
  const evaluation = p.evaluation;
  if (!evaluation || evaluation.kind !== 'code' || !Array.isArray(evaluation.tests) || evaluation.tests.length === 0 || typeof answer !== 'string' || answer.length === 0 || answer.length > MAX_SOURCE) {
    return { ok: false, reason: 'invalid_syntax', passRate: 0 };
  }
  let cases: TestCase[];
  try {
    cases = final ? evaluation.tests : evaluation.tests.slice(0, Math.max(1, Math.min(evaluation.liveTests, evaluation.tests.length)));
    for (const test of cases) {
      if (test.inputJson.length > MAX_JSON || test.outputJson.length > MAX_JSON) return { ok: false, reason: 'invalid_syntax', passRate: 0 };
      JSON.parse(test.inputJson); JSON.parse(test.outputJson);
    }
  } catch { return { ok: false, reason: 'invalid_syntax', passRate: 0 }; }

  let passed = 0;
  for (const test of cases) {
    const output = runOne(answer, test);
    if (output === null) continue;
    try { if (canonical(JSON.parse(output)) === canonical(JSON.parse(test.outputJson))) passed++; } catch { /* not valid JSON output */ }
  }
  const passRate = passed / cases.length;
  const ok = final ? passRate >= FINAL_PASS_RATE : passed === cases.length;
  return { ok, reason: ok ? undefined : 'mismatch', passRate };
}
