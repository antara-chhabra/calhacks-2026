// FC-F-002: rotation. Active fighters by lastMatchAt ascending (ties: seeded RNG), debutPending first,
// at most `communitySlots` non-house fighters.
import type { Slot } from '@fc/contracts';
import type { Candidate } from './types.js';

export function pickFighters(cands: Candidate[], rnd: () => number, communitySlots = 1, count = 4): { picked: Candidate[]; slots: Slot[] } {
  const pool = cands.filter((c) => c.active !== false);
  // Shuffle first so the stable sort below breaks ties by the seeded RNG.
  const shuffled = pool.map((c) => ({ c, k: rnd() })).sort((a, b) => a.k - b.k).map((x) => x.c);
  const ordered = shuffled.sort((a, b) =>
    Number(!!b.debutPending) - Number(!!a.debutPending) || a.lastMatchAt - b.lastMatchAt);
  const picked: Candidate[] = [];
  let community = 0;
  for (const c of ordered) {
    if (picked.length >= count) break;
    const isCommunity = c.origin !== 'house';
    if (isCommunity && community >= communitySlots) continue;
    if (isCommunity) community++;
    picked.push(c);
  }
  if (picked.length < count) throw new Error('not_enough_fighters');
  // Seeded slot shuffle (Fisher–Yates), slots 0..3.
  const slots: Slot[] = [0, 1, 2, 3].slice(0, count) as Slot[];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return { picked, slots };
}
