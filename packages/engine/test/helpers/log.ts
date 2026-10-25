// Synthetic full-match log for reducer/invariant tests (not the K-05 fixture).
import type { FightEnvelope, FightEvent, Slot, Standing } from '@fc/contracts';
import { initialMatchState, reduceMatch } from '../../src/index.js';

export const FIGHTERS = ['vex', 'sage', 'glitch', 'quill'];
export const SLOTS: Slot[] = [0, 1, 2, 3];

export function envelope(seq: number, t: number, ev: FightEvent, matchId = 'm_7'): FightEnvelope {
  return { v: 1, matchId, seq, t, ...ev } as FightEnvelope;
}

export function buildLog(): FightEnvelope[] {
  const out: FightEnvelope[] = [];
  let t = 0;
  const push = (ev: FightEvent, dt = 500): void => { t += dt; out.push(envelope(out.length + 1, t, ev)); };
  const solve = (f: string, p: 1 | 2 | 3 | 4 | 5, points: number, attempt: 1 | 2 | 3 = 1): void => {
    push({ type: 'fighter.submit', data: { fighterId: f, problem: p, attempt } });
    push({ type: 'verdict.live', data: { fighterId: f, problem: p, ok: true, points, reason: 'hit', replaced: false } }, 0);
  };
  const miss = (f: string, p: 1 | 2 | 3 | 4 | 5, attempt: 1 | 2 | 3 = 1, reason: 'mismatch' | 'invalid_syntax' = 'mismatch'): void => {
    push({ type: 'fighter.submit', data: { fighterId: f, problem: p, attempt } });
    push({ type: 'verdict.live', data: { fighterId: f, problem: p, ok: false, points: -5, reason, replaced: false } }, 0);
  };
  const problems = ([1, 2, 3, 4, 5] as const).map((idx) => ({ idx, difficulty: idx, points: (idx * 10) as 10 | 20 | 30 | 40 | 50 }));

  push({ type: 'match.created', data: { category: 'integrals', mode: 'mock', isDemo: false, fighters: FIGHTERS, slots: SLOTS, problems,
    commitHash: 'deadbeef'.repeat(8), bettingClosesAt: 90_000, timeLimitMs: 120_000 } }, 0);
  push({ type: 'betting.locked', data: { pools: {} } }, 90_000);
  for (const f of FIGHTERS) push({ type: 'purse.entry', data: { fighterId: f, amountUsdc: 0.01, txRef: null, coveredByHouse: true } }, 0);
  push({ type: 'match.intro', data: { lines: { vex: 'Kneel.', sage: 'Patience is also a weapon.', glitch: 'lol', quill: 'Obviously.' } } });
  push({ type: 'match.started', data: {} });
  push({ type: 'fighter.thinking', data: { fighterId: 'sage' } });
  push({ type: 'fighter.tool', data: { fighterId: 'sage', tool: 'run', label: 'checking P1' } });
  push({ type: 'fighter.say', data: { fighterId: 'vex', text: 'Kneel.', source: 'canned' } });
  solve('sage', 1, 10);
  solve('vex', 2, 20);
  solve('sage', 3, 30);
  miss('vex', 1);
  solve('vex', 1, 10, 2);
  push({ type: 'referee.card', data: { fighterId: 'glitch', color: 'yellow', reason: 'blocked network call', penalty: 5 } });
  miss('glitch', 5, 1, 'invalid_syntax');
  push({ type: 'referee.card', data: { fighterId: 'glitch', color: 'red', reason: 'second violation', penalty: 10 } });
  push({ type: 'fighter.out', data: { fighterId: 'glitch', reason: 'red_card' } }, 0);
  solve('quill', 4, 40);
  push({ type: 'fighter.done', data: { fighterId: 'quill' } }, 0);
  solve('sage', 2, 20);
  push({ type: 'match.timeup', data: {} }, 30_000);
  const fin = (f: string, p: 1 | 2 | 3 | 4 | 5, overturned: boolean, points: number): void =>
    push({ type: 'verdict.final', data: { fighterId: f, problem: p, overturned, points } }, 100);
  fin('sage', 1, false, 0); fin('sage', 2, false, 0); fin('sage', 3, false, 0);
  fin('vex', 1, true, -10); fin('vex', 2, false, 0); fin('quill', 4, false, 0);
  const st = (fighterId: string, rank: 1 | 2 | 3 | 4, points: number, hits: number, misses: number, overturned: number, yellow: number, red: number): Standing =>
    ({ fighterId, rank, points, scorePct: points / 150, hits, misses, overturned, yellow, red, firstHitMs: null, lastScoreMs: null, clutchPoints: 0, missesRecovered: 0 });
  push({ type: 'match.result', data: { standings: [
    st('sage', 1, 60, 3, 0, 0, 0, 0), st('quill', 2, 40, 1, 0, 0, 0, 0), st('vex', 3, 15, 2, 1, 1, 0, 0), st('glitch', 4, 0, 0, 1, 0, 1, 1) ] } }, 100);
  push({ type: 'match.revealed', data: { problemSet: { category: 'integrals', seed: 'a'.repeat(32), problems: [] }, salt: 'salt' } });
  push({ type: 'match.settled', data: { results: [], totalPaid: 4210, elo: {}, ovr: {} } });
  push({ type: 'purse.paid', data: { fighterId: 'sage', amountUsdc: 0.09, txHash: '0xabc', to: '0xdef' } });
  return out;
}

export function reduceAll(events: FightEnvelope[]) {
  return events.reduce(reduceMatch, initialMatchState());
}
/** State just before event index `i` (0-based). */
export function stateBefore(events: FightEnvelope[], i: number) {
  return reduceAll(events.slice(0, i));
}
export function find(events: FightEnvelope[], pred: (e: FightEnvelope) => boolean): number {
  return events.findIndex(pred);
}
