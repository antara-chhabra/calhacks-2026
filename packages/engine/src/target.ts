// Target rule (ADR-002, PRD §8.6). K-03.
import type { FighterId } from '@fc/contracts';
import type { MatchState } from './state.js';

/** Opponent (≠ attacker, status not 'out') with the most points; ties go to the lowest slot. */
export function pickTarget(s: MatchState, attacker: FighterId): FighterId {
  const pick = (skipOut: boolean): FighterId | null => {
    let best: FighterId | null = null;
    for (const id of s.order) {
      if (id === attacker) continue;
      const f = s.fighters[id];
      if (!f || (skipOut && f.status === 'out')) continue;
      if (s.category === 'squads' && s.fighters[attacker] && Math.floor(f.slot / 2) === Math.floor(s.fighters[attacker].slot / 2)) continue;
      const b = best ? s.fighters[best] : null;
      if (!b || f.points > b.points || (f.points === b.points && f.slot < b.slot)) best = id;
    }
    return best;
  };
  return pick(true) ?? pick(false) ?? attacker;
}
