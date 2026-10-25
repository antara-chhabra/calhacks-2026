// Pure bet validation (PRD FC-F-106, FC-F-083, FC-N-026, §8.8). No SpacetimeDB imports so it is unit-testable.
export const MIN_STAKE_CENTS = 100n;
export const MAX_STAKE_CENTS = 2500n;
export const MAX_MARKET_CENTS = 5000n;
export const MIN_BET_GAP_MS = 150;
export const MAX_TEST_CREDIT_CENTS = 100_000n; // $1,000 per call

export type BetErrorCode =
  | 'not_registered' | 'market_locked' | 'bad_outcome' | 'bad_stake' | 'insufficient_funds'
  | 'market_cap' | 'self_bet_forbidden' | 'house_cannot_bet' | 'slow_down';

export interface BetCheckInput {
  registered: boolean;
  marketStatus: string;
  nowMicros: bigint;
  bettingClosesAtMicros: bigint;
  outcomes: readonly string[];
  outcome: string;
  stake: bigint;
  balanceCents: bigint;
  alreadyStakedInMarket: bigint;
  isCreatorOfFighterInMatch: boolean;
  isRunner: boolean;
  lastBetAtMicros?: bigint;
}

/** Returns the first failing code in §8.8 order, or null when the bet is valid. */
export function validateBet(i: BetCheckInput): BetErrorCode | null {
  if (!i.registered) return 'not_registered';
  if (i.marketStatus !== 'open' || i.nowMicros >= i.bettingClosesAtMicros) return 'market_locked';
  if (!i.outcomes.includes(i.outcome)) return 'bad_outcome';
  if (i.stake < MIN_STAKE_CENTS || i.stake > MAX_STAKE_CENTS) return 'bad_stake';
  if (i.balanceCents < i.stake) return 'insufficient_funds';
  if (i.alreadyStakedInMarket + i.stake > MAX_MARKET_CENTS) return 'market_cap';
  if (i.isCreatorOfFighterInMatch) return 'self_bet_forbidden';
  if (i.isRunner) return 'house_cannot_bet';
  if (i.lastBetAtMicros !== undefined && i.nowMicros - i.lastBetAtMicros < BigInt(MIN_BET_GAP_MS) * 1000n) return 'slow_down';
  return null;
}

/** credit_test_funds amount check. */
export function validCreditAmount(amountCents: bigint): boolean {
  return amountCents > 0n && amountCents <= MAX_TEST_CREDIT_CENTS;
}
