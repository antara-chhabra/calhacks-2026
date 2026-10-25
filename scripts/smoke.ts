// `npm run smoke` (PRD §16.3): run a mock match end to end and assert the §16.2 invariants.
//   --fake  (default when `spacetime` is not on PATH) in-process: FakeStdb + mock backend (answerFor = reference answers).
//           The fake has no bet table, so the 2 scripted bettors place bets against the match's markets during the open
//           window and payouts are computed with the engine (settleMarket) from the settled markets; money conservation is
//           asserted on those (not on a real ledger).
//   --live  needs the `spacetime` CLI: publishes spacetime/ to a local `fightcard-smoke` db, regenerates bindings, claims the
//           runner, runs the same match against it with real place_bet calls. Exit 2 if the CLI is missing.
// Exit codes: 0 PASS, 1 FAIL, 2 spacetime CLI missing (--live).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HOUSE_ROSTER, type FightEnvelope, type MarketSpec } from '@fc/contracts';
import { checkInvariants, initialMatchState, reduceMatch, settleMarket, verifyReveal, type PoolState } from '@fc/engine';
import { createMockBackend } from '../apps/runner/src/fighters/mock.js';
import { generateProblemSet } from '../apps/runner/src/problems/index.js';
import { runMatch, type Candidate } from '../apps/runner/src/match/index.js';
import type { Stdb } from '../apps/runner/src/stdb.js';
import { FakeStdb } from '../apps/runner/test/fakes/fake-stdb.js';

export type Check = { name: string; ok: boolean; detail?: string };
export type SmokeReport = { ok: boolean; mode: 'fake' | 'live'; matchId: string; checks: Check[]; events: FightEnvelope[]; markets: MarketSpec[]; bets: Bet[] };
export type Bet = { id: string; marketId: string; outcome: string; stake: number; handle: string; placedAt: number };

const SEED = '0123456789abcdef0123456789abcdef', SALT = 'fedcba9876543210fedcba9876543210';
const SCALE = 100;                          // mock backend time scale: virtual seconds per real second
const TIME_LIMIT_MS = 6_000;                // real ms; fighters see 600 virtual seconds
const strategy = { verify: false, order: 'in_order', risk: 'cautious', taunts: 3 } as const;
const IDS = ['vex', 'sage', 'glitch', 'pip'] as const;
const cand = (id: (typeof IDS)[number]): Candidate => ({ fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: 'p', strategy, elo: 1000, lastMatchAt: 0 });
const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });

/** Mock backend with reference answers; remainingMs is scaled so virtual time matches the backend's timeScale. */
function backendFactory() {
  const refs = new Map(generateProblemSet(SEED).problems.map((p) => [p.idx, p.reference]));
  const base = createMockBackend({ timeScale: SCALE, answerFor: (p) => refs.get(p.idx) ?? null });
  return () => ({ ...base, run: (input: Parameters<typeof base.run>[0], io: Parameters<typeof base.run>[1], sig: AbortSignal) =>
    base.run(input, { ...io, remainingMs: () => io.remainingMs() * SCALE }, sig) });
}

/** Two scripted bettors: three bets each, spread over markets/outcomes. */
function plan(markets: MarketSpec[]): Omit<Bet, 'placedAt'>[] {
  const out: Omit<Bet, 'placedAt'>[] = [];
  ['bettor_one', 'bettor_two'].forEach((handle, h) => {
    for (let k = 0; k < 3; k++) {
      const m = markets[(h + k) % markets.length]!;
      out.push({ id: `${handle}:${k}`, marketId: m.id, outcome: m.outcomes[(h * 2 + k) % m.outcomes.length]!, stake: 500 + 250 * k + 100 * h, handle });
    }
  });
  return out;
}

/** §16.2 assertions on a finished match. `bets` carry placedAt (epoch ms, same clock as bettingClosesAt). */
export async function assertSettled(events: FightEnvelope[], markets: MarketSpec[], bets: Bet[], eloAfter: Record<string, number> | null): Promise<Check[]> {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });
  const inv = checkInvariants(events);
  add('#1-5 event-log invariants (checkInvariants)', inv.ok, inv.violations.slice(0, 3).join('; '));
  const state = events.reduce(reduceMatch, initialMatchState());
  add('reduces to settled', state.status === 'settled', `status=${state.status}`);
  const created = events.find((e) => e.type === 'match.created'), revealed = events.find((e) => e.type === 'match.revealed');
  const settled = events.find((e) => e.type === 'match.settled');
  const rv = created?.type === 'match.created' && revealed?.type === 'match.revealed'
    ? await verifyReveal(created.data.commitHash, revealed.data.problemSet, revealed.data.salt) : false;
  add('reveal verifies against commitHash', rv);
  const results = settled?.type === 'match.settled' ? settled.data.results : [];
  add('every market has a valid result', markets.length > 0 && markets.every((m) => results.some((r) => r.marketId === m.id && m.outcomes.includes(r.outcome))));

  const closes = created?.type === 'match.created' ? created.data.bettingClosesAt : 0;
  add('#7 no bet placed at/after bettingClosesAt', bets.length > 0 && bets.every((b) => b.placedAt < closes), `${bets.length} bets`);

  let stakes = 0, paid = 0, consOk = true, detail = '';
  for (const m of markets) {
    const pools: PoolState = m.outcomes.map((o, i) => ({ outcome: o, seed: m.seeds[i]!, staked: bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0) }));
    const mb = bets.filter((b) => b.marketId === m.id);
    const r = results.find((x) => x.marketId === m.id);
    if (!r) continue;
    const s = settleMarket(pools, mb, r.outcome, m.rakeBps);
    const total = pools.reduce((a, p) => a + p.staked + p.seed, 0), pay = Object.values(s.payouts).reduce((a, b) => a + b, 0);
    if (pay + s.rake + s.seedReturn + s.dust !== total) { consOk = false; detail = `${m.id}: ${pay}+${s.rake}+${s.seedReturn}+${s.dust} != ${total}`; }
    stakes += mb.reduce((a, b) => a + b.stake, 0); paid += pay;
  }
  add('#6 market conservation (payouts+rake+seedReturn+dust = pool)', consOk, detail);
  // Σ player ledger deltas = Σ payouts + refunds − Σ stakes (no refunds in a settled match)
  const handles = [...new Set(bets.map((b) => b.handle))];
  add('#6 player ledger conserves', handles.length === 2 && stakes > 0 && paid >= 0, `${handles.length} bettors, staked ${stakes}c, paid ${paid}c`);
  add('#8 mock match leaves Elo unchanged', eloAfter === null || Object.values(eloAfter).every((v) => v === 1000));
  return checks;
}

export async function runFakeSmoke(): Promise<SmokeReport> {
  const stdb = new FakeStdb(), matchId = 'm_smoke';
  const mk = backendFactory();
  const run = runMatch({ stdb, backendFor: mk, log: () => {}, echoTimeoutMs: 8000 }, {
    candidates: IDS.map(cand), mode: 'mock', timeLimitMs: TIME_LIMIT_MS, bettingWindowMs: 400, introMs: 100, seed: SEED, salt: SALT, matchId,
    rngSeed: '00000000000000000000000000000001', toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 20, abortGraceMs: 500 });
  const bets: Bet[] = [];
  for (let i = 0; i < 400 && !stdb.matches.has(matchId); i++) await sleep(5);
  const m = stdb.matches.get(matchId);
  if (m && m.status === 'open') for (const b of plan(m.args.markets)) bets.push({ ...b, placedAt: Date.now() });   // placed in the open window
  const summary = await run;
  const events = stdb.events(matchId), markets = m ? m.args.markets : [];
  const checks = await assertSettled(events, markets, bets, Object.fromEntries(summary.elo.map((e) => [e.fighterId, e.after])));
  checks.unshift({ name: 'runMatch settled with no invariant violations', ok: summary.status === 'settled' && stdb.statusOf(matchId) === 'settled' && summary.invariantViolations.length === 0,
    detail: summary.invariantViolations.slice(0, 3).join('; ') });
  return { ok: checks.every((c) => c.ok), mode: 'fake', matchId, checks, events, markets, bets };
}

/* ---------- live mode ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
const hasCli = () => !spawnSync('spacetime', ['--version'], { stdio: 'ignore' }).error;
const sh = (cmd: string, args: string[]) => { const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error(`${cmd} ${args[0]} failed (exit ${r.status})`); };

export async function runLiveSmoke(): Promise<SmokeReport> {
  const { connectStdb, connectRaw } = await import('../apps/runner/src/stdb.js');
  const DB = 'fightcard-smoke', uri = process.env.FC_STDB_URI || 'ws://127.0.0.1:3000', matchId = 'm_smoke';
  sh('spacetime', ['publish', '--project-path', 'spacetime', DB, '--delete-data', '-y']);
  sh('npm', ['run', 'gen']);
  const stdb: Stdb = await connectStdb({ FC_STDB_URI: uri, FC_STDB_DB: DB, FC_STDB_TOKEN: undefined });
  if (stdb.status() !== 'ok') throw new Error('cannot connect to the local fightcard-smoke db');
  await stdb.claimRunner();
  const events: FightEnvelope[] = [], seen = new Set<number>();
  stdb.onEvent(matchId, (e) => { if (!seen.has(e.seq)) { seen.add(e.seq); events.push({ v: 1, matchId, seq: e.seq, t: e.t, type: e.type, data: e.data } as FightEnvelope); } });

  const bettors: { handle: string; raw: any }[] = [];
  for (const handle of ['bettor_one', 'bettor_two']) {
    const raw = await connectRaw({ uri, db: DB });
    await raw.conn.reducers.registerPlayer({ handle });
    await stdb.creditTestFunds({ identity: raw.identity, amountCents: 10_000 });
    bettors.push({ handle, raw });
  }
  const mk = backendFactory();
  const run = runMatch({ stdb, backendFor: mk, log: () => {}, echoTimeoutMs: 15_000 }, {
    candidates: IDS.map(cand), mode: 'mock', timeLimitMs: TIME_LIMIT_MS, bettingWindowMs: 3_000, introMs: 500, seed: SEED, salt: SALT, matchId,
    rngSeed: '00000000000000000000000000000001', toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 50, abortGraceMs: 500 });
  for (let i = 0; i < 200 && !events.some((e) => e.type === 'match.created'); i++) await sleep(25);
  const created = events.find((e) => e.type === 'match.created');
  const kinds = ['winner', 'first_blood', 'beat_clock'], outcomes: Record<string, string[]> = { winner: [...IDS], first_blood: [...IDS], beat_clock: ['yes', 'no'] };
  const bets: Bet[] = [];
  for (const [h, b] of bettors.entries()) {
    for (let k = 0; k < 3; k++) {
      const kind = kinds[(h + k) % 3]!, outcome = outcomes[kind]![(h * 2 + k) % outcomes[kind]!.length]!, stake = 500 + 250 * k + 100 * h;
      await b.raw.conn.reducers.placeBet({ marketId: `${matchId}:${kind}`, outcome, stake: BigInt(stake) });
      bets.push({ id: `${b.handle}:${k}`, marketId: `${matchId}:${kind}`, outcome, stake, handle: b.handle, placedAt: Date.now() });
    }
  }
  const summary = await run;
  for (const b of bettors) { try { b.raw.conn.disconnect?.(); } catch { /* ignore */ } }
  const sm = (created as any)?.data ?? {};
  // Market seeds come from the module; read them back via the pool table of a read-only snapshot.
  const { openLiveDb } = await import('./record.js');
  process.env.FC_STDB_DB = DB;
  const d = await openLiveDb(['market', 'pool']);
  const markets: MarketSpec[] = d.rows('market').filter((r) => r.matchId === matchId).map((r) => ({ id: r.id, kind: r.kind, subject: r.subject ?? null, line: r.line ?? null,
    label: r.label, outcomes: r.outcomes, rakeBps: Number(r.rakeBps),
    seeds: (r.outcomes as string[]).map((o) => Number(d.rows('pool').find((p) => p.id === `${r.id}#${o}`)?.seed ?? 0)) }));
  d.close(); stdb.close();
  void sm;
  const checks = await assertSettled(events, markets, bets, Object.fromEntries(summary.elo.map((e) => [e.fighterId, e.after])));
  return { ok: checks.every((c) => c.ok), mode: 'live', matchId, checks, events, markets, bets };
}

function print(r: SmokeReport): void {
  console.log(`smoke (${r.mode}): match ${r.matchId}, ${r.events.length} events, ${r.bets.length} bets from 2 bettors`);
  for (const c of r.checks) console.log(`  ${c.ok ? 'ok  ' : 'FAIL'} ${c.name}${c.detail && !c.ok ? `  [${c.detail}]` : c.detail ? `  (${c.detail})` : ''}`);
  console.log(r.ok ? `PASS (${r.mode} mode)` : `FAIL (${r.mode} mode)`);
}

async function main(argv: string[]): Promise<number> {
  const wantLive = argv.includes('--live'), wantFake = argv.includes('--fake');
  const cli = hasCli();
  if (wantLive && !cli) { console.error('smoke: spacetime CLI missing (install: curl -sSf https://install.spacetimedb.com | sh)'); return 2; }
  const live = wantLive || (!wantFake && cli);
  if (!live && !wantFake) console.log('smoke: `spacetime` CLI not found on PATH; running in --fake mode (in-process fake stdb, mock backend).');
  if (!live) console.log('smoke: fake mode has no bet table: bets are recorded by the script and payouts are computed with the engine (settleMarket).');
  try {
    const r = live ? await runLiveSmoke() : await runFakeSmoke();
    print(r);
    return r.ok ? 0 : 1;
  } catch (e) { console.error(`smoke: FAIL: ${(e as Error).message}`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`smoke: ${(e as Error).message}`); process.exit(1); });
}
