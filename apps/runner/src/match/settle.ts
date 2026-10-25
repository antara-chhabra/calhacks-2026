// Settlement inputs (R-02b): Elo (live, non-demo matches only) and card stats (PRD §11.8–11.9, §16.2 #8).
import type { EntryRow, FighterId, FighterStats, Standing } from '@fc/contracts';
import { computeStats, updateElo } from '@fc/engine';
import type { MatchRecord } from './types.js';

/** Past entries and the previous stats row of one fighter. */
export type FighterHistory = { entries: EntryRow[]; stats: FighterStats | null };
export type HistoryProvider = (fighterId: FighterId) => Promise<FighterHistory> | FighterHistory;

const realEntry = (e: EntryRow) => e.mode === 'live' && !e.isDemo && !e.voided;

export async function buildSettlement(rec: MatchRecord, standings: Standing[], history: HistoryProvider | undefined, now: number) {
  const hist = new Map<FighterId, FighterHistory>();
  for (const id of rec.fighters) hist.set(id, (await history?.(id)) ?? { entries: [], stats: null });
  const eloBefore = new Map(rec.candidates.map((c) => [c.fighter.id, c.elo]));
  const counts = rec.mode === 'live' && !rec.isDemo;

  // Elo: unrounded floats from the engine, rounded once here. Mock/demo matches leave Elo unchanged.
  const afterRaw = counts
    ? updateElo(standings.map((s) => ({ fighterId: s.fighterId, elo: eloBefore.get(s.fighterId)!, rank: s.rank,
        matches: hist.get(s.fighterId)!.entries.filter(realEntry).length })))
    : null;
  const elo = standings.map((s) => ({ fighterId: s.fighterId, after: afterRaw ? Math.round(afterRaw[s.fighterId]!) : eloBefore.get(s.fighterId)! }));

  const stats: FighterStats[] = standings.map((s) => {
    const h = hist.get(s.fighterId)!;
    const cand = rec.candidates.find((c) => c.fighter.id === s.fighterId)!;
    const entry: EntryRow = { ...s, matchId: rec.matchId, slot: rec.slots[rec.fighters.indexOf(s.fighterId)]!, mode: rec.mode, isDemo: rec.isDemo,
      voided: false, timeLimitMs: rec.timeLimitMs, endedAt: now, eloBefore: cand.elo, eloAfter: elo.find((x) => x.fighterId === s.fighterId)!.after,
      wonAtOdds: null };
    const prev = h.stats ? { ...h.stats } : null;
    const out = computeStats(s.fighterId, [...h.entries, entry], rec.timeLimitMs, prev ?? ({ category: rec.category, eloHistory: [], backersWon: 0, earningsUsdc: 0 } as unknown as FighterStats));
    return { ...out, category: rec.category };
  });
  return { elo, stats };
}
