// Fighter stats and card frames (PRD §8.3, §11.9, FC-F-161, FC-F-181). K-04.
import type { CardFrame, EntryRow, FighterId, FighterStats } from '@fc/contracts';
import { ovrFromElo } from './elo.js';

const clamp = (x: number) => Math.min(99, Math.max(1, Math.round(x)));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const stdev = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const DAY = 24 * 3600 * 1000;

/** Entries are the fighter's rows (any order); only real ones (live, not demo, not void) count. Stats use the last 20 by endedAt. */
export function computeStats(fighterId: FighterId, entries: EntryRow[], timeLimitMs: number, prev: FighterStats | null): FighterStats {
  const real = entries.filter((e) => e.mode === 'live' && !e.isDemo && !e.voided).sort((a, b) => a.endedAt - b.endedAt);
  const win = real.slice(-20);
  const T = timeLimitMs;
  const misses = sum(win.map((e) => e.misses));
  const hits = sum(win.map((e) => e.hits));
  const pts = sum(win.map((e) => e.points));
  const pcts = win.map((e) => e.scorePct);
  const empty = win.length === 0;
  const spd = empty ? 50 : 30 + 69 * (1 - median(win.map((e) => e.firstHitMs ?? T)) / T);
  const acc = empty ? 50 : 30 + 69 * mean(pcts);
  const clu = empty ? 50 : 30 + 69 * (sum(win.map((e) => e.clutchPoints)) / Math.max(1, pts));
  const dis = empty ? 50 : 30 + 69 * (1 - misses / Math.max(1, hits + misses)) - 3 * sum(win.map((e) => e.yellow + 3 * e.red));
  const grt = empty ? 50 : misses === 0 ? 70 : 30 + 69 * (sum(win.map((e) => e.missesRecovered)) / misses);
  const con = empty ? 50 : 99 - Math.min(69, 150 * stdev(pcts));
  const last = real[real.length - 1];
  const elo = last ? (last.eloAfter ?? last.eloBefore) : (prev?.eloHistory.length ? prev.eloHistory[prev.eloHistory.length - 1] : 1000);
  const newestFirst = [...real].reverse();
  const res = (e: EntryRow) => (e.rank === 1 ? 'W' : e.rank === 4 ? 'L' : 'P');
  let streak = 0;
  if (newestFirst.length) {
    const wonLast = newestFirst[0].rank === 1;
    for (const e of newestFirst) { if ((e.rank === 1) !== wonLast) break; streak += wonLast ? 1 : -1; }
  }
  const upsets = real.filter((e) => e.rank === 1 && e.wonAtOdds !== null && e.wonAtOdds >= 4.0);
  return {
    fighterId, category: prev?.category ?? 'integrals', matches: real.length,
    wins: real.filter((e) => e.rank === 1).length, podiums: real.filter((e) => e.rank <= 3).length,
    avgScorePct: mean(pcts),
    spd: clamp(spd), acc: clamp(acc), clu: clamp(clu), dis: clamp(dis), grt: clamp(grt), con: clamp(con),
    ovr: ovrFromElo(elo),
    form: newestFirst.slice(0, 5).map(res).join(''),
    streak,
    upsetUntil: upsets.length ? Math.max(...upsets.map((e) => e.endedAt)) + DAY : null,
    eloHistory: real.filter((e) => e.eloAfter !== null).slice(-20).map((e) => e.eloAfter as number),
    backersWon: prev?.backersWon ?? 0, earningsUsdc: prev?.earningsUsdc ?? 0,
  };
}

/** FC-F-161: special frames override the tier — hot_streak (streak ≥ 3), upset (now < upsetUntil), rookie (provisional) in that order. */
export function cardFrame(stats: FighterStats, provisional: boolean, now: number): CardFrame {
  if (stats.streak >= 3) return 'hot_streak';
  if (stats.upsetUntil !== null && now < stats.upsetUntil) return 'upset';
  if (provisional) return 'rookie';
  return stats.ovr >= 85 ? 'elite' : stats.ovr >= 75 ? 'gold' : stats.ovr >= 65 ? 'silver' : 'bronze';
}
