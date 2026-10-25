// Reducers and views (PRD §8.8). B-01 implements init / claim_runner / register_player; the other
// reducers live in match.ts (B-02), bets.ts (B-03), settle.ts (B-04) and forge.ts (B-05), one file per card.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb, { fighterSecret, ledgerTx } from './schema.js';
import { applyLedger } from './logic/ledger.js';

const DEMO_WELCOME_CENTS = 10_000n;      // $100
const DEMO_TOPUP_BELOW_CENTS = 1_000n;   // $10

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
  // Ledger (play-money) mode: every new player starts with demo funds so betting works without an operator.
  applyLedger(ctx, ctx.sender, DEMO_WELCOME_CENTS, 'test_credit', 'welcome');
});

/** Ledger-mode demo top-up: a player below $10 can refill +$100. Recorded as test_credit, like the Director's credit. */
export const claim_demo_funds = spacetimedb.reducer({ name: 'claim_demo_funds' }, {}, (ctx) => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player) throw new SenderError('not_registered');
  if (player.balanceCents >= DEMO_TOPUP_BELOW_CENTS) throw new SenderError('balance_not_low');
  applyLedger(ctx, ctx.sender, DEMO_WELCOME_CENTS, 'test_credit', 'demo_topup');
});

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
