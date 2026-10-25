import { describe, it, expect } from 'vitest';
import { checkInvariants, initialMatchState, reduceMatch, verifyReveal } from '@fc/engine';
import { HOUSE_ROSTER, type FightEnvelope } from '@fc/contracts';
import { generateProblemSet } from '../src/problems/index.js';
import { runMatchUntilReview, type Candidate } from '../src/match/index.js';
import { FakeStdb } from './fakes/fake-stdb.js';
import { fakeFighter, type FakeFighter, type Step } from './fakes/fake-fighter.js';

const SEED = '0123456789abcdef0123456789abcdef';
const SALT = 'fedcba9876543210fedcba9876543210';
const set = generateProblemSet(SEED);
const ref = (n: 1 | 2 | 3 | 4 | 5) => set.problems[n - 1]!.reference;
const strategy = { verify: false, order: 'in_order', risk: 'cautious', taunts: 3 } as const;
const cand = (id: keyof typeof HOUSE_ROSTER, elo = 1000): Candidate => ({
  fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: 'p', strategy, elo, lastMatchAt: 0,
});

function setup(scripts: Record<string, Step[]>, extra: Record<string, unknown> = {}) {
  const stdb = new FakeStdb();
  const fighters: Record<string, FakeFighter> = {};
  for (const [id, steps] of Object.entries(scripts)) fighters[id] = fakeFighter(steps);
  const deps = { stdb, backendFor: (c: Candidate) => fighters[c.fighter.id]!, log: () => {} };
  const opts = { candidates: (['vex', 'sage', 'glitch', 'quill'] as const).map((i) => cand(i)), timeLimitMs: 700, bettingWindowMs: 40,
    introMs: 20, seed: SEED, salt: SALT, matchId: 'm_test', rngSeed: '00000000000000000000000000000001',
    toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 10, abortGraceMs: 300, ...extra };
  return { stdb, fighters, deps, opts };
}

describe('runMatchUntilReview', () => {
  it('runs a full mock match to review with a valid event log', async () => {
    const { stdb, fighters, deps, opts } = setup({
      vex: [{ kind: 'think' }, { kind: 'tool', label: 'python3 check https://x.io/a' }, { kind: 'say', text: 'Kneel. see https://evil.example now, claude' },
        { kind: 'submit', problem: 1, answer: ref(1) }, { kind: 'submit', problem: 2, answer: 'x+garbage((' }, { kind: 'submit', problem: 2, answer: ref(2) },
        { kind: 'submit', problem: 1, answer: ref(1) }],
      sage: [{ kind: 'submit', problem: 1, answer: '0' }, { kind: 'submit', problem: 1, answer: '0' }, { kind: 'submit', problem: 1, answer: '0' },
        { kind: 'submit', problem: 1, answer: ref(1) }],
      glitch: [{ kind: 'deny' }, { kind: 'submit', problem: 3, answer: ref(3) }, { kind: 'deny' }, { kind: 'deny' }, { kind: 'wait', ms: 5 }, { kind: 'submit', problem: 4, answer: ref(4) }],
      quill: [{ kind: 'wait', ms: 50 }, { kind: 'hang' }],
    });
    const rec = await runMatchUntilReview(deps, opts);
    expect(stdb.statusOf('m_test')).toBe('review');
    expect(rec.endedBy).toBe('bell');
    const evs = stdb.events('m_test');
    const types = evs.map((e) => e.type);
    expect(types.slice(0, 4)).toEqual(['match.created', 'betting.locked', 'match.intro', 'match.started']);
    expect(types.at(-1)).toBe('match.timeup');
    expect(checkInvariants(evs)).toEqual({ ok: true, violations: [] });

    let s = initialMatchState();
    for (const e of evs) s = reduceMatch(s, e as FightEnvelope);
    expect(s.status).toBe('review');
    expect(s.fighters.vex!.points).toBe(10 + 20 - 5);
    expect(s.fighters.vex!.attempts[2]).toBe(2);
    expect(s.fighters.sage!.points).toBe(-15);             // 3 misses; 4th attempt unscored
    expect(s.fighters.sage!.misses).toBe(3);
    expect(s.fighters.glitch!.yellow).toBe(2);
    expect(s.fighters.glitch!.red).toBe(1);
    expect(s.fighters.glitch!.status).toBe('out');
    expect(s.fighters.glitch!.points).toBe(30 - 10);       // red keeps points; P4 after red not scored
    expect(s.fighters.glitch!.solved[4]).toBeUndefined();

    // agent-facing messages
    expect(fighters.vex!.verdicts[0]!.message).toBe(`HIT on P1: +10 (live check passed). Final review happens after time.`);
    expect(fighters.vex!.verdicts[1]!.message).toContain('could not parse');
    expect(fighters.vex!.verdicts[3]!.message).toBe('HIT on P1: answer replaced (attempt 2/3). Points unchanged.');
    expect(fighters.sage!.verdicts[3]!.message).toBe('No attempts left on P1.');
    expect(fighters.sage!.verdicts[2]!.message).toContain('Attempts left: 0');

    // filtering
    const say = evs.find((e) => e.type === 'fighter.say')!.data as { text: string };
    expect(say.text).not.toMatch(/https?:|claude/i);
    const tool = evs.find((e) => e.type === 'fighter.tool')!.data as { label: string };
    expect(tool.label).not.toMatch(/https?:/);

    // submit+verdict in the same batch; batches ≤ 64
    for (const b of stdb.postBatches) {
      expect(b.types.length).toBeLessThanOrEqual(64);
      b.types.forEach((t, i) => { if (t === 'fighter.submit') expect(b.types[i + 1]).toBe('verdict.live'); });
    }

    // record for R-02b
    expect(rec.problemSet).toEqual(set);
    expect(rec.answers.vex![1]!.answer).toBe(ref(1));
    expect(rec.answers.glitch![3]).toBeDefined();
    expect(rec.outcomes.quill!.state).toBe('running');
    expect(rec.outcomes.glitch!.outReason).toBe('red_card');
    expect(rec.outcomes.vex!.state).toBe('done');
    expect(await verifyReveal(rec.commitHash, rec.problemSet, rec.salt)).toBe(true);
    expect(fighters.vex!.prewarmed).toBe(true);
    // markets (cents)
    const sum = (id: string) => rec.markets.find((m) => m.kind === id)!.seeds.reduce((a, b) => a + b, 0);
    expect([sum('winner'), sum('score_line'), sum('beat_clock'), sum('first_blood')]).toEqual([20000, 10000, 10000, 20000]);
  });

  it('ends early when every fighter is finished', async () => {
    const { stdb, deps, opts } = setup({ vex: [{ kind: 'think' }], sage: [], glitch: [], quill: [] }, { timeLimitMs: 5000 });
    const t0 = Date.now();
    const rec = await runMatchUntilReview(deps, opts);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(rec.endedBy).toBe('all_finished');
    const evs = stdb.events('m_test');
    expect(evs.filter((e) => e.type === 'fighter.done')).toHaveLength(4);
    expect(checkInvariants(evs).ok).toBe(true);
  });

  it('voids the match when a stage fails', async () => {
    const { stdb, deps, opts } = setup({ vex: [], sage: [], glitch: [], quill: [] });
    stdb.startMatch = async () => { throw new Error('nope'); };
    await expect(runMatchUntilReview(deps, opts)).rejects.toThrow('nope');
    expect(stdb.statusOf('m_test')).toBe('void');
  });

  it('records crashes as fighter.out', async () => {
    const { stdb, deps, opts } = setup({ vex: [{ kind: 'throw' }], sage: [], glitch: [], quill: [] });
    await runMatchUntilReview(deps, opts);
    const out = stdb.events('m_test').find((e) => e.type === 'fighter.out')!.data;
    expect(out).toEqual({ fighterId: 'vex', reason: 'crash' });
  });
});
