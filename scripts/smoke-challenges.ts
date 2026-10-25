// Exercise every challenge through one actual local SpacetimeDB ledger. Never targets Maincloud by default.
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORY_IDS, type Category, type ProblemSet } from '@fc/contracts';
import { checkInvariants, initialMatchState, reduceMatch, verifyReveal } from '@fc/engine';
import { connectRaw, connectStdb } from '../apps/runner/src/stdb.js';
import { loadEnv } from '../apps/runner/src/env.js';
import { loadHouseCandidates } from '../apps/runner/src/candidates.js';
import { runMatch } from '../apps/runner/src/match/lifecycle.js';
import { getBackend } from '../apps/runner/src/fighters/registry.js';
import type { FighterBackend } from '../apps/runner/src/fighters/types.js';

const root = resolve(import.meta.dirname, '..');
const uri = 'ws://127.0.0.1:3000';
const db = 'fightcard-challenges';
const privatePath = resolve(root, '.arena/challenges-runner.json');
const real = process.argv.includes('--real');
const requested = process.argv.find((x) => x.startsWith('--categories='))?.split('=')[1]?.split(',');
const categories = requested ? CATEGORY_IDS.filter((c) => requested.includes(c)) : CATEGORY_IDS;
if (!categories.length || requested?.some((c) => !CATEGORY_IDS.includes(c as Category))) throw new Error('Unknown category');
const token = existsSync(privatePath) ? JSON.parse(readFileSync(privatePath, 'utf8')).token as string : undefined;
const runner = await connectRaw({ uri, db, token });
if (!token) {
  await runner.conn.reducers.claimRunner();
  mkdirSync(resolve(root, '.arena'), { recursive: true });
  writeFileSync(privatePath, JSON.stringify({ token: runner.token }), { mode: 0o600 });
}
const env = loadEnv({ ...process.env, FC_ENGINE: real ? 'droid' : 'mock', FC_DIRECTOR_TOKEN: 'local-smoke-only-token-for-tests', FC_STDB_URI: uri, FC_STDB_DB: db, FC_STDB_TOKEN: runner.token });
const stdb = await connectStdb(env);
if (stdb.status() !== 'ok') throw new Error('Challenge module unavailable');
const people: Awaited<ReturnType<typeof connectRaw>>[] = [];
const wait = async (test: () => boolean, message: string, timeout = 10_000) => {
  const end = Date.now() + timeout;
  while (!test()) { if (Date.now() >= end) throw new Error(`timeout: ${message}`); await new Promise((r) => setTimeout(r, 15)); }
};
const subset = loadHouseCandidates(env).filter((c) => ['vex', 'sage', 'brick', 'quill'].includes(c.fighter.id));
for (const c of subset) await stdb.upsertHouseFighter({ fighter: { ...c.fighter, strategy: c.strategy, tier: c.tier ?? 'standard' } });
try {
  for (let i = 0; i < 2; i++) {
    const p = await connectRaw({ uri, db }); people.push(p);
    await new Promise<void>((resolve, reject) => p.conn.subscriptionBuilder().onApplied(() => resolve()).onError(() => reject(new Error('player subscription failed'))).subscribe(['SELECT * FROM player', 'SELECT * FROM match', 'SELECT * FROM market', 'SELECT * FROM bet']));
    await p.conn.reducers.registerPlayer({ handle: `fan${Date.now().toString(36)}${i}` });
    await stdb.creditTestFunds({ identity: p.identity, amountCents: 20_000 });
    await wait(() => [...p.conn.db.player.iter()].some((r: any) => r.identity.toHexString() === p.identity && Number(r.balanceCents) === 20_000), 'player credit');
  }
  const balance = (p: typeof runner) => Number([...p.conn.db.player.iter()].find((r: any) => r.identity.toHexString() === p.identity).balanceCents);
  const reports = [];
  for (const category of categories) {
    const id = `challenge_${category}_${Date.now().toString(36)}`;
    let set: ProblemSet;
    const backend: FighterBackend = { engine: 'mock', async run(input, io) {
      // The reference backend is explicit MOCK data and may not change ratings.
      const cap = { vex: 5, sage: 4, brick: 2, quill: 0 }[input.fighter.id] ?? 0;
      for (const p of set!.problems.slice(0, cap)) await io.submit(p.idx, p.evaluation?.kind === 'exact' ? p.evaluation.answers[0]! : p.reference);
      return { ok: true, turns: 1, usage: null, error: null };
    } };
    const events: any[] = [];
    const off = stdb.onEvent(id, (e) => events.push({ ...e, v: 1 }));
    const before = people.map(balance);
    const done = runMatch({ stdb, backendFor: (c) => real ? getBackend(c.engine) : backend,
      history: (fid, cat = 'integrals') => stdb.fighterHistory!(fid, cat), onProblemSet: (_id, ps) => { set = ps; } }, {
      category, candidates: subset, matchId: id, mode: real ? 'live' : 'mock', bettingWindowMs: 1500, introMs: 0,
      timeLimitMs: real ? 60_000 : 10_000,
    });
    // Consume rejection immediately so a startup source failure cannot become unhandled while waiting for a market.
    let failure: unknown; void done.catch((e) => { failure = e; });
    await wait(() => failure !== undefined || [...people[0]!.conn.db.match.iter()].some((m: any) => m.id === id && m.status === 'open'), 'match opening', 15_000);
    if (failure) throw failure;
    const marketId = category === 'squads' ? `${id}:team_winner` : `${id}:winner`;
    const market = [...people[0]!.conn.db.market.iter()].find((m: any) => m.id === marketId);
    const picks = [market.outcomes[0], market.outcomes[1]];
    await Promise.all(people.map((p, i) => p.conn.reducers.placeBet({ marketId, outcome: picks[i], stake: BigInt(300 + i * 200) })));
    const result = await done;
    await wait(() => people.every((p) => [...p.conn.db.bet.iter()].filter((b: any) => b.matchId === id).every((b: any) => b.status !== 'open')), 'settlement');
    const state = events.reduce(reduceMatch, initialMatchState());
    if (!checkInvariants(events).ok || !await verifyReveal(state.commitHash!, state.reveal!.problemSet, state.reveal!.salt)) throw new Error('Invalid log/reveal');
    people.forEach((p, i) => {
      const bet = [...p.conn.db.bet.iter()].find((b: any) => b.matchId === id && b.bettor.toHexString() === p.identity);
      if (balance(p) !== before[i]! - Number(bet.stake) + Number(bet.payout)) throw new Error('Ledger payout mismatch');
    });
    const report = { category, matchId: id, mode: real ? 'live' : 'mock', events: events.length, standings: result.standings.map((s) => ({ fighter: s.fighterId, points: s.points })), markets: result.results.length, ledger: 'pass', reveal: 'pass' };
    reports.push(report); console.log(JSON.stringify(report)); off();
    if (real) {
      // A second connection proves that persisted category histories survive reconnects.
      const reconnected = await connectStdb(env);
      for (const s of result.standings) if (!reconnected.fighterHistory!(s.fighterId, category).entries.some((e) => e.matchId === id)) throw new Error('Persisted category history missing');
      reconnected.close();
    }
  }
  const output = resolve(root, real ? '.arena/challenges-smoke-live.json' : '.arena/challenges-smoke-mock.json');
  writeFileSync(output, JSON.stringify({ mode: real ? 'live' : 'mock', reports }, null, 2));
  console.log(`PASS ${reports.length} challenge categories, 2 independent bettors, actual ledger settlement`);
} finally { people.forEach((p) => p.conn.disconnect()); runner.conn.disconnect(); stdb.close(); }
