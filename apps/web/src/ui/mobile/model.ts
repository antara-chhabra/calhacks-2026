// Mobile /m view model (U-08). Pure helpers, no React, no store access.
import type { MatchStatus } from '@fc/contracts';
import { MAX_STAKE, MIN_STAKE } from '@/ui/betslip/logic';

export type MobileView = 'bet' | 'live' | 'result';

/** BET while betting is open, RESULT once settled/void, otherwise LIVE (locked, live, VAR review). */
export function pickView(status: MatchStatus | null | undefined): MobileView {
  if (status === 'settled' || status === 'void') return 'result';
  if (status === 'locked' || status === 'live' || status === 'review') return 'live';
  return 'bet';
}

export const STAKE_STEP = 100;                 // $1 slider steps
export const QUICK_STAKES = [100, 500, 1000, 2500] as const;

/** Clamp to [$1, $25] and snap to whole dollars; non-finite input falls back to the minimum. */
export function clampStake(cents: number): number {
  if (!Number.isFinite(cents)) return MIN_STAKE;
  const snapped = Math.round(cents / STAKE_STEP) * STAKE_STEP;
  return Math.min(MAX_STAKE, Math.max(MIN_STAKE, snapped));
}

/** Pick the winner market: kind 'winner' belonging to `matchId` (id prefix), else any winner market. */
export function winnerMarket<M extends { id: string; kind: string }>(markets: Record<string, M>, matchId: string | null): M | null {
  const all = Object.values(markets).filter((m) => m.kind === 'winner');
  return all.find((m) => matchId !== null && m.id.startsWith(`${matchId}:`)) ?? all[0] ?? null;
}

/** Bars scale to the leader (min 2% so empty bars still render a sliver). */
export function barPct(points: number, max: number): number {
  return max > 0 ? Math.max(2, Math.round((points / max) * 100)) : 2;
}

/** Betting is only possible against a live adapter (not replay) while the market is open. */
export function canBet(conn: string, marketStatus: string | undefined): boolean {
  return conn === 'live' && marketStatus === 'open';
}
