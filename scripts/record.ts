// `npm run record -- <matchId> <name>` (FC-F-243): export a settled match to fixtures/matches/<name>.json (MockBasicFixture shape).
//   --from-log <file>   build the fixture from a saved event-log JSON instead of the live stdb:
//                       { matchId, events: FightEnvelope[], markets: MarketSpec[], bets?: FixtureBet[], fighters?: FighterPublic[], number?: number }
// Output never contains tokens or model ids: only public match data.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HOUSE_ROSTER, type FightEnvelope, type FighterPublic, type MarketSpec, type ProblemSet, type Standing } from '@fc/contracts';
import { initialMatchState, reduceMatch, resolveMarkets, settleMarket, verifyReveal, type PoolState } from '@fc/engine';
import { connectRaw } from '../apps/runner/src/stdb.js';
import type { FixtureBet, MockBasicFixture } from './gen-mock-basic.js';

export type MatchLog = {
  matchId: string; events: FightEnvelope[]; markets: MarketSpec[]; bets?: FixtureBet[]; fighters?: FighterPublic[]; number?: number;
};

/** Build a fixture from a settled event log. Throws a clear Error if the log is not a settled, revealed, verifiable match. */
export async function buildFixtureFromLog(log: MatchLog): Promise<MockBasicFixture> {
  const events = [...log.events].sort((a, b) => a.seq - b.seq);
  const find = <T extends FightEnvelope['type']>(t: T) => events.find((e) => e.type === t) as Extract<FightEnvelope, { type: T }> | undefined;
  const created = find('match.created'), revealed = find('match.revealed'), result = find('match.result'), settled = find('match.settled');
  if (!created) throw new Error('log has no match.created');
  if (!settled || !result || !revealed) throw new Error('match is not settled (need match.result, match.revealed and match.settled)');
  const problemSet = revealed.data.problemSet as ProblemSet, salt = revealed.data.salt;
  if (!(await verifyReveal(created.data.commitHash, problemSet, salt))) throw new Error('reveal does not verify against commitHash');

  const state = events.reduce(reduceMatch, initialMatchState());
  if (state.status !== 'settled') throw new Error(`log reduces to "${state.status}", not settled`);

  const fighters = created.data.fighters.map((id) => {
    const f = log.fighters?.find((x) => x.id === id) ?? (HOUSE_ROSTER as Record<string, FighterPublic>)[id];
    if (!f) throw new Error(`no public fighter data for ${id}: pass "fighters" in the log`);
    return f;
  });
  const bets = log.bets ?? [];
  const results = settled.data.results;
  const payouts: MockBasicFixture['expected']['payouts'] = {};
  for (const m of log.markets) {
    const pools: PoolState = m.outcomes.map((o, i) => ({ outcome: o, seed: m.seeds[i]!,
      staked: bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0) }));
    const r = results.find((x) => x.marketId === m.id);
    if (!r) throw new Error(`no result for market ${m.id}`);
    const res = settleMarket(pools, bets.filter((b) => b.marketId === m.id), r.outcome, m.rakeBps);
    payouts[m.id] = { ...res, total: pools.reduce((a, p) => a + p.staked + p.seed, 0) };
  }
  return { version: 1, matchId: log.matchId, number: log.number ?? 1, fighters, markets: log.markets, problemSet, salt, events, bets,
    expected: { standings: result.data.standings as Standing[], results, payouts } };
}

/* ---------- live stdb reads (shared with scripts/recompute.ts) ---------- */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const num = (x: unknown): number => (typeof x === 'bigint' ? Number(x) : (x as number));
export const opt = <T>(x: T | null | undefined): T | null => (x === undefined ? null : x);
/** SDK Timestamp (or micros bigint) to epoch ms. */
export const tms = (x: any): number => (x == null ? 0 : typeof x.toMillis === 'function' ? Number(x.toMillis()) : Math.floor(num(x.microsSinceUnixEpoch ?? x) / 1000));

export type LiveDb = { rows: (table: string) => any[]; close: () => void };
/** Connect read-only and snapshot the named tables (camelCase accessors, e.g. 'fightEvent'). Throws Error('stdb_down: ...') if unavailable. */
export async function openLiveDb(tables: string[]): Promise<LiveDb> {
  const uri = process.env.FC_STDB_URI || 'ws://127.0.0.1:3000', db = process.env.FC_STDB_DB || 'fightcard';
  let raw;
  try { raw = await connectRaw({ uri, db, token: process.env.FC_STDB_TOKEN || undefined }); }
  catch (e) { throw new Error(`stdb_down: cannot read ${uri} (${db}): ${(e as Error).message}`); }
  const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error('stdb_down: subscription timeout')), 15_000);
    raw.conn.subscriptionBuilder().onApplied(() => { clearTimeout(t); res(); }).onError(() => { clearTimeout(t); rej(new Error('stdb_down: subscription error')); })
      .subscribe(tables.map((x) => `SELECT * FROM ${snake(x)}`));
  });
  return { rows: (t) => [...raw.conn.db[t].iter()], close: () => { try { raw.conn.disconnect?.(); } catch { /* ignore */ } } };
}

export async function readMatchLog(matchId: string): Promise<MatchLog> {
  const d = await openLiveDb(['match', 'market', 'pool', 'bet', 'fightEvent', 'fighter']);
  try {
    const m = d.rows('match').find((r) => r.id === matchId);
    if (!m) throw new Error(`match ${matchId} not found`);
    if (m.status !== 'settled') throw new Error(`match ${matchId} is "${m.status}", not settled`);
    const events = d.rows('fightEvent').filter((r) => r.matchId === matchId).sort((a, b) => num(a.seq) - num(b.seq))
      .map((r) => ({ v: 1, matchId, seq: num(r.seq), t: num(r.t), type: r.type, data: JSON.parse(r.data) }) as FightEnvelope);
    const pools = d.rows('pool');
    const markets: MarketSpec[] = d.rows('market').filter((r) => r.matchId === matchId).map((r) => ({
      id: r.id, kind: r.kind, subject: opt(r.subject), line: opt(r.line), label: r.label, outcomes: r.outcomes,
      seeds: (r.outcomes as string[]).map((o) => num(pools.find((p) => p.id === `${r.id}#${o}`)?.seed ?? 0)), rakeBps: num(r.rakeBps) }));
    const bets: FixtureBet[] = d.rows('bet').filter((r) => r.matchId === matchId).map((r) => ({
      id: `b${num(r.id)}`, marketId: r.marketId, outcome: r.outcome, stake: num(r.stake), handle: r.handle }));
    const fighters: FighterPublic[] = d.rows('fighter').filter((r) => (m.fighterIds as string[]).includes(r.id)).map((r) => ({
      id: r.id, name: r.name, title: r.title, archetype: r.archetype, skin: r.skin, catchphrase: r.catchphrase, bio: r.bio, strategyBlurb: r.strategyBlurb }));
    return { matchId, events, markets, bets, fighters, number: num(m.number) };
  } finally { d.close(); }
}

async function main(argv: string[]): Promise<number> {
  const args = argv.slice();
  const fi = args.indexOf('--from-log');
  const fromLog = fi >= 0 ? args.splice(fi, 2)[1] : null;
  const [matchId, name] = fromLog ? [undefined, args[0]] : args;
  if ((!fromLog && !matchId) || !name || (fi >= 0 && !fromLog)) {
    console.error('usage: npm run record -- <matchId> <name>\n       npm run record -- --from-log <log.json> <name>');
    return 1;
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) { console.error(`record: bad fixture name "${name}"`); return 1; }
  try {
    let log: MatchLog;
    if (fromLog) {
      if (!existsSync(fromLog)) throw new Error(`log file not found: ${fromLog}`);
      log = JSON.parse(readFileSync(fromLog, 'utf8')) as MatchLog;
    } else log = await readMatchLog(matchId!);
    const fx = await buildFixtureFromLog(log);
    const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'matches', `${name}.json`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(fx, null, 2) + '\n');
    console.log(`record: wrote ${out} (${fx.events.length} events, ${fx.markets.length} markets, ${fx.bets.length} bets)`);
    return 0;
  } catch (e) {
    const msg = (e as Error).message;
    console.error(msg.startsWith('stdb_down') ? `record: ${msg}. Is \`spacetime start\` running and the module published? (or use --from-log)` : `record: ${msg}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`record: ${(e as Error).message}`); process.exit(1); });
}
