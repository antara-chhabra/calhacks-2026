// Money (PRD FC-F-100, ADR-024, Amendment A1). Every amount is integer US cents.
// FundingAdapter is named by A1 but not yet specified in §8.9; this is HEAD's stub shape until the PRD defines it.
export type MoneyMode = 'ledger' | 'live';
export const LEDGER_MODE_LABEL = 'Ledger mode · no funds moved';

export type LedgerReason = 'stake' | 'payout' | 'refund' | 'forge_fee' | 'deposit' | 'withdrawal' | 'test_credit';

export interface FundingAdapter {
  readonly mode: MoneyMode;
  /** Live mode only. Blocked until Q-011 (rail) and Q-012 (compliance) are decided. */
  deposit(identity: string, amountCents: number): Promise<{ ok: true; ref: string } | { ok: false; reason: string }>;
  withdraw(identity: string, amountCents: number): Promise<{ ok: true; ref: string } | { ok: false; reason: string }>;
}

/** 1250 → "$12.50"; −505 → "−$5.05". */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}
