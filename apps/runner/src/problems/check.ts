// Live and final checks (PRD §11.4, FC-F-022, FC-F-023). The answer F is compared through its derivative
// F'(x) against the integrand f(x), so antiderivatives that differ by a constant ("+C") always agree.
import type { Problem, Interval } from '@fc/contracts';
import { math, parseAnswer, parseNode, toEvaluator } from './parse.js';
import type { MathNode } from 'mathjs';

const TOL_SYMBOLIC = 1e-6;
const TOL_NUMERIC = 1e-4;
const H = 1e-5;
const FINAL_POINTS = 48;
const FINAL_PASS_RATE = 0.95;

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = (p: Problem, salt: string) => mulberry32(hashSeed(`${salt}|${p.integrand}|${p.statementTex}`));

/** n stratified points (one jittered point per equal slice) over the union of intervals. */
function samplePoints(p: Problem, domains: Interval[], n: number, salt: string): number[] {
  const rnd = rngFor(p, salt);
  const total = domains.reduce((s, [a, b]) => s + (b - a), 0);
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    let t = ((i + 0.1 + 0.8 * rnd()) / n) * total;
    for (const [a, b] of domains) {
      const len = b - a;
      if (t <= len || (a === domains[domains.length - 1][0] && b === domains[domains.length - 1][1])) { pts.push(a + Math.min(t, len)); break; }
      t -= len;
    }
  }
  return pts;
}

type Deriv = (x: number) => { value: number; tol: number };

function buildDerivative(node: MathNode): Deriv {
  try {
    const d = math.derivative(node, 'x');
    const ev = toEvaluator(d);
    return (x) => ({ value: ev(x), tol: TOL_SYMBOLIC });
  } catch {
    const ev = toEvaluator(node);
    return (x) => ({ value: (ev(x + H) - ev(x - H)) / (2 * H), tol: TOL_NUMERIC });
  }
}

function integrandEval(p: Problem): (x: number) => number {
  const r = parseNode(p.integrand);
  if ('error' in r) throw new Error(`bad integrand: ${p.integrand}`);
  return toEvaluator(r.node);
}

/** Returns [considered, passed] over the points where f is finite. */
function run(p: Problem, node: MathNode, pts: number[]): { considered: number; passed: number } {
  const f = integrandEval(p);
  const dF = buildDerivative(node);
  const F = toEvaluator(node);
  let considered = 0, passed = 0;
  for (const x of pts) {
    const fx = f(x);
    if (!Number.isFinite(fx)) continue;
    considered++;
    // F itself must be real/finite at x: symbolic F' of log(x+1) looks fine for x<-1, but F is complex there.
    if (!Number.isFinite(F(x))) continue;
    const { value, tol } = dF(x);
    if (Number.isFinite(value) && Math.abs(value - fx) <= tol * Math.max(1, Math.abs(fx))) passed++;
  }
  return { considered, passed };
}

export function checkLive(p: Problem, answer: string): { ok: boolean; reason?: 'mismatch' | 'invalid_syntax'; detail?: string } {
  const r = parseAnswer(answer);
  if ('error' in r) return { ok: false, reason: 'invalid_syntax', detail: r.detail };
  const { considered, passed } = run(p, r.node, samplePoints(p, [p.liveDomain], 3, 'live'));
  if (considered === 0 || passed < considered) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

export function checkFinal(p: Problem, answer: string): { ok: boolean; passRate: number } {
  const r = parseAnswer(answer);
  if ('error' in r) return { ok: false, passRate: 0 };
  const { considered, passed } = run(p, r.node, samplePoints(p, p.finalDomains, FINAL_POINTS, 'final'));
  if (considered === 0) return { ok: false, passRate: 0 };
  const passRate = passed / considered;
  return { ok: passRate >= FINAL_PASS_RATE, passRate };
}
