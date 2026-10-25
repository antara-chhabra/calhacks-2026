// R-06: recorded public events, fresh lifecycle reducers and fresh ledger settlement.
// Never repost module events, recorded bets/payouts, purse transfers, or rating changes.
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import { fightEnvelopeSchema, marketSpecSchema, RUNNER_POSTABLE, type FightEnvelope, type FightEvent } from '@fc/contracts';
import { canonicalJson, checkInvariants, resolveMarkets, verifyReveal } from '@fc/engine';
import type { Stdb } from '../stdb.js';
import { computeStandings, reduceLog } from './review.js';
import type { MatchSummary } from './lifecycle.js';

const fixtureSchema = z.object({ version: z.literal(1), matchId: z.string().min(1),
  events: z.array(fightEnvelopeSchema).min(1), markets: z.array(marketSpecSchema).min(1) });
export type DemoFixture = z.infer<typeof fixtureSchema>;
export class DemoError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const invalid = (reason: string): never => { throw new DemoError('invalid_fixture', `Invalid demo fixture: ${reason}`); };
const defaultFixtureRoot = fileURLToPath(new URL('../../../../fixtures/matches/', import.meta.url));

/** Validate before creating any match. Missing golden names never fall back to mock-basic. */
export async function validateDemoFixture(input: unknown): Promise<DemoFixture> {
  const p = fixtureSchema.safeParse(input);
  if (!p.success) return invalid('public event/market schema');
  const fx = p.data;
  const ev = fx.events;
  if (ev.some((e, i) => e.matchId !== fx.matchId || e.seq !== i + 1 || (i > 0 && e.t < ev[i - 1]!.t))) return invalid('event identity, sequence or timing');
  const inv = checkInvariants(ev);
  if (!inv.ok) return invalid(inv.violations[0] ?? 'event invariants');
  const created = ev[0];
  const reveal = ev.find((e) => e.type === 'match.revealed');
  if (created?.type !== 'match.created' || created.t !== 0 || reveal?.type !== 'match.revealed'
    || reduceLog(ev).status !== 'settled') return invalid('need a complete settled and revealed match');
  for (const type of ['match.created', 'betting.locked', 'match.started', 'match.timeup', 'match.result', 'match.revealed', 'match.settled']) {
    if (ev.filter((e) => e.type === type).length !== 1) return invalid(`need exactly one ${type}`);
  }
  if (!(await verifyReveal(created.data.commitHash, reveal.data.problemSet, reveal.data.salt))) return invalid('commitment does not verify');
  if (new Set(created.data.fighters).size !== created.data.fighters.length
    || new Set(created.data.slots).size !== created.data.slots.length
    || created.data.slots.length !== created.data.fighters.length) return invalid('fighter slots');
  if (ev.some((e) => 'fighterId' in e.data && !created.data.fighters.includes(e.data.fighterId))) return invalid('unknown fighter');
  const metas = reveal.data.problemSet.problems.map(({ idx, difficulty, points }) => ({ idx, difficulty, points }));
  if (canonicalJson(metas) !== canonicalJson(created.data.problems)) return invalid('problem metadata does not match reveal');
  if (new Set(fx.markets.map((m) => m.id)).size !== fx.markets.length
    || fx.markets.some((m) => !m.id.startsWith(`${fx.matchId}:`))) return invalid('market identity');
  return fx;
}

export async function loadDemoFixture(name: string, fixtureRoot = defaultFixtureRoot): Promise<DemoFixture> {
  if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(name)) throw new DemoError('bad_fixture_name', 'Use a bundled fixture name');
  let json: unknown;
  try { json = JSON.parse(await readFile(resolve(fixtureRoot, `${name}.json`), 'utf8')); }
  catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new DemoError('fixture_unavailable', `Demo fixture "${name}" is unavailable; no substitute was played`);
    throw new DemoError('invalid_fixture', `Cannot read demo fixture "${name}"`);
  }
  return validateDemoFixture(json);
}

export type DemoDeps = {
  stdb: Stdb;
  now?(): number;
  /** Clock injection for tests only; production always uses original timings at 1x. */
  sleep?(ms: number): Promise<void>;
  echoTimeoutMs?: number;
  log?(message: string): void;
};
export type DemoOpts = {
  fixture: string | DemoFixture;
  matchId?: string;
  signal?: AbortSignal;
  /** Called after create_match is confirmed, so Director can return the new id immediately. */
  onCreated?(matchId: string): void;
};

/** Replays through the supplied Stdb (production: real reducer connection), with no fighter sessions. */
export async function runDemoMatch(deps: DemoDeps, opts: DemoOpts): Promise<MatchSummary> {
  const fx = typeof opts.fixture === 'string' ? await loadDemoFixture(opts.fixture) : await validateDemoFixture(opts.fixture);
  const created = fx.events[0];
  const reveal = fx.events.find((e) => e.type === 'match.revealed');
  if (created?.type !== 'match.created' || reveal?.type !== 'match.revealed') return invalid('missing lifecycle');
  const matchId = opts.matchId ?? `m_demo_${randomBytes(6).toString('hex')}`;
  if (!/^[a-z0-9_-]{1,64}$/i.test(matchId) || matchId === fx.matchId) throw new DemoError('bad_match_id', 'Demo needs a fresh match id');
  if (deps.stdb.status() !== 'ok') throw new DemoError('stdb_down', 'Demo requires a connected reducer backend');
  const markets = fx.markets.map((m) => ({ ...m, id: `${matchId}${m.id.slice(fx.matchId.length)}` }));
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((done) => { setTimeout(done, ms); }));
  const stdb = deps.stdb;
  const events: FightEnvelope[] = [];
  const off = stdb.onEvent(matchId, (e) => {
    if (!events.some((old) => old.seq === e.seq)) events.push({ v: 1, ...e } as FightEnvelope);
  });
  const aborted = () => { if (opts.signal?.aborted) throw new DemoError('demo_aborted', 'Demo was cancelled'); };
  const wait = async (ms: number) => {
    const deadline = now() + Math.max(0, ms);
    while (now() < deadline) { aborted(); await sleep(Math.min(100, deadline - now())); }
    aborted();
  };
  const has = (type: FightEvent['type']) => events.some((e) => e.type === type);
  const echo = async (pred: () => boolean, type: string) => {
    const deadline = now() + (deps.echoTimeoutMs ?? 5000);
    while (!pred()) {
      aborted();
      if (now() >= deadline) throw new DemoError('demo_echo_timeout', `Demo did not receive ${type}`);
      await sleep(5);
    }
  };
  let made = false;
  let settled = false;
  let lastPost = -Infinity;
  let start = now();
  const at = async (t: number) => wait(start + t - now());
  const post = async (batch: FightEnvelope[]) => {
    await wait(lastPost + 100 - now()); // <= 10 post_events calls/s, including phase boundaries
    const seq = Math.max(0, ...events.map((e) => e.seq));
    await stdb.postEvents({ matchId, events: batch.map(({ type, data }) => ({ type, data: JSON.stringify(data) })) });
    lastPost = now();
    await echo(() => events.filter((e) => e.seq > seq).length >= batch.length, batch[0]!.type);
  };
  try {
    aborted();
    const locked = fx.events.find((e) => e.type === 'betting.locked')!;
    start = now();
    await stdb.createMatch({ id: matchId, category: created.data.category, mode: created.data.mode,
      fighterIds: created.data.fighters, slots: created.data.slots, problems: created.data.problems,
      commitHash: created.data.commitHash, timeLimitMs: created.data.timeLimitMs, isDemo: true,
      bettingWindowMs: locked.t, markets });
    made = true;
    await echo(() => has('match.created'), 'match.created');
    deps.log?.(`DEMO replay ${typeof opts.fixture === 'string' ? opts.fixture : fx.matchId} → ${matchId}`);
    opts.onCreated?.(matchId);

    for (let i = 1; i < fx.events.length; i++) {
      const e = fx.events[i]!;
      // Recorded purse transfers/transaction references and payouts are never repeated.
      if (e.type === 'purse.entry' || e.type === 'purse.paid') continue;
      await at(e.t);
      if (RUNNER_POSTABLE.includes(e.type)) {
        const batch: FightEnvelope[] = [e];
        if (e.type === 'fighter.submit') {
          const verdict = fx.events[++i]!; // validated adjacent submit/verdict by checkInvariants
          batch.push(verdict);
        }
        // Recorded module batches may contain many events with one timestamp. Preserve that
        // density within a 100ms window instead of stretching each event into its own 100ms call.
        while (batch.length < 62) {
          const next = fx.events[i + 1];
          if (!next || !RUNNER_POSTABLE.includes(next.type) || next.t >= e.t + 100) break;
          batch.push(next); i++;
          if (next.type === 'fighter.submit') batch.push(fx.events[++i]!);
        }
        await at(batch[batch.length - 1]!.t);
        await post(batch);
        continue;
      }
      switch (e.type) {
        case 'betting.locked':
          if (!has('betting.locked')) {
            try { await stdb.lockMatch({ matchId }); }
            catch (error) { // scheduled auto_lock may have won the race; accept only its actual event
              await echo(() => has('betting.locked'), 'betting.locked');
              if (!has('betting.locked')) throw error;
            }
          }
          await echo(() => has('betting.locked'), 'betting.locked');
          break;
        case 'match.started': await stdb.startMatch({ matchId }); await echo(() => has('match.started'), e.type); break;
        case 'match.timeup': await stdb.beginReview({ matchId }); await echo(() => has('match.timeup'), e.type); break;
        case 'match.result': {
          const standings = computeStandings(reduceLog(events), events, created.data.timeLimitMs,
            created.data.problems.reduce((sum, p) => sum + p.points, 0));
          await stdb.finalizeMatch({ matchId, standings });
          await echo(() => has('match.result'), e.type);
          break;
        }
        case 'match.revealed':
          await stdb.revealMatch({ matchId, problemSetJson: canonicalJson(reveal.data.problemSet), salt: reveal.data.salt });
          await echo(() => has('match.revealed'), e.type);
          break;
        case 'match.settled': {
          const violations = checkInvariants(events).violations;
          if (violations.length) throw new DemoError('demo_invariant', violations[0]!);
          const results = resolveMarkets(reduceLog(events), markets);
          // Empty updates are deliberate: unchanged Elo updates still increment matches on older modules.
          await stdb.settleMatch({ matchId, results, elo: [], stats: [] });
          settled = true;
          await echo(() => has('match.settled'), e.type);
          break;
        }
      }
    }
    const state = reduceLog(events);
    return { matchId, status: 'settled', mode: created.data.mode, isDemo: true, standings: state.standings ?? [],
      results: resolveMarkets(state, markets), elo: [], overturned: events.filter((e) => e.type === 'verdict.final' && e.data.overturned).length,
      endedBy: 'bell', invariantViolations: checkInvariants(events).violations, usage: { sessions: 0, factoryCredits: 0 } };
  } catch (error) {
    if (made && !settled) { try { await stdb.voidMatch({ matchId, reason: 'demo_failed' }); } catch { /* preserve original failure */ } }
    throw error;
  } finally { off(); }
}
