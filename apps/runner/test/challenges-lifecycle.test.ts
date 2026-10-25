import { afterEach, describe, expect, it, vi } from 'vitest';
import { CATEGORY_IDS, HOUSE_ROSTER, fightEnvelopeSchema, type ProblemSet } from '@fc/contracts';
import { initialMatchState, reduceMatch, verifyReveal } from '@fc/engine';
import { runMatch } from '../src/match/lifecycle.js';
import type { Candidate } from '../src/match/types.js';
import type { FighterBackend } from '../src/fighters/types.js';
import { loadEnv } from '../src/env.js';
import { wire } from '../src/wiring.js';
import { FakeStdb } from './fakes/fake-stdb.js';
import type { WebSnapshot } from '../src/problems/web.js';

const seed = '1234567890abcdef1234567890abcdef';
const snapshot: WebSnapshot = { fetchedAt: 1770000000000, items: Array.from({ length: 5 }, (_, i) => ({ id: i + 100, title: `Story ${i}`, url: `https://example.org/${i}`, by: `author${i}`, score: 10 + i, time: 1760000000 + i, text: null })) };
const candidates: Candidate[] = (['vex', 'sage', 'glitch', 'quill'] as const).map((id) => ({ fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: '', strategy: { verify: false, order: 'in_order', risk: 'cautious', taunts: 0 }, elo: 1000, lastMatchAt: 0 }));
const databases: FakeStdb[] = [];
afterEach(() => { databases.forEach((s) => s.close()); databases.length = 0; });

function database() { const s = new FakeStdb(); databases.push(s); return s; }

describe('all challenge categories share the match pipeline', () => {
  it.each(CATEGORY_IDS)('%s commits, scores, reviews, reveals and settles without exposing its answer key', async (category) => {
    const stdb = database();
    let committed: ProblemSet | undefined;
    const backend: FighterBackend = { engine: 'mock', async run(input, io) {
      expect(input.category).toBe(category);
      expect(JSON.stringify(input)).not.toMatch(/"evaluation"|"reference"|"outputJson"|"tests":/);
      for (const publicProblem of input.problems) {
        const p = committed!.problems.find((p) => p.idx === publicProblem.idx)!;
        if (category !== 'integrals') expect(publicProblem.prompt).toBe(p.evaluation!.prompt);
        const answer = p.evaluation?.kind === 'exact' ? p.evaluation.answers[0]! : p.reference;
        expect((await io.submit(p.idx, answer)).ok).toBe(true);
      }
      return { ok: true, turns: 1, usage: null, error: null };
    } };
    const summary = await runMatch({ stdb, backendFor: () => backend, onProblemSet: (_id, set) => { committed = set; }, webSnapshot: async () => snapshot, log: () => {} }, {
      category, candidates, seed, salt: seed, rngSeed: seed, matchId: `all_${category}`, timeLimitMs: 10_000, bettingWindowMs: 10, introMs: 0, lockEarly: true, mode: 'live', flushIntervalMs: 5,
    });
    expect(summary.status).toBe('settled');
    expect(summary.invariantViolations).toEqual([]);
    expect(summary.standings.map((s) => s.points)).toEqual([150, 150, 150, 150]);
    expect(stdb.settles[0]!.stats.every((s) => s.category === category)).toBe(true);
    const events = stdb.events(`all_${category}`);
    events.forEach((e) => expect(fightEnvelopeSchema.safeParse(e).success).toBe(true));
    const state = events.reduce(reduceMatch, initialMatchState());
    expect(state.category).toBe(category);
    expect(await verifyReveal(state.commitHash!, state.reveal!.problemSet, state.reveal!.salt)).toBe(true);
    expect(summary.results).toHaveLength(category === 'squads' ? 5 : 4);
    if (category === 'squads') {
      expect(summary.results.find((r) => r.marketId.endsWith(':team_winner'))?.outcome).toMatch(/^team_[ab]$/);
      const m = stdb.matches.get(`all_${category}`)!.args;
      const teamMarket = m.markets.find((m) => m.kind === 'team_winner')!;
      for (const [i, id] of m.fighterIds.entries()) {
        const teamText = teamMarket.label.split(' vs ')[m.slots[i]! < 2 ? 0 : 1]!;
        expect(teamText).toContain(HOUSE_ROSTER[id as keyof typeof HOUSE_ROSTER].name);
      }
    }
  });

  it('overturns code that passes the quick examples but fails a hidden edge case', async () => {
    const stdb = database();
    const flawed = '(input) => input.values.length === 1 ? 0 : input.values.reduce((a,b)=>a+b,0)';
    const backend: FighterBackend = { engine: 'mock', async run(_input, io) {
      expect((await io.submit(1, flawed)).ok).toBe(true);
      return { ok: true, turns: 1, usage: null, error: null };
    } };
    const summary = await runMatch({ stdb, backendFor: () => backend, log: () => {} }, { category: 'code', candidates, seed, salt: seed, matchId: 'code_var', timeLimitMs: 10_000, bettingWindowMs: 10, introMs: 0, lockEarly: true });
    expect(summary.overturned).toBe(4);
    expect(summary.standings.every((s) => s.points === 0 && s.overturned === 1)).toBe(true);
  });

  it('rejects unavailable live-web data before opening a market and releases the active slot', async () => {
    const stdb = database();
    const env = loadEnv({ FC_ENGINE: 'mock', FC_MODE: 'live', FC_DIRECTOR_TOKEN: 'd'.repeat(32) });
    const rt = await wire(env, { stdb, webSnapshot: async () => { throw new Error('source offline'); }, log: () => {}, matchOpts: { timeLimitMs: 20, bettingWindowMs: 10, introMs: 0, lockEarly: true }, mockTimeScale: 1_000_000 });
    await expect(rt.director.startMatch({ category: 'web' })).rejects.toMatchObject({ code: 'challenge_unavailable', status: 503 });
    expect(stdb.matches.size).toBe(0);
    const { matchId } = await rt.director.startMatch({ category: 'speed-math' });
    expect(stdb.matches.get(matchId)!.args.category).toBe('speed-math');
    await rt.shutdown();
  });
});
