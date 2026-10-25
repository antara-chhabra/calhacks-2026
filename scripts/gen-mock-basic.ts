// Deterministic generator for fixtures/matches/mock-basic.json (K-05, FC-F-242).
// Run: node --import tsx scripts/gen-mock-basic.ts   (writes the fixture; no randomness, no network, no clock)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  HOUSE_ROSTER, type FightEnvelope, type FightEvent, type FighterPublic, type MarketSpec, type ProblemIdx, type ProblemSet,
  type Slot, type Standing, type ToolKind,
} from '@fc/contracts';
import {
  commitHash, decimalOdds, initialMatchState, reduceMatch, resolveMarkets, seedSplit, settleMarket, winProbabilities,
  type PoolState,
} from '@fc/engine';

export const MATCH_ID = 'm_mock_basic';
export const FIXTURE_NAME = 'mock-basic';
const TIME_LIMIT = 120_000;
const LOCK_AT = 6_000;                 // betting.locked t (= bettingClosesAt), ms since match.created
const START = 9_000;                   // match.started t
const TIMEUP = START + TIME_LIMIT;
const RAKE_BPS = 500;
const TOTAL_POINTS = 150;              // 10+20+30+40+50, denominator of scorePct

type Fid = 'vex' | 'sage' | 'glitch' | 'pip';
const FIGHTERS: Fid[] = ['vex', 'sage', 'glitch', 'pip'];
const SLOTS: Slot[] = [0, 1, 2, 3];
const ELO: Record<Fid, number> = { vex: 1100, sage: 1080, glitch: 1020, pip: 960 };   // mock matches never change ratings (§16.2 #8)

export type FixtureBet = { id: string; marketId: string; outcome: string; stake: number; handle: string };
export type MockBasicFixture = {
  version: 1; matchId: string; number: number; fighters: FighterPublic[]; markets: MarketSpec[]; problemSet: ProblemSet; salt: string;
  events: FightEnvelope[]; bets: FixtureBet[];
  expected: {
    standings: Standing[]; results: { marketId: string; outcome: string }[];
    payouts: Record<string, { payouts: Record<string, number>; rake: number; seedReturn: number; dust: number; total: number }>;
  };
};

/** mulberry32: tiny seeded PRNG. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hex = (rnd: () => number, n: number): string => Array.from({ length: n }, () => Math.floor(rnd() * 16).toString(16)).join('');

/* ---------- problems (PRD §11.4 families; one per difficulty; recip_linear is the trap) ---------- */
function buildProblemSet(seed: string): ProblemSet {
  return {
    category: 'integrals', seed,
    problems: [
      { idx: 1, difficulty: 1, points: 10, family: 'recip_linear', statementTex: '\\int \\frac{3}{x+1}\\,dx', integrand: '3/(x+1)',
        liveDomain: [-0.5, 2], finalDomains: [[-0.5, 2], [-4, -1.5]], reference: '3*log(abs(x+1))', trap: true },
      { idx: 2, difficulty: 2, points: 20, family: 'usub_gauss', statementTex: '\\int 2x\\,e^{x^2/2}\\,dx', integrand: '2*x*exp(x^2/2)',
        liveDomain: [-1.2, 1.2], finalDomains: [[-1.5, 1.5]], reference: '2*exp(x^2/2)', trap: false },
      { idx: 3, difficulty: 3, points: 30, family: 'parts_x_trig', statementTex: '\\int x\\sin(2x)\\,dx', integrand: 'x*sin(2*x)',
        liveDomain: [-2, 2], finalDomains: [[-3, 3]], reference: 'sin(2*x)/4 - x*cos(2*x)/2', trap: false },
      { idx: 4, difficulty: 4, points: 40, family: 'exp_trig_cyclic', statementTex: '\\int e^{x}\\sin(2x)\\,dx', integrand: 'exp(x)*sin(2*x)',
        liveDomain: [-1.5, 1.5], finalDomains: [[-2, 2]], reference: 'exp(x)*(sin(2*x) - 2*cos(2*x))/5', trap: false },
      { idx: 5, difficulty: 5, points: 50, family: 'x_over_x4', statementTex: '\\int \\frac{x}{x^4+4}\\,dx', integrand: 'x/(x^4+4)',
        liveDomain: [-2, 2], finalDomains: [[-4, 4]], reference: 'atan(x^2/2)/4', trap: false },
    ],
  };
}

/* ---------- scripted fight (times are ms after match.started) ---------- */
const SAY: Record<Fid, { hit: string[]; miss: string[]; idle: string[] }> = {
  vex: { hit: ['Another one on the pile.', 'Told you. Kneel.', 'Too easy.'], miss: ['That was the arena\'s fault.', 'Whatever. Next.'],
         idle: ['Verification is for the weak.', 'Who wants to be next?', 'Swinging first.'] },
  sage: { hit: ['Verified. Then struck.', 'Measured twice.', 'The numbers agree.'], miss: ['A rare error. Noted.'],
          idle: ['Check the derivative. Always.', 'Patience is also a weapon.', 'Breathe. Differentiate.'] },
  glitch: { hit: ['lol. lmao, even.', 'guessed it. do not ask how.', 'chaos pays.'], miss: ['skill issue (the problem\'s)', 'error: vibes not found'],
            idle: ['hardest one first. obviously.', 'what if x is just... bigger', 'brb breaking things'] },
  pip: { hit: ['I got this!', 'Did I do that?! I did that!', 'Easy ones first!'], miss: ['Oops! ...probably fine.', 'Try again!'],
         idle: ['Full send!', 'Is the sword supposed to be wooden?', 'Easy ones first, easy ones first.'] },
};

type Step = { rel: number; evs: FightEvent[] };

function buildLiveSteps(rnd: () => number): { steps: Step[]; ends: Record<Fid, number> } {
  const steps: Step[] = [];
  const ends: Record<Fid, number> = { vex: 0, sage: 0, glitch: 0, pip: 0 };
  const put = (rel: number, ...evs: FightEvent[]): void => { steps.push({ rel, evs }); };
  const pick = (xs: string[]): string => xs[Math.floor(rnd() * xs.length)]!;
  const say = (f: Fid, rel: number, text: string, source: 'model' | 'canned' = 'model'): void =>
    put(rel, { type: 'fighter.say', data: { fighterId: f, text, source } });
  const tool = (f: Fid, rel: number, t: ToolKind, label: string): void =>
    put(rel, { type: 'fighter.tool', data: { fighterId: f, tool: t, label } });
  const think = (f: Fid, rel: number): void => put(rel, { type: 'fighter.thinking', data: { fighterId: f } });

  /** One attempt: think, read, (verify), submit + verdict in the same batch, then a quip. */
  const attempt = (f: Fid, rel: number, p: ProblemIdx, n: 1 | 2 | 3,
    res: { ok: true; points: number } | { ok: false; reason: 'mismatch' | 'invalid_syntax' }, verify = false): void => {
    think(f, rel - 5500);
    tool(f, rel - 4200, 'read', `reading P${p}`);
    if (verify) tool(f, rel - 2200, 'run', `checking P${p} numerically`);
    else tool(f, rel - 2200, 'write', `drafting P${p} answer`);
    const verdict: FightEvent = res.ok
      ? { type: 'verdict.live', data: { fighterId: f, problem: p, ok: true, points: res.points, reason: 'hit', replaced: false } }
      : { type: 'verdict.live', data: { fighterId: f, problem: p, ok: false, points: -5, reason: res.reason, replaced: false } };
    put(rel, { type: 'fighter.submit', data: { fighterId: f, problem: p, attempt: n } }, verdict);
    say(f, rel + 700, pick(res.ok ? SAY[f].hit : SAY[f].miss));
  };
  const card = (f: Fid, rel: number, color: 'yellow' | 'red', reason: string, penalty: number): void =>
    put(rel, { type: 'referee.card', data: { fighterId: f, color, reason, penalty } });

  // vex: sloppy P1 (no abs) is overturned by VAR; P3 needs a second try.
  attempt('vex', 7_000, 1, 1, { ok: true, points: 10 });
  attempt('vex', 30_000, 2, 1, { ok: true, points: 20 });
  attempt('vex', 50_000, 3, 1, { ok: false, reason: 'mismatch' });
  attempt('vex', 72_000, 3, 2, { ok: true, points: 30 });
  ends.vex = 92_000;

  // sage: methodical, verifies every answer, finishes on a late P4.
  attempt('sage', 14_000, 1, 1, { ok: true, points: 10 }, true);
  attempt('sage', 33_000, 2, 1, { ok: true, points: 20 }, true);
  attempt('sage', 55_000, 3, 1, { ok: true, points: 30 }, true);
  attempt('sage', 100_000, 4, 1, { ok: true, points: 40 }, true);
  put(101_500, { type: 'fighter.done', data: { fighterId: 'sage' } });
  ends.sage = 101_500;

  // glitch: hardest first, garbage syntax, then a card spiral to a red.
  attempt('glitch', 22_000, 5, 1, { ok: false, reason: 'invalid_syntax' });
  card('glitch', 23_000, 'yellow', 'answer outside the allowed grammar', 5);
  attempt('glitch', 40_000, 3, 1, { ok: true, points: 30 });
  tool('glitch', 50_000, 'other', 'asking a hint for P4');
  put(52_000, { type: 'fighter.hint', data: { fighterId: 'glitch', problem: 4, txRef: null } });
  attempt('glitch', 62_000, 5, 2, { ok: false, reason: 'mismatch' });
  tool('glitch', 68_000, 'run', 'curl the answer key (blocked)');
  card('glitch', 70_000, 'red', 'blocked network call from sandbox', 10);
  put(70_000, { type: 'fighter.out', data: { fighterId: 'glitch', reason: 'red_card' } });
  ends.glitch = 70_000;

  // pip: easy first, one miss and a yellow, then a surprise 5-star before the one-minute mark.
  attempt('pip', 8_000, 1, 1, { ok: true, points: 10 });
  attempt('pip', 21_000, 2, 1, { ok: true, points: 20 });
  attempt('pip', 30_000, 3, 1, { ok: false, reason: 'mismatch' });
  card('pip', 31_000, 'yellow', 'two submissions in under a second', 5);
  attempt('pip', 42_000, 5, 1, { ok: true, points: 50 });
  put(43_500, { type: 'fighter.done', data: { fighterId: 'pip' } });
  ends.pip = 43_500;

  // Idle chatter: seeded jitter, always strictly before the fighter's last event.
  for (const f of FIGHTERS) {
    for (let rel = 11_000 + Math.floor(rnd() * 3000); rel < ends[f] - 4000; rel += 13_000 + Math.floor(rnd() * 5000)) {
      if (rnd() < 0.5) say(f, rel + 250, pick(SAY[f].idle));
      else think(f, rel);
    }
  }
  // Late-match narration from the fighters still in the ring.
  say('vex', 85_000, 'Still standing. Obviously.');
  say('vex', 88_000, 'Out of ideas, not out of swagger.');
  return { steps, ends };
}

/* ---------- markets, bets ---------- */
function buildMarkets(): MarketSpec[] {
  const probs = winProbabilities(ELO);
  const winnerSeeds = seedSplit(FIGHTERS.map((f) => probs[f]), 20_000);
  const fb = [...FIGHTERS, 'none'];
  return [
    { id: `${MATCH_ID}:winner`, kind: 'winner', subject: null, line: null, label: 'Match winner', outcomes: [...FIGHTERS], seeds: winnerSeeds, rakeBps: RAKE_BPS },
    { id: `${MATCH_ID}:score_line:sage`, kind: 'score_line', subject: 'sage', line: 0.6, label: 'SAGE ≥ 60%', outcomes: ['over', 'under'],
      seeds: seedSplit([0.5, 0.5], 10_000), rakeBps: RAKE_BPS },
    { id: `${MATCH_ID}:beat_clock`, kind: 'beat_clock', subject: null, line: 60_000, label: 'Anyone solves 5★ before 1:00?', outcomes: ['yes', 'no'],
      seeds: seedSplit([0.5, 0.5], 10_000), rakeBps: RAKE_BPS },
    { id: `${MATCH_ID}:first_blood`, kind: 'first_blood', subject: null, line: null, label: 'First blood', outcomes: fb,
      seeds: seedSplit(fb.map(() => 1), 20_000), rakeBps: RAKE_BPS },
  ];
}

function buildBets(): FixtureBet[] {
  const W = `${MATCH_ID}:winner`, S = `${MATCH_ID}:score_line:sage`, C = `${MATCH_ID}:beat_clock`, B = `${MATCH_ID}:first_blood`;
  const rows: [string, string, number, string][] = [
    [W, 'sage', 2500, 'JudgeOtter42'], [W, 'vex', 1500, 'JudgeOtter42'], [W, 'pip', 500, 'mina_k'], [W, 'sage', 1000, 'bay_bob'],
    [W, 'glitch', 750, 'mina_k'], [S, 'over', 2000, 'bay_bob'], [S, 'under', 1000, 'calhacks_dev'], [C, 'no', 1500, 'JudgeOtter42'],
    [C, 'yes', 500, 'mina_k'], [B, 'vex', 1000, 'calhacks_dev'], [B, 'pip', 300, 'bay_bob'], [B, 'sage', 1200, 'mina_k'],
  ];
  return rows.map(([marketId, outcome, stake, handle], i) => ({ id: `b${i + 1}`, marketId, outcome, stake, handle }));
}

/* ---------- assembly ---------- */
export async function buildMockBasic(): Promise<MockBasicFixture> {
  const rnd = prng(0xc0ffee05);
  const seed = hex(rnd, 32);
  const salt = hex(rnd, 32);
  const problemSet = buildProblemSet(seed);
  const hash = await commitHash(problemSet, salt);
  const markets = buildMarkets();
  const bets = buildBets();
  const fighters = FIGHTERS.map((f) => HOUSE_ROSTER[f]);

  const timed: { t: number; ev: FightEvent }[] = [];
  const at = (t: number, ev: FightEvent): void => { timed.push({ t, ev }); };

  at(0, { type: 'match.created', data: { category: 'integrals', mode: 'mock', isDemo: false, fighters: [...FIGHTERS], slots: SLOTS,
    problems: problemSet.problems.map((p) => ({ idx: p.idx, difficulty: p.difficulty, points: p.points })),
    commitHash: hash, bettingClosesAt: LOCK_AT, timeLimitMs: TIME_LIMIT } });
  const pools: Record<string, Record<string, number>> = {};
  for (const m of markets) {
    pools[m.id] = Object.fromEntries(m.outcomes.map((o) => [o, 0]));
    for (const b of bets) if (b.marketId === m.id) pools[m.id]![b.outcome]! += b.stake;
  }
  at(LOCK_AT, { type: 'betting.locked', data: { pools } });
  FIGHTERS.forEach((f, i) => at(LOCK_AT + 200 + i * 150,
    { type: 'purse.entry', data: { fighterId: f, amountUsdc: 0.01, txRef: null, coveredByHouse: true } }));
  at(7_200, { type: 'match.intro', data: { lines: Object.fromEntries(FIGHTERS.map((f) => [f, HOUSE_ROSTER[f].catchphrase])) } });
  at(START, { type: 'match.started', data: {} });

  const { steps } = buildLiveSteps(rnd);
  for (const s of steps) s.evs.forEach((ev) => at(START + s.rel, ev));
  at(TIMEUP, { type: 'match.timeup', data: {} });

  // Stable sort keeps within-step order (submit before verdict, card before out).
  const live = timed.map((x, i) => ({ ...x, i })).sort((a, b) => a.t - b.t || a.i - b.i);
  const events: FightEnvelope[] = [];
  const push = (t: number, ev: FightEvent): void => { events.push({ v: 1, matchId: MATCH_ID, seq: events.length + 1, t, ...ev } as FightEnvelope); };
  for (const x of live) push(x.t, x.ev);

  // Review: verdict.final for each fighter's latest accepted hit; the trap answer (vex P1) is overturned by VAR.
  const latest = new Map<string, { fighterId: string; problem: ProblemIdx; points: number }>();
  for (const e of events) if (e.type === 'verdict.live' && e.data.ok) latest.set(`${e.data.fighterId}:${e.data.problem}`, { fighterId: e.data.fighterId, problem: e.data.problem, points: e.data.points });
  let t = TIMEUP + 400;
  for (const f of FIGHTERS) {
    for (const p of [1, 2, 3, 4, 5] as ProblemIdx[]) {
      const h = latest.get(`${f}:${p}`);
      if (!h) continue;
      const overturned = f === 'vex' && p === 1;
      push(t, { type: 'verdict.final', data: { fighterId: f, problem: p, overturned, points: overturned ? -h.points : 0 } });
      t += overturned ? 1_200 : 250;
    }
  }

  // Standings from the real reducer.
  const st = events.reduce(reduceMatch, initialMatchState());
  const rows = FIGHTERS.map((f) => {
    const fl = st.fighters[f]!;
    const survivors = Object.entries(fl.solved).filter(([, s]) => s!.final !== 'overturned').map(([, s]) => s!);
    const missTimes = events.filter((e) => e.type === 'verdict.live' && !e.data.ok && e.data.fighterId === f).map((e) => e.t);
    return {
      fighterId: f, points: Math.max(0, fl.points), hits: fl.hits, misses: fl.misses, overturned: fl.overturned, yellow: fl.yellow, red: fl.red,
      firstHitMs: survivors.length ? Math.min(...survivors.map((s) => s.atMs)) - START : null,
      lastScoreMs: survivors.length ? Math.max(...survivors.map((s) => s.atMs)) - START : null,
      clutchPoints: survivors.filter((s) => s.atMs - START > TIME_LIMIT * 0.75).reduce((a, s) => a + s.points, 0),
      missesRecovered: missTimes.filter((mt) => survivors.some((s) => s.atMs > mt)).length,
    };
  }).sort((a, b) => b.points - a.points);
  const standings: Standing[] = rows.map((r, i) => ({ ...r, rank: (i + 1) as 1 | 2 | 3 | 4, scorePct: r.points / TOTAL_POINTS }));
  push(t + 300, { type: 'match.result', data: { standings } });
  push(t + 800, { type: 'match.revealed', data: { problemSet, salt } });

  // Settlement via the engine.
  const finalState = events.reduce(reduceMatch, initialMatchState());
  const results = resolveMarkets(finalState, markets);
  const payouts: MockBasicFixture['expected']['payouts'] = {};
  let totalPaid = 0;
  for (const m of markets) {
    const poolState: PoolState = m.outcomes.map((o, i) => ({
      outcome: o, seed: m.seeds[i]!, staked: bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0),
    }));
    const mb = bets.filter((b) => b.marketId === m.id);
    const res = settleMarket(poolState, mb, results.find((r) => r.marketId === m.id)!.outcome, m.rakeBps);
    const total = poolState.reduce((a, p) => a + p.staked + p.seed, 0);
    payouts[m.id] = { ...res, total };
    totalPaid += Object.values(res.payouts).reduce((a, b) => a + b, 0);
    decimalOdds(poolState, m.rakeBps);   // sanity: must not throw
  }
  const elo = Object.fromEntries(FIGHTERS.map((f) => [f, [ELO[f], ELO[f]] as [number, number]]));
  const ovr = Object.fromEntries(FIGHTERS.map((f) => { const o = Math.min(99, Math.max(40, Math.round(60 + (ELO[f] - 1000) / 10))); return [f, [o, o] as [number, number]]; }));
  push(t + 1_300, { type: 'match.settled', data: { results, totalPaid, elo, ovr } });
  const winner = standings[0]!.fighterId;
  push(t + 3_300, { type: 'purse.paid', data: { fighterId: winner, amountUsdc: 0.03, txHash: '0x' + hex(rnd, 64), to: '0x' + hex(rnd, 40) } });

  return { version: 1, matchId: MATCH_ID, number: 1, fighters, markets, problemSet, salt, events, bets, expected: { standings, results, payouts } };
}

export async function renderMockBasic(): Promise<string> {
  return JSON.stringify(await buildMockBasic(), null, 2) + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'matches', `${FIXTURE_NAME}.json`);
  mkdirSync(dirname(out), { recursive: true });
  const text = await renderMockBasic();
  writeFileSync(out, text);
  const fx = JSON.parse(text) as MockBasicFixture;
  console.log(`wrote ${out} (${fx.events.length} events)`);
}
