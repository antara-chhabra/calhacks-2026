import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkInvariants, initialMatchState, reduceMatch, verifyReveal } from '@fc/engine';
import { HOUSE_ROSTER, type FightEnvelope } from '@fc/contracts';
import { generateProblemSet, checkLive, checkFinal } from '../src/problems/index.js';
import { runMatch, recoverOrphans, type Candidate } from '../src/match/index.js';
import { FakeStdb } from './fakes/fake-stdb.js';
import { fakeFighter, type Step } from './fakes/fake-fighter.js';

const SEED = '0123456789abcdef0123456789abcdef';
const SALT = 'fedcba9876543210fedcba9876543210';
const set = generateProblemSet(SEED);
const ref = (n: 1 | 2 | 3 | 4 | 5) => set.problems[n - 1]!.reference;
const trapP = set.problems.find((p) => p.trap && p.reference.includes('abs('))!;
const sloppy = trapP.reference.replaceAll('abs(', '(');
const strategy = { verify: false, order: 'in_order', risk: 'cautious', taunts: 3 } as const;
const cand = (id: keyof typeof HOUSE_ROSTER, elo = 1000): Candidate => ({
  fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: 'p', strategy, elo, lastMatchAt: 0,
});

function setup(scripts: Record<string, Step[]>, extra: Record<string, unknown> = {}, mode: 'live' | 'mock' = 'mock') {
  const stdb = new FakeStdb();
  const fighters = Object.fromEntries(Object.entries(scripts).map(([id, s]) => [id, fakeFighter(s)]));
  const deps = { stdb, backendFor: (c: Candidate) => fighters[c.fighter.id]!, log: () => {} };
  const opts = { candidates: (['vex', 'sage', 'glitch', 'quill'] as const).map((i, k) => cand(i, 1000 + k * 10)), timeLimitMs: 700, bettingWindowMs: 40,
    introMs: 20, seed: SEED, salt: SALT, matchId: 'm_rev', rngSeed: '00000000000000000000000000000001', mode,
    toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 10, abortGraceMs: 300, sandboxRoot: join(tmpdir(), 'fc-test-sandbox'), ...extra };
  return { stdb, deps, opts };
}
const reduceAll = (evs: FightEnvelope[]) => evs.reduce(reduceMatch as never, initialMatchState()) as ReturnType<typeof initialMatchState>;

describe('runMatch (review → result → reveal → settle)', () => {
  it('sanity: the sloppy trap answer passes live and fails final', () => {
    expect(trapP).toBeDefined();
    expect(checkLive(trapP, sloppy).ok).toBe(true);
    expect(checkFinal(trapP, sloppy).ok).toBe(false);
  });

  it('settles a mock match, overturns the trap answer, keeps Elo unchanged', async () => {
    const ti = trapP.idx;
    const { stdb, deps, opts } = setup({
      vex: [{ kind: 'submit', problem: ti, answer: sloppy }, { kind: 'submit', problem: 2, answer: ref(2) }],
      sage: [{ kind: 'submit', problem: 3, answer: ref(3) }, { kind: 'submit', problem: 4, answer: ref(4) }],
      glitch: [{ kind: 'submit', problem: 5, answer: '0' }, { kind: 'submit', problem: 5, answer: ref(5) }],
      quill: [],
    });
    const sum = await runMatch(deps, opts);
    expect(sum.status).toBe('settled');
    expect(stdb.statusOf('m_rev')).toBe('settled');
    const evs = stdb.events('m_rev');
    expect(checkInvariants(evs)).toEqual({ ok: true, violations: [] });
    const types = evs.map((e) => e.type);
    expect(types.slice(types.indexOf('match.timeup'))).toEqual([
      'match.timeup', ...types.filter((t) => t === 'verdict.final'), 'match.result', 'match.revealed', 'match.settled']);

    const finals = evs.filter((e) => e.type === 'verdict.final').map((e) => e.data as { fighterId: string; problem: number; overturned: boolean; points: number });
    expect(finals).toHaveLength(5);
    const over = finals.find((f) => f.fighterId === 'vex' && f.problem === ti)!;
    expect(over).toMatchObject({ overturned: true, points: -trapP.points });
    expect(finals.filter((f) => f.overturned)).toHaveLength(1);

    const s = reduceAll(evs);
    expect(s.status).toBe('settled');
    expect(s.standings).toEqual(sum.standings);
    expect(s.fighters.vex!.overturned).toBe(1);
    expect(s.standings!.map((x) => x.rank).sort()).toEqual([1, 2, 3, 4]);
    const pts = Object.fromEntries(sum.standings.map((x) => [x.fighterId, x.points]));
    expect(ti).toBe(1);
    expect(pts.vex).toBe(20);                      // 10 (trap, overturned) + 20 - 10
    expect(pts.sage).toBe(70);
    expect(pts.glitch).toBe(50 - 5);
    expect(sum.standings[0]!.fighterId).toBe('sage');
    expect(sum.standings.find((x) => x.fighterId === 'quill')!.firstHitMs).toBeNull();

    // markets resolved, reveal verifies, Elo untouched
    expect(sum.results.map((r) => r.marketId).sort()).toEqual(stdb.matches.get('m_rev')!.markets.map((m) => m.id).sort());
    expect(sum.results.find((r) => r.marketId.endsWith(':winner'))!.outcome).toBe('sage');
    const rv = s.reveal!;
    expect(await verifyReveal(s.commitHash!, rv.problemSet, rv.salt)).toBe(true);
    const settle = stdb.settles[0]!;
    expect(Object.fromEntries(settle.elo.map((e) => [e.fighterId, e.after]))).toEqual({ vex: 1000, sage: 1010, glitch: 1020, quill: 1030 });
    expect(settle.stats).toHaveLength(4);
    expect(existsSync(join(tmpdir(), 'fc-test-sandbox', 'fc-m_rev'))).toBe(false);
  });

  it('updates Elo (rounded integers) for a live match', async () => {
    const { stdb, deps, opts } = setup({ vex: [{ kind: 'submit', problem: 1, answer: ref(1) }], sage: [], glitch: [], quill: [] }, { matchId: 'm_live' }, 'live');
    const sum = await runMatch(deps, opts);
    const after = stdb.settles[0]!.elo;
    expect(after.every((e) => Number.isInteger(e.after))).toBe(true);
    expect(after.find((e) => e.fighterId === 'vex')!.after).toBeGreaterThan(1000);
    expect(sum.elo).toEqual(after);
    expect(stdb.settles[0]!.stats.find((x) => x.fighterId === 'vex')!.matches).toBe(1);
  });

  it('voids when review fails', async () => {
    const { stdb, deps, opts } = setup({ vex: [{ kind: 'submit', problem: 1, answer: ref(1) }], sage: [], glitch: [], quill: [] }, { matchId: 'm_bad' });
    stdb.finalizeMatch = async () => { throw new Error('finalize_down'); };
    await expect(runMatch(deps, opts)).rejects.toThrow('finalize_down');
    expect(stdb.statusOf('m_bad')).toBe('void');
    expect(checkInvariants(stdb.events('m_bad')).ok).toBe(true);
  });
});

describe('recoverOrphans', () => {
  it('voids matches left active by a previous runner', async () => {
    const { stdb, deps, opts } = setup({ vex: [], sage: [], glitch: [], quill: [] }, { matchId: 'm_old', lockEarly: true });
    stdb.startMatch = async () => { throw new Error('crash'); };
    stdb.voidMatch = async () => { throw new Error('process died'); };       // simulate: the old runner never got to void
    await expect(runMatch(deps, opts)).rejects.toThrow('crash');
    expect(stdb.statusOf('m_old')).toBe('locked');
    delete (stdb as { voidMatch?: unknown }).voidMatch;                          // back to the real prototype method
    const voided = await recoverOrphans(stdb, () => stdb.listActiveMatches(), () => {});
    expect(voided).toEqual(['m_old']);
    expect(stdb.statusOf('m_old')).toBe('void');
    expect(await recoverOrphans(stdb, undefined, () => {})).toEqual([]);
  });
});
