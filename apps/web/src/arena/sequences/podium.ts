// Podium handoff (FC-F-127): the arena tells the DOM match screen when the outro is done and results may be revealed.
// Two seams, no ArenaCanvas signature change: a tiny store (getPodium/subscribePodium) and a DOM CustomEvent 'fc:podium' on window.
//   window.addEventListener('fc:podium', (e) => { const { revealed, winner, matchId, instant } = (e as CustomEvent<PodiumInfo>).detail; ... })
// `instant` = reached by a catch-up snap (seek / join late): reveal without any transition.
import type { FighterId } from '@fc/contracts';

export const PODIUM_EVENT = 'fc:podium';
export interface PodiumInfo { revealed: boolean; winner: FighterId | null; matchId: string | null; instant: boolean }

const IDLE: PodiumInfo = { revealed: false, winner: null, matchId: null, instant: false };
let current: PodiumInfo = IDLE;
const subs = new Set<(p: PodiumInfo) => void>();

export const getPodium = (): PodiumInfo => current;
export function subscribePodium(f: (p: PodiumInfo) => void): () => void { subs.add(f); return () => { subs.delete(f); }; }

/** Arena-side: publish a change (no-op when nothing changed). */
export function setPodium(next: PodiumInfo): void {
  if (next.revealed === current.revealed && next.winner === current.winner && next.matchId === current.matchId && next.instant === current.instant) return;
  current = next;
  subs.forEach((f) => { f(next); });
  const w = (globalThis as { window?: EventTarget }).window;
  if (w && typeof CustomEvent !== 'undefined') w.dispatchEvent(new CustomEvent<PodiumInfo>(PODIUM_EVENT, { detail: next }));
}
