// Bet-slip pure logic (U-05): payout preview, stake validation, reducer error copy. No React, no store imports.
import { decimalOdds } from '@fc/engine';
import { formatCents } from '@fc/contracts';
import type { BetRow, MarketView } from '@/data/store';

export const MIN_STAKE = 100;          // FC-F-106
export const MAX_STAKE = 2500;
export const MARKET_CAP = 5000;
export const STAKE_PRESETS = [100, 500, 1000, 2500] as const;

/** PRD §10.4 copy for every §8.8 place_bet code, plus client-side codes. */
export const ERROR_COPY: Record<string, string> = {
  market_locked: 'Bets closed for this match.',
  insufficient_funds: 'Not enough balance. Add funds or bet less.',
  market_cap: 'Max $50 per market.',
  self_bet_forbidden: "You can't bet on a match your own fighter is in.",
  slow_down: 'Easy — one bet at a time.',
  bad_stake: 'Stake must be between $1 and $25.',
  bad_outcome: 'That pick is no longer available. Choose another.',
  not_registered: 'Pick a handle to start betting.',
  house_cannot_bet: 'House accounts cannot place bets.',
  not_connected: 'Replay is read-only — join a live match to bet',
};
export const GENERIC_ERROR = 'Could not place that bet. Try again.';

export function errorCopy(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  return ERROR_COPY[code] ?? GENERIC_ERROR;
}

export const PLACE_BET_CODES = ['not_registered', 'market_locked', 'bad_outcome', 'bad_stake', 'insufficient_funds', 'market_cap',
  'self_bet_forbidden', 'house_cannot_bet', 'slow_down'] as const;

/** Decimal odds for `outcome` after `stakeCents` joins its pool (parimutuel odds move as you bet). */
export function oddsWithStake(m: Pick<MarketView, 'outcomes' | 'pools' | 'rakeBps'>, outcome: string, stakeCents: number): number {
  const pools = m.outcomes.map((o) => ({ outcome: o, staked: (m.pools[o]?.staked ?? 0) + (o === outcome ? stakeCents : 0), seed: m.pools[o]?.seed ?? 0 }));
  return decimalOdds(pools, m.rakeBps)[outcome] ?? 0;
}

/** Estimated payout in cents: floor(stake × odds-with-stake). 0 when stake is 0/invalid. */
export function payoutPreview(m: Pick<MarketView, 'outcomes' | 'pools' | 'rakeBps'>, outcome: string, stakeCents: number): number {
  if (!(stakeCents > 0)) return 0;
  return Math.floor(stakeCents * oddsWithStake(m, outcome, stakeCents));
}

export const fmtOdds = (o: number): string => (o > 0 ? o.toFixed(2) : '—');

/** Implied probability %, from displayed decimal odds (1/odds), "—" for no odds. */
export const impliedPct = (o: number): string => (o > 0 ? `${Math.round(100 / o)}%` : '—');

export function myStakeInMarket(bets: BetRow[], marketId: string): number {
  return bets.filter((b) => b.mine && b.marketId === marketId && b.status === 'open').reduce((a, b) => a + b.stake, 0);
}

export type SlipCtx = { status: MarketView['status']; registered: boolean; balanceCents: number; myOpenStake: number };

/** First failing rule as inline copy, or null. Order: locked, not registered, stake range, market cap, balance. */
export function validateStake(stakeCents: number, ctx: SlipCtx): { code: string; message: string } | null {
  if (ctx.status !== 'open') return { code: 'market_locked', message: ERROR_COPY.market_locked! };
  if (!ctx.registered) return { code: 'not_registered', message: ERROR_COPY.not_registered! };
  if (!Number.isInteger(stakeCents) || stakeCents < MIN_STAKE || stakeCents > MAX_STAKE) return { code: 'bad_stake', message: ERROR_COPY.bad_stake! };
  if (ctx.myOpenStake + stakeCents > MARKET_CAP) {
    const left = Math.max(0, MARKET_CAP - ctx.myOpenStake);
    return { code: 'market_cap', message: `${ERROR_COPY.market_cap} You have ${formatCents(left)} left here.` };
  }
  if (stakeCents > ctx.balanceCents) return { code: 'insufficient_funds', message: ERROR_COPY.insufficient_funds! };
  return null;
}

/** "12", "12.5", "$12.50" → cents; NaN-safe (returns 0). */
export function parseDollars(s: string): number {
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const KIND_TABS: { kind: MarketView['kind']; label: string }[] = [
  { kind: 'winner', label: 'Winner' }, { kind: 'score_line', label: 'Score line' },
  { kind: 'beat_clock', label: 'Beat the clock' }, { kind: 'first_blood', label: 'First blood' }, { kind: 'team_winner', label: 'Team' },
];

export const STATUS_LABEL: Record<MarketView['status'] | BetRow['status'], string> = {
  open: 'Open', locked: 'Locked', settled: 'Settled', void: 'Void', won: 'Won', lost: 'Lost', refunded: 'Refunded',
};

export function outcomeLabel(o: string): string {
  return ({ over: 'Over', under: 'Under', yes: 'Yes', no: 'No', none: 'No one' } as Record<string, string>)[o] ?? o;
}
