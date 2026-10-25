// Mock fighter backend (PRD §11.3, FC-F-045). Deterministic: seeded by matchId + fighter.id.
import type { FighterProblem, ProblemIdx } from '@fc/contracts';
import type { FighterBackend, FighterIO, FighterRunInput, FighterRunResult } from './types.js';
import {
  DEFAULT_PROFILE, INVALID_ANSWERS, MOCK_PROFILES, SLOPPY_FALLBACK, THINKING_INTERVAL_S, TOOL_INTERVAL_S, TOOL_LABELS,
  type MockProfile,
} from './mock-profiles.js';

export type MockOptions = {
  /** Inject the reference antiderivative (O4 wiring). null/absent → mock submits garbage-but-valid answers. */
  answerFor?: (p: FighterProblem) => string | null;
  /** Divide all waits by this (tests). remainingMs() is treated as virtual ms. Default 1. */
  timeScale?: number;
  /** Override the profile (tests). */
  profile?: MockProfile;
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cap = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n));

function orderProblems(ps: FighterProblem[], order: FighterRunInput['strategy']['order'], prof: MockProfile): FighterProblem[] {
  const a = [...ps];
  const p = (x: FighterProblem) => prof.pCorrect[x.difficulty - 1] ?? 0.5;
  switch (order) {
    case 'easy_first': return a.sort((x, y) => x.difficulty - y.difficulty || x.idx - y.idx);
    case 'hard_first': return a.sort((x, y) => y.difficulty - x.difficulty || x.idx - y.idx);
    case 'points_per_risk': return a.sort((x, y) => y.points * p(y) - x.points * p(x) || x.idx - y.idx);
    default: return a.sort((x, y) => x.idx - y.idx);
  }
}

export function createMockBackend(opts: MockOptions = {}): FighterBackend {
  const scale = Math.max(opts.timeScale ?? 1, 1e-6);
  return {
    engine: 'mock',
    async run(input: FighterRunInput, io: FighterIO, signal: AbortSignal): Promise<FighterRunResult> {
      const prof = opts.profile ?? MOCK_PROFILES[input.fighter.id] ?? DEFAULT_PROFILE;
      const rnd = mulberry32(hash(input.matchId + input.fighter.id));
      const normal = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
      const between = ([lo, hi]: [number, number]) => (lo + rnd() * (hi - lo)) * 1000;

      let vt = 0;                                   // virtual ms elapsed in this run
      let nextThink = between(THINKING_INTERVAL_S);
      let nextTool = between(TOOL_INTERVAL_S);
      let turns = 0;
      let curIdx: number = input.problems[0]?.idx ?? 1;
      const stopped = () => signal.aborted || io.isOut() || io.remainingMs() <= 0;

      const realSleep = (ms: number) => new Promise<void>((res) => {
        if (signal.aborted) return res();
        const t = setTimeout(done, ms / scale);
        function done() { signal.removeEventListener('abort', done); clearTimeout(t); res(); }
        signal.addEventListener('abort', done, { once: true });
      });
      const emitTool = () => {
        const t = TOOL_LABELS[Math.floor(rnd() * TOOL_LABELS.length)]!;
        io.activity({ kind: 'tool', tool: t.tool, label: cap(t.label.replace('{n}', String(curIdx)), 48) });
      };
      /** Wait virtual ms, emitting thinking/tool activity on schedule. Returns false if stopped. */
      const wait = async (ms: number): Promise<boolean> => {
        const end = vt + ms;
        while (vt < end) {
          if (stopped()) return false;
          const next = Math.min(end, nextThink, nextTool);
          await realSleep(next - vt);
          if (signal.aborted) return false;
          vt = next;
          if (vt >= nextThink) { io.activity({ kind: 'thinking' }); nextThink = vt + between(THINKING_INTERVAL_S); }
          if (vt >= nextTool) { emitTool(); nextTool = vt + between(TOOL_INTERVAL_S); }
        }
        return !stopped();
      };

      const ordered = orderProblems(input.problems, input.strategy.order, prof);
      const tauntBudget = prof.taunts;
      // spread taunts: before the k-th attempted problem
      const tauntAt = new Set<number>();
      for (let k = 0; k < tauntBudget && ordered.length; k++) tauntAt.add(Math.floor((k * ordered.length) / Math.max(tauntBudget, 1)));
      let tauntN = 0;
      const sayTaunt = async () => {
        const line = prof.taunts_lines[(tauntN++) % prof.taunts_lines.length]!;
        await io.say(cap(line, 80));
      };

      const wrongAnswer = (p: FighterProblem, correct: string | null): string => {
        if (rnd() < prof.pSloppy) {
          if (correct == null) return SLOPPY_FALLBACK;
          return correct.includes('abs(') ? correct.replace(/abs\(/g, '(') : `${correct} + x`;   // missing |·| or lost constant-ish term
        }
        if (rnd() < prof.pInvalidSyntax) return INVALID_ANSWERS[Math.floor(rnd() * INVALID_ANSWERS.length)]!;
        return correct == null ? `x^${p.difficulty + 1}` : `2*(${correct})`;
      };

      for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i]!;
        curIdx = p.idx;
        if (stopped()) break;
        if (tauntAt.has(i)) await sayTaunt();

        const lat = Math.max(1000, (prof.latencyMeanS + prof.latencySdS * normal()) * 1000);
        if (lat > io.remainingMs()) { await wait(Math.max(io.remainingMs(), 0)); break; }
        if (!(await wait(lat))) break;

        const correct = opts.answerFor?.(p) ?? null;
        const pc = prof.pCorrect[p.difficulty - 1] ?? 0.5;
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (stopped()) break;
          if (rnd() < prof.pRefereeDeny) {
            io.referee({ allowed: false, tool: 'network', summary: cap('blocked: network access is not allowed', 120) });
          }
          const wantCorrect = correct != null && rnd() < (attempt === 1 ? pc : Math.min(0.95, pc + 0.25 * (attempt - 1)));
          const ans = wantCorrect ? correct! : wrongAnswer(p, correct);
          turns++;
          const v = await io.submit(p.idx as ProblemIdx, ans);
          if (v.ok) break;
          // retry only with some probability and time left
          if (attempt === 3 || rnd() < 0.4) break;
          if (!(await wait(Math.max(1000, prof.latencyMeanS * 300)))) break;
        }
      }
      return { ok: true, turns, usage: null, error: null };
    },
  };
}
