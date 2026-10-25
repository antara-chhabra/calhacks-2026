// Market specs and seeds (PRD §11.8; HEAD decision: seed totals are dollars × 100 → cents).
import type { MarketSpec } from '@fc/contracts';
import { scoreLine, seedSplit, winProbabilities } from '@fc/engine';
import type { Candidate } from './types.js';

export const SEED_CENTS = { winner: 20000, score_line: 10000, beat_clock: 10000, first_blood: 20000 } as const;
export const RAKE_BPS = 500;
export const BEAT_CLOCK_MS = 60_000;

export function buildMarkets(matchId: string, picked: Candidate[], o: { beatClockRate?: number; scoreHistory?: Record<string, number[]> } = {}): MarketSpec[] {
  const ids = picked.map((c) => c.fighter.id);
  const elos: Record<string, number> = {};
  for (const c of picked) elos[c.fighter.id] = c.elo;
  const probs = winProbabilities(elos);

  const winner: MarketSpec = {
    id: `${matchId}:winner`, kind: 'winner', subject: null, line: null, label: 'Who wins?',
    outcomes: ids, seeds: seedSplit(ids.map((i) => probs[i]!), SEED_CENTS.winner), rakeBps: RAKE_BPS,
  };

  // Score line subject: the highest-rated fighter (ties: first in list).
  const top = picked.reduce((a, b) => (b.elo > a.elo ? b : a));
  const line = scoreLine(o.scoreHistory?.[top.fighter.id] ?? []);
  const score: MarketSpec = {
    id: `${matchId}:score_line:${top.fighter.id}`, kind: 'score_line', subject: top.fighter.id, line,
    label: `${top.fighter.name} ≥ ${Math.round(line * 100)}%`,
    outcomes: ['over', 'under'], seeds: seedSplit([0.5, 0.5], SEED_CENTS.score_line), rakeBps: RAKE_BPS,
  };

  const r = Math.min(0.9, Math.max(0.1, o.beatClockRate ?? 0.5));
  const beat: MarketSpec = {
    id: `${matchId}:beat_clock`, kind: 'beat_clock', subject: null, line: BEAT_CLOCK_MS, label: 'Anyone solves 5★ before 1:00?',
    outcomes: ['yes', 'no'], seeds: seedSplit([r, 1 - r], SEED_CENTS.beat_clock), rakeBps: RAKE_BPS,
  };

  const fbOutcomes = [...ids, 'none'];
  const first: MarketSpec = {
    id: `${matchId}:first_blood`, kind: 'first_blood', subject: null, line: null, label: 'Who draws first blood?',
    outcomes: fbOutcomes, seeds: seedSplit(fbOutcomes.map(() => 1 / fbOutcomes.length), SEED_CENTS.first_blood), rakeBps: RAKE_BPS,
  };
  return [winner, score, beat, first];
}
