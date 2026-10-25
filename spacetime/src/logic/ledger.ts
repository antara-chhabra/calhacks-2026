// The ONLY way to change player.balanceCents (FC-F-100). Other modules (settle.ts payouts/refunds, forge.ts fees) import this.
import { SenderError } from 'spacetimedb/server';
import type { Ctx } from '../auth.js';

export type LedgerReason = 'stake' | 'payout' | 'refund' | 'forge_fee' | 'deposit' | 'withdrawal' | 'test_credit';

/**
 * applyLedger(ctx, identity, deltaCents, reason, refId): applies a signed delta (bigint cents) to the player's balance,
 * inserts a ledger_tx row (at = ctx.timestamp) and returns the new balance. Throws SenderError('not_registered') if the
 * player is missing and SenderError('insufficient_funds') if the balance would go negative. Atomic with the calling reducer.
 * Stable signature: debits are negative (stake: -stake), payouts/refunds positive. refId = marketId/betId/etc.
 */
export function applyLedger(ctx: Ctx, identity: Ctx['sender'], deltaCents: bigint, reason: LedgerReason | string, refId: string): bigint {
  const p = ctx.db.player.identity.find(identity);
  if (!p) throw new SenderError('not_registered');
  const next = p.balanceCents + deltaCents;
  if (next < 0n) throw new SenderError('insufficient_funds');
  ctx.db.player.identity.update({ ...p, balanceCents: next });
  ctx.db.ledgerTx.insert({ id: 0n, identity, deltaCents, reason, refId, at: ctx.timestamp });
  return next;
}
