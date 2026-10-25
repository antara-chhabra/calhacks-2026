// Seam for K-06b (SpacetimeDB live adapter). HEAD-owned.
// The live adapter implements this and registers itself with `setLiveAdapter` (store.ts). The store delegates the
// network-backed actions to it and keeps replay fully local. The adapter writes into the store with `useStore.setState`
// and feeds cues through `emitCue` (live, post-catch-up events only; catch-up events are reduced silently and
// bump `watch.playbackRevision`, PRD §8.7 catch-up rule).
import type { FighterId, ForgeSpec } from '@fc/contracts';

export interface LiveAdapter {
  /** Open the connection; the adapter sets `conn` ('connecting' -> 'live' | 'offline'). */
  connect(): void;
  disconnect(): void;
  /** Subscribe to one match's events: catch-up (silent) then live (cues). */
  watchMatch(matchId: string): void;
  register(handle: string): Promise<void>;
  creditTestFunds(identity: string, amountCents: number): Promise<void>;
  placeBet(marketId: string, outcome: string, stake: number): Promise<void>;
  createFighter(spec: ForgeSpec): Promise<FighterId>;
}
