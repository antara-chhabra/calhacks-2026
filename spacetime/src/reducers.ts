// Reducers and views (PRD §8.8). B-01 implements init / claim_runner / register_player; the rest are stubs that
// throw SenderError('not_implemented') with the final argument shapes (B-02..B-05 fill them in).
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb, { fighterSecret, lockTimer, ledgerTx } from './schema.js';
import { EloUpdate, FighterStatsObj, ForgeSpec, HouseFighterInput, MarketResult, MarketSpec, PostedEvent, ProblemMeta, Standing } from './types.js';

const notImplemented = (): never => { throw new SenderError('not_implemented'); };

// ---- lifecycle ----
export const init = spacetimedb.init((ctx) => {
  ctx.db.config.insert({ id: 0, runner: undefined, season: 0, treasuryCents: 0n, matchCounter: 0 });
});

// ---- implemented in B-01 ----
export const claim_runner = spacetimedb.reducer({ name: 'claim_runner' }, {}, (ctx) => {
  const cfg = ctx.db.config.id.find(0);
  if (!cfg) {
    ctx.db.config.insert({ id: 0, runner: ctx.sender, season: 0, treasuryCents: 0n, matchCounter: 0 });
    return;
  }
  if (cfg.runner !== undefined && cfg.runner !== null) throw new SenderError('runner_already_set');
  ctx.db.config.id.update({ ...cfg, runner: ctx.sender });
});

const HANDLE_RE = /^[A-Za-z0-9_]{3,16}$/;
export const register_player = spacetimedb.reducer({ name: 'register_player' }, { handle: t.string() }, (ctx, { handle }) => {
  if (ctx.db.player.identity.find(ctx.sender)) throw new SenderError('already_registered');
  if (!HANDLE_RE.test(handle)) throw new SenderError('bad_handle');
  if (ctx.db.player.handle.find(handle)) throw new SenderError('handle_taken');
  ctx.db.player.insert({ identity: ctx.sender, handle, balanceCents: 0n, createdAt: ctx.timestamp, lastBetAt: undefined });
});

// ---- stubs (exact names + argument shapes) ----
export const credit_test_funds = spacetimedb.reducer({ name: 'credit_test_funds' },
  { identity: t.identity(), amountCents: t.u64() }, notImplemented);                                        // B-03
export const place_bet = spacetimedb.reducer({ name: 'place_bet' },
  { marketId: t.string(), outcome: t.string(), stake: t.u64() }, notImplemented);                            // B-03
export const create_fighter = spacetimedb.reducer({ name: 'create_fighter' }, { spec: ForgeSpec }, notImplemented);   // B-05
export const retire_fighter = spacetimedb.reducer({ name: 'retire_fighter' }, { fighterId: t.string() }, notImplemented); // B-05
export const set_payout_address = spacetimedb.reducer({ name: 'set_payout_address' },
  { fighterId: t.string(), address: t.string() }, notImplemented);                                            // B-05
export const upsert_house_fighter = spacetimedb.reducer({ name: 'upsert_house_fighter' },
  { fighter: HouseFighterInput }, notImplemented);                                                            // B-02
export const create_match = spacetimedb.reducer({ name: 'create_match' }, {
  id: t.string(), category: t.string(), mode: t.string(), isDemo: t.bool(),
  fighterIds: t.array(t.string()), slots: t.array(t.u8()), problems: t.array(ProblemMeta), commitHash: t.string(),
  bettingWindowMs: t.u32(), timeLimitMs: t.u32(), markets: t.array(MarketSpec),
}, notImplemented);                                                                                           // B-02

// Scheduled → auto_lock. The scheduler passes the lock_timer row.
export const auto_lock = spacetimedb.reducer({ name: 'auto_lock', onSchedule: lockTimer },
  { timer: lockTimer.rowType }, notImplemented);                                                              // B-02
export const lock_match = spacetimedb.reducer({ name: 'lock_match' }, { matchId: t.string() }, notImplemented);   // B-02
export const start_match = spacetimedb.reducer({ name: 'start_match' }, { matchId: t.string() }, notImplemented); // B-02
export const post_events = spacetimedb.reducer({ name: 'post_events' },
  { matchId: t.string(), events: t.array(PostedEvent) }, notImplemented);                                     // B-02
export const begin_review = spacetimedb.reducer({ name: 'begin_review' }, { matchId: t.string() }, notImplemented); // B-02
export const finalize_match = spacetimedb.reducer({ name: 'finalize_match' },
  { matchId: t.string(), standings: t.array(Standing) }, notImplemented);                                     // B-02
export const reveal_match = spacetimedb.reducer({ name: 'reveal_match' },
  { matchId: t.string(), problemSetJson: t.string(), salt: t.string() }, notImplemented);                     // B-02
export const settle_match = spacetimedb.reducer({ name: 'settle_match' }, {
  matchId: t.string(), results: t.array(MarketResult), elo: t.array(EloUpdate), stats: t.array(FighterStatsObj),
}, notImplemented);                                                                                           // B-04
export const void_match = spacetimedb.reducer({ name: 'void_match' },
  { matchId: t.string(), reason: t.string() }, notImplemented);                                               // B-04
export const record_purse = spacetimedb.reducer({ name: 'record_purse' }, {
  matchId: t.string(), fighterId: t.string(), kind: t.string(), amountUsdc: t.f64(), txRef: t.string(),
  network: t.string(), coveredByHouse: t.bool(), to: t.string(),
}, notImplemented);                                                                                           // B-04
export const set_fighter_wallet = spacetimedb.reducer({ name: 'set_fighter_wallet' },
  { fighterId: t.string(), address: t.string() }, notImplemented);                                            // B-04

// ---- views ----
// Views must be `public: true` in the SDK; privacy comes from filtering on ctx.sender.
export const my_ledger_tx = spacetimedb.view({ name: 'my_ledger_tx', public: true }, t.array(ledgerTx.rowType),
  (ctx) => [...ctx.db.ledgerTx.identity.filter(ctx.sender)]);

export const runner_fighter_secrets = spacetimedb.view({ name: 'runner_fighter_secrets', public: true }, t.array(fighterSecret.rowType),
  (ctx) => {
    const cfg = ctx.db.config.id.find(0);
    if (!cfg || !cfg.runner || !cfg.runner.isEqual(ctx.sender)) return [];
    return [...ctx.db.fighterSecret.iter()];
  });
