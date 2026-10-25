// One realistic envelope per FightEvent type (house fighters).
import type { FightEnvelope, FightEvent, FightEventType, Problem, ProblemSet, Standing } from '../src/index.js';

const M = 'm_0001';
const fighters = ['vex', 'sage', 'glitch', 'quill'];
const problem = (idx: 1 | 2 | 3 | 4 | 5, points: 10 | 20 | 30 | 40 | 50): Problem => ({
  idx, difficulty: idx, points, family: 'parts_poly_exp', statementTex: '\\int x e^{2x}\\,dx', integrand: 'x*exp(2*x)',
  liveDomain: [0.5, 2], finalDomains: [[0.5, 2], [2, 4]], reference: '(x/2 - 1/4)*exp(2*x)', trap: idx === 5,
});
const problemSet: ProblemSet = {
  category: 'integrals', seed: '0123456789abcdef0123456789abcdef',
  problems: [problem(1, 10), problem(2, 20), problem(3, 30), problem(4, 40), problem(5, 50)],
};
const standing = (fighterId: string, rank: 1 | 2 | 3 | 4, points: number): Standing => ({
  fighterId, rank, points, scorePct: points / 150, hits: 3, misses: 1, overturned: 0, yellow: 0, red: 0,
  firstHitMs: 12000, lastScoreMs: 90000, clutchPoints: 30, missesRecovered: 1,
});

const events: FightEvent[] = [
  { type: 'match.created', data: { category: 'integrals', mode: 'live', isDemo: false, fighters, slots: [0, 1, 2, 3],
    problems: problemSet.problems.map(({ idx, difficulty, points }) => ({ idx, difficulty, points })),
    commitHash: 'a'.repeat(64), bettingClosesAt: 1_760_000_000_000, timeLimitMs: 180000 } },
  { type: 'betting.locked', data: { pools: { [`${M}:winner`]: { vex: 5000, sage: 4000, glitch: 3000, quill: 2000 } } } },
  { type: 'purse.entry', data: { fighterId: 'vex', amountUsdc: 1, txRef: null, coveredByHouse: true } },
  { type: 'match.intro', data: { lines: { vex: 'Kneel.', sage: 'Measure twice.', glitch: 'lol.', quill: 'As the literature suggests…' } } },
  { type: 'match.started', data: {} },
  { type: 'fighter.thinking', data: { fighterId: 'sage' } },
  { type: 'fighter.tool', data: { fighterId: 'sage', tool: 'run', label: 'python: check antiderivative at x=1.3' } },
  { type: 'fighter.say', data: { fighterId: 'glitch', text: 'hardest one first. obviously.', source: 'canned' } },
  { type: 'fighter.submit', data: { fighterId: 'quill', problem: 1, attempt: 1 } },
  { type: 'verdict.live', data: { fighterId: 'quill', problem: 1, ok: true, points: 10, reason: 'hit', replaced: false } },
  { type: 'referee.card', data: { fighterId: 'vex', color: 'yellow', reason: 'tool call outside allowed set', penalty: 5 } },
  { type: 'fighter.hint', data: { fighterId: 'pip', problem: 3, txRef: null } },
  { type: 'fighter.done', data: { fighterId: 'brick' } },
  { type: 'fighter.out', data: { fighterId: 'vex', reason: 'red_card' } },
  { type: 'match.timeup', data: {} },
  { type: 'verdict.final', data: { fighterId: 'glitch', problem: 2, overturned: true, points: -20 } },
  { type: 'match.result', data: { standings: [standing('sage', 1, 100), standing('quill', 2, 80), standing('glitch', 3, 40), standing('vex', 4, 10)] } },
  { type: 'match.revealed', data: { problemSet, salt: 'f'.repeat(32) } },
  { type: 'match.settled', data: { results: [{ marketId: `${M}:winner`, outcome: 'sage' }], totalPaid: 13300,
    elo: { sage: [1500, 1516], vex: [1500, 1484] }, ovr: { sage: [70, 71], vex: [70, 69] } } },
  { type: 'purse.paid', data: { fighterId: 'sage', amountUsdc: 2, txHash: '0x' + 'ab'.repeat(32), to: '0x' + '12'.repeat(20) } },
  { type: 'match.void', data: { reason: 'runner unreachable at bell' } },
];

export const examples: FightEnvelope[] = events.map((e, i) => ({ v: 1, matchId: M, seq: i + 1, t: i * 1000, ...e }));
export const exampleTypes: FightEventType[] = examples.map((e) => e.type);
