// Market seeding and resolution (PRD §8.3, §11.8, FC-F-102..104). K-04.
import type { FighterId, MarketSpec } from '@fc/contracts';
import type { MatchState } from './state.js';

/** Bradley–Terry: pᵢ = 10^(Rᵢ/400) / Σⱼ 10^(Rⱼ/400). Computed relative to the max rating for numeric stability. */
export function winProbabilities(elos: Record<FighterId, number>): Record<FighterId, number> {
  const ids = Object.keys(elos) as FighterId[];
  const out = {} as Record<FighterId, number>;
  if (ids.length === 0) return out;
  const max = Math.max(...ids.map((i) => elos[i]));
  const w = ids.map((i) => Math.pow(10, (elos[i] - max) / 400));
  const sum = w.reduce((a, b) => a + b, 0);
  ids.forEach((id, i) => { out[id] = w[i] / sum; });
  return out;
}

const SEED_MIN = 50;

/** Integer cents summing exactly to total; each ≥ 50 when total ≥ 50 × n (otherwise as equal as possible). Largest-remainder rounding. */
export function seedSplit(probs: number[], total: number): number[] {
  const n = probs.length;
  if (n === 0) return [];
  const min = total >= SEED_MIN * n ? SEED_MIN : Math.floor(total / n);
  const free = total - min * n;
  const ps = probs.map((p) => (Number.isFinite(p) && p > 0 ? p : 0));
  const ps_sum = ps.reduce((a, b) => a + b, 0);
  const norm = ps_sum > 0 ? ps.map((p) => p / ps_sum) : ps.map(() => 1 / n);
  const raw = norm.map((p) => p * free);
  const out = raw.map((r) => Math.floor(r));
  let left = free - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % n, left--) out[order[k].i]++;
  return out.map((v) => v + min);
}

/** FC-F-102: median of the last 10 values (scorePct 0..1), rounded to the nearest 0.05, clamped to [0.2, 0.9]; fewer than 5 values (provisional) → 0.5. */
export function scoreLine(history: number[]): number {
  if (history.length < 5) return 0.5;
  const h = history.slice(-10).sort((a, b) => a - b);
  const m = h.length % 2 ? h[(h.length - 1) / 2] : (h[h.length / 2 - 1] + h[h.length / 2]) / 2;
  const r = Math.round(m * 20 + 1e-9) / 20;
  return Math.min(0.9, Math.max(0.2, Math.round(r * 100) / 100));
}

export function resolveMarkets(state: MatchState, markets: MarketSpec[]): { marketId: string; outcome: string }[] {
  const res: { marketId: string; outcome: string }[] = [];
  const fighters = Object.values(state.fighters);
  const winnerId = (): FighterId | null => {
    const s = state.standings?.find((x) => x.rank === 1);
    if (s) return s.fighterId;
    return fighters.find((f) => f.rank === 1)?.id ?? null;
  };
  // All hits that survived the final check (not overturned), earliest first (ties → lowest slot).
  const hits = fighters.flatMap((f) => Object.entries(f.solved).map(([idx, s]) => ({ fighter: f, idx: Number(idx), s: s! })))
    .filter((h) => h.s.final !== 'overturned')
    .sort((a, b) => a.s.atMs - b.s.atMs || a.fighter.slot - b.fighter.slot);
  for (const m of markets) {
    let outcome: string | null = null;
    switch (m.kind) {
      case 'winner': outcome = winnerId(); break;
      case 'team_winner': { const w = winnerId(); outcome = w && m.outcomes.includes(w) ? w : null; break; }
      case 'score_line': {
        const pct = state.standings?.find((x) => x.fighterId === m.subject)?.scorePct;
        if (pct !== undefined && m.line !== null) outcome = pct >= m.line ? 'over' : 'under';
        break;
      }
      case 'beat_clock': {
        const line = m.line ?? 60000;
        const five = new Set(state.problems.filter((p) => p.difficulty === 5).map((p) => p.idx));
        if (five.size === 0) five.add(5);
        outcome = hits.some((h) => five.has(h.idx as 5) && h.s.atMs < line) ? 'yes' : 'no';
        break;
      }
      case 'first_blood': outcome = hits.length ? hits[0].fighter.id : 'none'; break;
    }
    if (outcome !== null) res.push({ marketId: m.id, outcome });
  }
  return res;
}
