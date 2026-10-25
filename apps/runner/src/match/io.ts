// Per-fighter FighterIO (PRD §8.9, §11.7, FC-F-043, FC-F-061). Everything a fighter does flows through here.
import type { FighterId, FightEvent, Problem, ProblemIdx } from '@fc/contracts';
import { checkLive } from '../problems/index.js';
import type { FighterIO, LiveVerdict } from '../fighters/types.js';
import type { EventBatcher } from './batcher.js';
import { cleanLabel, cleanText, filterSay } from './sanitize.js';
import type { AcceptedAnswer } from './types.js';

export const MAX_ATTEMPTS = 3;
export const MISS_POINTS = -5;
export const YELLOW_PENALTY = 5;
export const YELLOWS_BEFORE_RED = 2;

export type FighterRt = {
  id: FighterId;
  attempts: Partial<Record<ProblemIdx, number>>;
  accepted: Partial<Record<ProblemIdx, AcceptedAnswer>>;
  submissions: number;
  denies: number; yellow: number; red: number;
  taunts: number; tauntLimit: number;
  lastThinkAt: number; lastToolAt: number;
  state: 'running' | 'done' | 'out';
  outReason: 'red_card' | 'timeout' | 'crash' | 'budget' | null;
  ctrl: AbortController;
};

export type MatchCtx = {
  problems: Map<ProblemIdx, Problem>;
  batcher: EventBatcher;
  now: () => number;
  startedAt: number;
  deadlineAt: number;
  /** false once the bell has rung: nothing more may be posted. */
  isLive: () => boolean;
  toolMinMs: number; thinkingMinMs: number;
};

type Ev<T extends FightEvent['type']> = Extract<FightEvent, { type: T }>['data'];
const ev = <T extends FightEvent['type']>(type: T, data: Ev<T>) => ({ type, data });

export function newRt(id: FighterId, tauntLimit: number): FighterRt {
  return { id, attempts: {}, accepted: {}, submissions: 0, denies: 0, yellow: 0, red: 0, taunts: 0, tauntLimit,
    lastThinkAt: -Infinity, lastToolAt: -Infinity, state: 'running', outReason: null, ctrl: new AbortController() };
}

/** Terminal event for a fighter, posted at most once. Returns false if the fighter was already terminal. */
export function finish(rt: FighterRt, c: MatchCtx, how: { done: true } | { out: 'red_card' | 'timeout' | 'crash' | 'budget' }): boolean {
  if (rt.state !== 'running') return false;
  if ('done' in how) { rt.state = 'done'; c.batcher.push(ev('fighter.done', { fighterId: rt.id })); }
  else { rt.state = 'out'; rt.outReason = how.out; c.batcher.push(ev('fighter.out', { fighterId: rt.id, reason: how.out })); }
  return true;
}

export function createFighterIO(rt: FighterRt, c: MatchCtx): FighterIO {
  const active = () => rt.state === 'running' && c.isLive();
  const elapsed = () => c.now() - c.startedAt;
  const timeUp = (): LiveVerdict => ({ ok: false, points: 0, message: 'Time is up. Submission not scored.' });

  return {
    async submit(problem, antiderivative) {
      const p = c.problems.get(problem);
      if (!p) return { ok: false, points: 0, message: `Unknown problem P${String(problem)}.` };
      if (!active() || c.now() >= c.deadlineAt) return timeUp();
      const used = rt.attempts[problem] ?? 0;
      if (used >= MAX_ATTEMPTS) return { ok: false, points: 0, message: `No attempts left on P${problem}.` };   // no penalty, no event
      const attempt = (used + 1) as 1 | 2 | 3;
      rt.attempts[problem] = attempt;
      rt.submissions++;
      await Promise.resolve();
      if (!active()) return timeUp();

      let res: ReturnType<typeof checkLive>;
      try { res = checkLive(p, String(antiderivative ?? '')); }
      catch { res = { ok: false, reason: 'invalid_syntax' }; }

      if (res.ok) {
        const replaced = rt.accepted[problem] !== undefined;
        rt.accepted[problem] = { answer: String(antiderivative), attempt, points: p.points, atMs: elapsed() };
        c.batcher.push(
          ev('fighter.submit', { fighterId: rt.id, problem, attempt }),
          ev('verdict.live', { fighterId: rt.id, problem, ok: true, points: p.points, reason: 'hit', replaced }),
        );
        return {
          ok: true, points: p.points,
          message: replaced
            ? `HIT on P${problem}: answer replaced (attempt ${attempt}/3). Points unchanged.`
            : `HIT on P${problem}: +${p.points} (live check passed). Final review happens after time.`,
        };
      }
      const reason = res.reason === 'invalid_syntax' ? 'invalid_syntax' : 'mismatch';
      c.batcher.push(
        ev('fighter.submit', { fighterId: rt.id, problem, attempt }),
        ev('verdict.live', { fighterId: rt.id, problem, ok: false, points: MISS_POINTS, reason, replaced: false }),
      );
      const left = MAX_ATTEMPTS - attempt;
      return {
        ok: false, points: MISS_POINTS,
        message: reason === 'invalid_syntax'
          ? `MISS on P${problem}: could not parse your expression (mathjs syntax). −5. Attempts left: ${left}.`
          : `MISS on P${problem}: derivative does not match the integrand. −5. Attempts left: ${left}.`,
      };
    },

    async say(text) {
      if (!active()) return { accepted: false, reason: 'not live' };
      if (rt.taunts >= rt.tauntLimit) return { accepted: false, reason: 'no taunts left' };
      const f = filterSay(text);
      if (!f.ok) return { accepted: false, reason: f.reason };
      rt.taunts++;
      c.batcher.push(ev('fighter.say', { fighterId: rt.id, text: f.text, source: 'model' }));
      return { accepted: true };
    },

    activity(a) {
      if (!active()) return;
      const t = c.now();
      if (a.kind === 'thinking') {
        if (t - rt.lastThinkAt < c.thinkingMinMs) return;
        rt.lastThinkAt = t;
        c.batcher.push(ev('fighter.thinking', { fighterId: rt.id }));
      } else {
        if (t - rt.lastToolAt < c.toolMinMs) return;
        rt.lastToolAt = t;
        c.batcher.push(ev('fighter.tool', { fighterId: rt.id, tool: a.tool, label: cleanLabel(a.label) }));
      }
    },

    referee(d) {
      if (d.allowed || !active()) return;
      rt.denies++;
      const reason = cleanText(`${d.tool}: ${d.summary}`, 60) || 'violation';
      if (rt.denies <= YELLOWS_BEFORE_RED) {
        rt.yellow++;
        c.batcher.push(ev('referee.card', { fighterId: rt.id, color: 'yellow', reason, penalty: YELLOW_PENALTY }));
      } else {
        rt.red++;
        c.batcher.push(ev('referee.card', { fighterId: rt.id, color: 'red', reason, penalty: 0 }));   // keeps its points
        finish(rt, c, { out: 'red_card' });
        rt.ctrl.abort();
      }
    },

    remainingMs: () => Math.max(0, c.deadlineAt - c.now()),
    isOut: () => rt.state !== 'running' || !c.isLive(),
  };
}
