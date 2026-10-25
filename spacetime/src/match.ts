// Match lifecycle reducers (PRD §8.8). B-02. Rules live in logic/match.ts; every event goes through appendEvent.
import { ScheduleAt, SenderError, t } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
import spacetimedb, { lockTimer } from './schema.js';
import type { Ctx } from './auth.js';
import { getConfig, requireRunner } from './auth.js';
import { appendEvent } from './events.js';
import { applyLedger } from './logic/ledger.js';
import { MarketSpec, PostedEvent, ProblemMeta, Standing } from './types.js';
import {
  canTransition, checkPostedBatch, entryId, poolId, poolsSnapshot, seedToCents, standingToEvent, validateCreateMatch,
  validateStandings, winnerOf,
} from './logic/match.js';

function loadMatch(ctx: Ctx, matchId: string) {
  const m = ctx.db.match.id.find(matchId);
  if (!m) throw new SenderError('no_match');
  return m;
}

/** open -> locked: markets locked, betting.locked appended. */
function doLock(ctx: Ctx, matchId: string) {
  const m = loadMatch(ctx, matchId);
  if (!canTransition(m.status, 'locked')) throw new SenderError('bad_transition');
  const pools: { marketId: string; outcome: string; staked: bigint }[] = [];
  for (const mk of ctx.db.market.matchId.filter(matchId)) {
    ctx.db.market.id.update({ ...mk, status: 'locked' });
    for (const p of ctx.db.pool.marketId.filter(mk.id)) pools.push({ marketId: mk.id, outcome: p.outcome, staked: p.staked });
  }
  ctx.db.match.id.update({ ...loadMatch(ctx, matchId), status: 'locked' });
  appendEvent(ctx, matchId, 'betting.locked', { pools: poolsSnapshot(pools) });
}

export const create_match = spacetimedb.reducer({ name: 'create_match' }, {
  id: t.string(), category: t.string(), mode: t.string(), isDemo: t.bool(),
  fighterIds: t.array(t.string()), slots: t.array(t.u8()), problems: t.array(ProblemMeta), commitHash: t.string(),
  bettingWindowMs: t.u32(), timeLimitMs: t.u32(), markets: t.array(MarketSpec),
}, (ctx, a) => {
  requireRunner(ctx);
  for (const m of ctx.db.match.iter()) if (m.status === 'open') throw new SenderError('match_active');
  if (ctx.db.match.id.find(a.id)) throw new SenderError('match_exists');
  const bad = validateCreateMatch(a);
  if (bad) throw new SenderError(bad);

  const cfg = getConfig(ctx);
  const number = cfg.matchCounter + 1;
  ctx.db.config.id.update({ ...cfg, matchCounter: number });

  const createdAt = ctx.timestamp;
  const closeMicros = createdAt.microsSinceUnixEpoch + BigInt(a.bettingWindowMs) * 1000n;
  ctx.db.match.insert({
    id: a.id, number, category: a.category, status: 'open', mode: a.mode, isDemo: a.isDemo,
    fighterIds: a.fighterIds, slots: a.slots, problems: a.problems, commitHash: a.commitHash,
    createdAt, bettingClosesAt: new Timestamp(closeMicros), startedAt: undefined, endedAt: undefined,
    timeLimitMs: a.timeLimitMs, winnerId: undefined, voidReason: undefined, lastSeq: 0,
  });

  a.fighterIds.forEach((fighterId, i) => {
    ctx.db.entry.insert({
      id: entryId(a.id, fighterId), matchId: a.id, fighterId, slot: a.slots[i]!, teamId: a.category === 'squads' ? (a.slots[i]! < 2 ? 'team_a' : 'team_b') : undefined,
      rank: undefined, points: 0, scorePct: 0, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0,
      firstHitMs: undefined, lastScoreMs: undefined, clutchPoints: 0, missesRecovered: 0,
      eloBefore: ctx.db.fighterCategoryStats.id.find(`${fighterId}:${a.category}`)?.elo
        ?? (a.category === 'integrals' ? ctx.db.fighter.id.find(fighterId)?.elo ?? 1000 : 1000), eloAfter: undefined, wonAtOdds: undefined,
    });
  });

  for (const mk of a.markets) {
    ctx.db.market.insert({
      id: mk.id, matchId: a.id, kind: mk.kind, subject: mk.subject, line: mk.line, label: mk.label,
      outcomes: mk.outcomes, status: 'open', result: undefined, rakeBps: mk.rakeBps,
    });
    mk.outcomes.forEach((outcome, i) => {
      ctx.db.pool.insert({ id: poolId(mk.id, outcome), marketId: mk.id, outcome, staked: 0n, seed: seedToCents(mk.seeds[i]!), bettors: 0 });
    });
  }

  ctx.db.lockTimer.insert({ scheduledId: 0n, scheduledAt: ScheduleAt.time(closeMicros), matchId: a.id });

  appendEvent(ctx, a.id, 'match.created', {
    category: a.category, mode: a.mode, isDemo: a.isDemo, fighters: a.fighterIds, slots: Array.from(a.slots),
    problems: a.problems, commitHash: a.commitHash, bettingClosesAt: a.bettingWindowMs, timeLimitMs: a.timeLimitMs,
  });
});

// Scheduled -> auto_lock. A match the runner already locked (or voided) makes the timer a no-op.
export const auto_lock = spacetimedb.reducer({ name: 'auto_lock', onSchedule: lockTimer },
  { timer: lockTimer.rowType }, (ctx, { timer }) => {
    const m = ctx.db.match.id.find(timer.matchId);
    if (!m || m.status !== 'open') return;
    doLock(ctx, m.id);
  });

export const lock_match = spacetimedb.reducer({ name: 'lock_match' }, { matchId: t.string() }, (ctx, { matchId }) => {
  requireRunner(ctx);
  doLock(ctx, matchId);
});

export const start_match = spacetimedb.reducer({ name: 'start_match' }, { matchId: t.string() }, (ctx, { matchId }) => {
  requireRunner(ctx);
  const m = loadMatch(ctx, matchId);
  if (!canTransition(m.status, 'live')) throw new SenderError('bad_transition');
  ctx.db.match.id.update({ ...m, status: 'live', startedAt: ctx.timestamp });
  appendEvent(ctx, matchId, 'match.started', {});
});

export const post_events = spacetimedb.reducer({ name: 'post_events' },
  { matchId: t.string(), events: t.array(PostedEvent) }, (ctx, { matchId, events }) => {
    requireRunner(ctx);
    const m = loadMatch(ctx, matchId);
    const check = checkPostedBatch(m.status, events);
    if (!check.ok) throw new SenderError(check.code);
    for (const e of events) appendEvent(ctx, matchId, e.type, JSON.parse(e.data));
  });

export const begin_review = spacetimedb.reducer({ name: 'begin_review' }, { matchId: t.string() }, (ctx, { matchId }) => {
  requireRunner(ctx);
  const m = loadMatch(ctx, matchId);
  if (!canTransition(m.status, 'review')) throw new SenderError('bad_transition');
  ctx.db.match.id.update({ ...m, status: 'review', endedAt: ctx.timestamp });
  appendEvent(ctx, matchId, 'match.timeup', {});
});

export const finalize_match = spacetimedb.reducer({ name: 'finalize_match' },
  { matchId: t.string(), standings: t.array(Standing) }, (ctx, { matchId, standings }) => {
    requireRunner(ctx);
    const m = loadMatch(ctx, matchId);
    if (m.status !== 'review') throw new SenderError('bad_transition');
    const entries = [...ctx.db.entry.matchId.filter(matchId)];
    if (entries.some((e) => e.rank !== undefined)) throw new SenderError('bad_transition');   // already finalized
    if (validateStandings(entries.map((e) => e.fighterId), standings)) throw new SenderError('bad_standings');
    for (const s of standings) {
      const e = ctx.db.entry.id.find(entryId(matchId, s.fighterId))!;
      ctx.db.entry.id.update({
        ...e, rank: s.rank, points: s.points, scorePct: s.scorePct, hits: s.hits, misses: s.misses, overturned: s.overturned,
        yellow: s.yellow, red: s.red, firstHitMs: s.firstHitMs, lastScoreMs: s.lastScoreMs,
        clutchPoints: s.clutchPoints, missesRecovered: s.missesRecovered,
      });
    }
    ctx.db.match.id.update({ ...m, winnerId: winnerOf(standings) });
    appendEvent(ctx, matchId, 'match.result', { standings: standings.map(standingToEvent) });
  });

export const reveal_match = spacetimedb.reducer({ name: 'reveal_match' },
  { matchId: t.string(), problemSetJson: t.string(), salt: t.string() }, (ctx, { matchId, problemSetJson, salt }) => {
    requireRunner(ctx);
    const m = loadMatch(ctx, matchId);
    if (m.status !== 'review' && m.status !== 'settled') throw new SenderError('bad_transition');
    let problemSet: unknown;
    try { problemSet = JSON.parse(problemSetJson); } catch { throw new SenderError('bad_event'); }
    if (!salt) throw new SenderError('bad_event');
    appendEvent(ctx, matchId, 'match.revealed', { problemSet, salt });   // the module checks nothing else (FC-F-081)
  });

export const void_match = spacetimedb.reducer({ name: 'void_match' },
  { matchId: t.string(), reason: t.string() }, (ctx, { matchId, reason }) => {
    requireRunner(ctx);
    const m = loadMatch(ctx, matchId);
    if (!canTransition(m.status, 'void')) throw new SenderError('bad_transition');
    for (const b of ctx.db.bet.matchId.filter(matchId)) {
      if (b.status !== 'open') continue;
      const p = ctx.db.player.identity.find(b.bettor);
      if (p) {
        applyLedger(ctx, b.bettor, b.stake, 'refund', String(b.id));
      }
      ctx.db.bet.id.update({ ...b, status: 'refunded', payout: b.stake });
    }
    for (const mk of ctx.db.market.matchId.filter(matchId)) ctx.db.market.id.update({ ...mk, status: 'void' });
    ctx.db.match.id.update({ ...m, status: 'void', voidReason: reason, endedAt: m.endedAt ?? ctx.timestamp });
    appendEvent(ctx, matchId, 'match.void', { reason });
  });
