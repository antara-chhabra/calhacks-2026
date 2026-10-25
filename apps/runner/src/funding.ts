// Funding rail (FC-F-100, ADR-024). H0 runs FC_MONEY_MODE=ledger only: no funds move.
import type { FundingAdapter, MoneyMode } from '@fc/contracts';

export function createFunding(mode: MoneyMode): FundingAdapter {
  const blocked = async () => ({ ok: false as const, reason: mode === 'ledger' ? 'ledger_mode' : 'live_mode_blocked' });
  return { mode, deposit: blocked, withdraw: blocked };   // live is blocked until Q-011/Q-012
}
