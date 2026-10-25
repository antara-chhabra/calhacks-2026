// Settlement and purse reducers (PRD §8.8). B-04.
import { SenderError, t } from 'spacetimedb/server';
import type { Identity } from 'spacetimedb';
import spacetimedb from './schema.js';
import { EloUpdate, FighterStatsObj, MarketResult } from './types.js';
import { requireRunner, getConfig } from './auth.js';
import { appendEvent } from './events.js';
import { applyLedger } from './logic/ledger.js';
import { creditsByBettor, nextFighterStatus, ovrFromElo, planMarket, type MarketPlan } from './logic/settle.js';

export const settle_match = spacetimedb.reducer({ name: 'settle_match' }, {
  matchId: t.string(), results: t.array(MarketResult), elo: t.array(EloUpdate), stats: t.array(FighterStatsObj),
}, (ctx, { matchId, results, elo, stats }) => {
  requireRunner(ctx);
  const m = ctx.db.match.id.find(matchId);
  if (!m) throw new SenderError('no_match');
  if (m.status !== 'review') throw new SenderError('bad_status');

  // 1. Markets: settle each result over its pools and open bets.
  const plans: MarketPlan[] = [];
  const seen = new Set<string>();
  const identities = new Map<string, Identity>();
  for (const r of results) {
    if (seen.has(r.marketId)) throw new SenderError('bad_result');
    seen.add(r.marketId);
    const mk = ctx.db.market.id.find(r.marketId);
    if (!mk || mk.matchId !== matchId) throw new SenderError('no_market');
    if (!mk.outcomes.includes(r.outcome)) throw new SenderError('bad_outcome');
    const pools = [...ctx.db.pool.marketId.filter(mk.id)];
    const bets = [...ctx.db.bet.marketId.filter(mk.id)].filter((b) => b.status === 'open');
    const plan = planMarket({
      marketId: mk.id, rakeBps: mk.rakeBps, result: r.outcome,
      pools: pools.map((p) => ({ outcome: p.outcome, staked: p.staked, seed: p.seed })),
      bets: bets.map((b) => ({ id: b.id, bettor: b.bettor.toHexString(), outcome: b.outcome, stake: b.stake })),
    });
    plans.push(plan);
    for (const b of bets) identities.set(b.bettor.toHexString(), b.bettor);
    for (const b of bets) {
      const o = plan.bets.find((x) => x.id === b.id)!;
      ctx.db.bet.id.update({ ...b, status: o.status, payout: o.payout });
    }
    ctx.db.market.id.update({ ...mk, status: 'settled', result: r.outcome });
  }

  // 1b. A market of this match with no result is voided: its open bets are refunded, so no stake is left stranded.
  for (const mk of ctx.db.market.matchId.filter(matchId)) {
    if (seen.has(mk.id) || mk.status === 'settled' || mk.status === 'void') continue;
    for (const b of ctx.db.bet.marketId.filter(mk.id)) {
      if (b.status !== 'open') continue;
      applyLedger(ctx, b.bettor, b.stake, 'refund', mk.id);
      ctx.db.bet.id.update({ ...b, status: 'refunded' });
    }
    ctx.db.market.id.update({ ...mk, status: 'void' });
  }

  // 2. Credits through the ledger (one row per bettor), treasury gets rake + seed return + dust.
  for (const [hex, cents] of creditsByBettor(plans)) {
    applyLedger(ctx, identities.get(hex)!, cents, 'payout', matchId);
  }
  let treasury = 0n;
  let totalPaid = 0n;
  for (const p of plans) { treasury += p.treasury; totalPaid += p.paid; }
  const cfg = getConfig(ctx);
  ctx.db.config.id.update({ ...cfg, treasuryCents: cfg.treasuryCents + treasury });

  // 3. Fighters: elo, matches, lastMatchAt, debutPending, provisional -> active.
  const eloEvt: Record<string, [number, number]> = {};
  const ovrEvt: Record<string, [number, number]> = {};
  for (const u of elo) {
    const f = ctx.db.fighter.id.find(u.fighterId);
    if (!f) throw new SenderError('no_fighter');
    const matches = f.matches + 1;
    eloEvt[f.id] = [f.elo, u.after];
    ovrEvt[f.id] = [ovrFromElo(f.elo), ovrFromElo(u.after)];
    ctx.db.fighter.id.update({
      ...f, elo: u.after, matches, lastMatchAt: ctx.timestamp, debutPending: false, status: nextFighterStatus(f.status, matches),
    });
    const e = ctx.db.entry.id.find(`${matchId}:${f.id}`);
    if (e) ctx.db.entry.id.update({ ...e, eloAfter: u.after });
  }

  // 4. fighter_stats upsert.
  for (const s of stats) {
    if (ctx.db.fighterStats.fighterId.find(s.fighterId)) ctx.db.fighterStats.fighterId.update(s);
    else ctx.db.fighterStats.insert(s);
  }

  ctx.db.match.id.update({ ...ctx.db.match.id.find(matchId)!, status: 'settled' });
  appendEvent(ctx, matchId, 'match.settled', {
    results: results.map((r) => ({ marketId: r.marketId, outcome: r.outcome })),
    totalPaid: Number(totalPaid), elo: eloEvt, ovr: ovrEvt,
  });
});

export const record_purse = spacetimedb.reducer({ name: 'record_purse' }, {
  matchId: t.string(), fighterId: t.string(), kind: t.string(), amountUsdc: t.f64(), txRef: t.string(),
  network: t.string(), coveredByHouse: t.bool(), to: t.string(),
}, (ctx, a) => {
  requireRunner(ctx);
  const m = ctx.db.match.id.find(a.matchId);
  if (!m) throw new SenderError('no_match');
  if (!ctx.db.fighter.id.find(a.fighterId)) throw new SenderError('no_fighter');
  if (a.kind !== 'entry' && a.kind !== 'payout') throw new SenderError('bad_kind');
  if (a.kind === 'entry' && m.status !== 'locked' && m.status !== 'live') throw new SenderError('bad_status');
  if (a.kind === 'payout' && m.status !== 'settled') throw new SenderError('bad_status');
  ctx.db.purse.insert({
    id: 0n, matchId: a.matchId, fighterId: a.fighterId, kind: a.kind, amountUsdc: a.amountUsdc, txRef: a.txRef,
    network: a.network, coveredByHouse: a.coveredByHouse, at: ctx.timestamp,
  });
  if (a.kind === 'entry') {
    appendEvent(ctx, a.matchId, 'purse.entry', {
      fighterId: a.fighterId, amountUsdc: a.amountUsdc, txRef: a.txRef === '' ? null : a.txRef, coveredByHouse: a.coveredByHouse,
    });
  } else {
    appendEvent(ctx, a.matchId, 'purse.paid', { fighterId: a.fighterId, amountUsdc: a.amountUsdc, txHash: a.txRef, to: a.to });
    const st = ctx.db.fighterStats.fighterId.find(a.fighterId);
    if (st) ctx.db.fighterStats.fighterId.update({ ...st, earningsUsdc: st.earningsUsdc + a.amountUsdc });
  }
});

export const set_fighter_wallet = spacetimedb.reducer({ name: 'set_fighter_wallet' },
  { fighterId: t.string(), address: t.string() }, (ctx, { fighterId, address }) => {
    requireRunner(ctx);
    const f = ctx.db.fighter.id.find(fighterId);
    if (!f) throw new SenderError('no_fighter');
    ctx.db.fighter.id.update({ ...f, walletAddress: address });
  });
