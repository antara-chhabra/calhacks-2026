// Review phase (R-02b): strict final check (the VAR), then standings exactly as the engine reducer sees the log.
import type { FightEnvelope, FighterId, ProblemIdx, Standing } from '@fc/contracts';
import { initialMatchState, reduceMatch, type MatchState } from '@fc/engine';
import { checkFinal } from '../problems/index.js';
import type { Stdb } from '../stdb.js';
import type { MatchRecord } from './types.js';

export type FinalVerdict = { fighterId: FighterId; problem: ProblemIdx; overturned: boolean; points: number };

/** checkFinal on every fighter's latest accepted answer. points = overturned ? −accepted points : 0 (PRD §8.5.1, FC-F-023). */
export function finalVerdicts(rec: MatchRecord): FinalVerdict[] {
  const out: FinalVerdict[] = [];
  for (const fighterId of rec.fighters) {
    const acc = rec.answers[fighterId] ?? {};
    for (const p of rec.problemSet.problems) {
      const a = acc[p.idx];
      if (!a) continue;
      const overturned = !checkFinal(p, a.answer).ok;
      out.push({ fighterId, problem: p.idx, overturned, points: overturned ? -a.points : 0 });
    }
  }
  return out;
}

/** Post verdict.final events in batches of ≤ 64 while the match is in review. */
export async function postFinalVerdicts(stdb: Stdb, matchId: string, vs: FinalVerdict[]): Promise<void> {
  for (let i = 0; i < vs.length; i += 64) {
    const events = vs.slice(i, i + 64).map((v) => ({ type: 'verdict.final', data: JSON.stringify(v) }));
    await stdb.postEvents({ matchId, events });
  }
}

export function reduceLog(events: FightEnvelope[]): MatchState {
  let s = initialMatchState();
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) s = reduceMatch(s, e);
  return s;
}

const CLUTCH_FRACTION = 0.25;

/**
 * Standings from the reduced log (state must be at least through every verdict.final).
 * Rank: points (floored at 0, = reducer points), then earlier lastScoreMs (no surviving hit = last), then fewer misses
 * (FC-F-025), then lower slot as a deterministic last resort. Ranks are always 1..N, no shared ranks.
 * firstHitMs / lastScoreMs are relative to the bell (match.started) and consider surviving (non-overturned) hits only.
 */
export function computeStandings(state: MatchState, events: FightEnvelope[], timeLimitMs: number, totalPoints: number): Standing[] {
  const bell = state.startedT ?? 0;
  const ev = [...events].sort((a, b) => a.seq - b.seq);
  const rows = state.order.map((id) => {
    const f = state.fighters[id]!;
    const hits = Object.values(f.solved).filter((s) => s && s.final !== 'overturned') as { atMs: number; points: number }[];
    const times = hits.map((h) => Math.max(0, h.atMs - bell));
    const missTs = ev.filter((e) => e.type === 'verdict.live' && e.data.fighterId === id && !e.data.ok).map((e) => e.t - bell);
    const lastHit = times.length ? Math.max(...times) : null;
    const points = Math.max(0, f.points);
    return {
      slot: f.slot,
      s: {
        fighterId: id, rank: 1 as 1 | 2 | 3 | 4, points, scorePct: totalPoints > 0 ? Math.min(1, points / totalPoints) : 0,
        hits: f.hits, misses: f.misses, overturned: f.overturned, yellow: f.yellow, red: f.red,
        firstHitMs: times.length ? Math.min(...times) : null, lastScoreMs: lastHit,
        clutchPoints: hits.reduce((a, h) => a + (h.atMs - bell >= timeLimitMs * (1 - CLUTCH_FRACTION) ? h.points : 0), 0),
        missesRecovered: lastHit === null ? 0 : missTs.filter((t) => t < lastHit).length,
      } satisfies Standing,
    };
  });
  rows.sort((a, b) => b.s.points - a.s.points
    || (a.s.lastScoreMs ?? Infinity) - (b.s.lastScoreMs ?? Infinity)
    || a.s.misses - b.s.misses
    || a.slot - b.slot);
  return rows.map((r, i) => ({ ...r.s, rank: (i + 1) as 1 | 2 | 3 | 4 }));
}
