// Betting and ledger reducers (PRD §8.8). B-03.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema.js';
import { isRunner, requirePlayer, requireRunner } from './auth.js';
import { applyLedger } from './logic/ledger.js';
import { validateBet, validCreditAmount } from './logic/bets.js';

// The module has no env: money mode is treated as 'ledger'. Live mode would need a config.moneyMode column (see docs/requests/O3.md).
export const credit_test_funds = spacetimedb.reducer({ name: 'credit_test_funds' },
  { identity: t.identity(), amountCents: t.u64() }, (ctx, { identity, amountCents }) => {
    requireRunner(ctx);
    if (!validCreditAmount(amountCents)) throw new SenderError('bad_amount');
    if (!ctx.db.player.identity.find(identity)) throw new SenderError('not_registered');
    applyLedger(ctx, identity, amountCents, 'test_credit', 'test_credit');
  });

export const place_bet = spacetimedb.reducer({ name: 'place_bet' },
  { marketId: t.string(), outcome: t.string(), stake: t.u64() }, (ctx, { marketId, outcome, stake }) => {
    const player = requirePlayer(ctx); // not_registered
    const market = ctx.db.market.id.find(marketId);
    if (!market) throw new SenderError('market_locked'); // unknown market: nothing to bet on; no extra code in §8.8
    const match = ctx.db.match.id.find(market.matchId);
    if (!match) throw new SenderError('market_locked');

    let already = 0n;
    for (const b of ctx.db.bet.marketId.filter(marketId)) {
      if (b.bettor.isEqual(ctx.sender) && b.status !== 'void') already += b.stake;
    }
    // Ledger (play-money) mode: creators may bet on any market of a match their fighter is in. With real stakes this
    // must be restricted again (conflict of interest: a creator could bet against a fighter they control).
    const isCreator = false;

    const err = validateBet({
      registered: true,
      marketStatus: market.status === 'open' && match.status === 'open' ? 'open' : 'locked',
      nowMicros: ctx.timestamp.microsSinceUnixEpoch,
      bettingClosesAtMicros: match.bettingClosesAt.microsSinceUnixEpoch,
      outcomes: market.outcomes,
      outcome,
      stake,
      balanceCents: player.balanceCents,
      alreadyStakedInMarket: already,
      isCreatorOfFighterInMatch: isCreator,
      isRunner: isRunner(ctx),
      lastBetAtMicros: player.lastBetAt?.microsSinceUnixEpoch,
    });
    if (err) throw new SenderError(err);

    applyLedger(ctx, ctx.sender, -stake, 'stake', marketId);
    const fresh = ctx.db.player.identity.find(ctx.sender)!;
    ctx.db.player.identity.update({ ...fresh, lastBetAt: ctx.timestamp });
    ctx.db.bet.insert({
      id: 0n, marketId, matchId: market.matchId, bettor: ctx.sender, handle: player.handle,
      outcome, stake, placedAt: ctx.timestamp, status: 'open', payout: 0n,
    });
    const pool = ctx.db.pool.id.find(`${marketId}#${outcome}`);
    if (!pool) throw new SenderError('bad_outcome');
    ctx.db.pool.id.update({ ...pool, staked: pool.staked + stake, bettors: pool.bettors + (already === 0n ? 1 : 0) });
  });
