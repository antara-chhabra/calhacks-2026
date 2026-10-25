// The only cross-workstream calls in the web app (PRD §8.7). Tiny typed emitter.
import type { FighterId } from '@fc/contracts';

export type BridgeEvents = {
  selectFighter: { fighterId: FighterId | null };   // arena click or plate click
  openCard: { fighterId: FighterId };               // opens the card modal (O2)
  focusFighter: { fighterId: FighterId };           // UI → arena camera nudge (O1, optional)
};

type Handler<K extends keyof BridgeEvents> = (p: BridgeEvents[K]) => void;
const handlers = new Map<keyof BridgeEvents, Set<(p: never) => void>>();

export const bridge = {
  on<K extends keyof BridgeEvents>(k: K, f: Handler<K>): () => void {
    let set = handlers.get(k);
    if (!set) handlers.set(k, (set = new Set()));
    set.add(f);
    return () => { set.delete(f); };
  },
  emit<K extends keyof BridgeEvents>(k: K, p: BridgeEvents[K]): void {
    (handlers.get(k) as Set<Handler<K>> | undefined)?.forEach((f) => f(p));
  },
};
