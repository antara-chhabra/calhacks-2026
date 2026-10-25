// `npm run recompute [-- --apply]` (AC-10.1): recompute every fighter's stats and Elo from all settled `entry` rows with the engine
// and diff against the stored values. Dry run by default.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EntryRow, FighterStats } from '@fc/contracts';
import { computeStats, updateElo } from '@fc/engine';
import { num, opt, openLiveDb, tms } from './record.js';

export type Diff = { fighterId: string; field: string; stored: unknown; recomputed: unknown };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9);

/** Pure core: entries (all fighters, settled only) + stored stats + match time limits -> diffs. */
export function recomputeAll(entries: EntryRow[], stored: Map<string, FighterStats>, startElo = 1000): { stats: Map<string, FighterStats>; diffs: Diff[] } {
  const stats = new Map<string, FighterStats>(), diffs: Diff[] = [];
  const ids = [...new Set([...entries.map((e) => e.fighterId), ...stored.keys()])].sort();
  for (const id of ids) {
    const mine = entries.filter((e) => e.fighterId === id);
    const prev = stored.get(id) ?? null;
    const limit = mine[mine.length - 1]?.timeLimitMs ?? 120_000;
    const out = computeStats(id, mine, limit, prev);
    stats.set(id, out);
    if (!prev) { diffs.push({ fighterId: id, field: '(row)', stored: null, recomputed: 'present' }); continue; }
    for (const k of Object.keys(out) as (keyof FighterStats)[]) if (!eq(prev[k], out[k])) diffs.push({ fighterId: id, field: k, stored: prev[k], recomputed: out[k] });
  }
  // Elo replay: each real match, in endedAt order, from the recorded eloBefore chain.
  const real = entries.filter((e) => e.mode === 'live' && !e.isDemo && !e.voided);
  const byMatch = new Map<string, EntryRow[]>();
  for (const e of real) byMatch.set(e.matchId, [...(byMatch.get(e.matchId) ?? []), e]);
  const elo = new Map<string, number>(), played = new Map<string, number>();
  for (const rows of [...byMatch.values()].sort((a, b) => a[0]!.endedAt - b[0]!.endedAt)) {
    const after = updateElo(rows.map((r) => ({ fighterId: r.fighterId, elo: elo.get(r.fighterId) ?? r.eloBefore ?? startElo, rank: r.rank, matches: played.get(r.fighterId) ?? 0 })));
    for (const r of rows) {
      const want = Math.round(after[r.fighterId]!);
      if (r.eloAfter !== null && r.eloAfter !== want) diffs.push({ fighterId: r.fighterId, field: `elo@${r.matchId}`, stored: r.eloAfter, recomputed: want });
      elo.set(r.fighterId, r.eloAfter ?? want); played.set(r.fighterId, (played.get(r.fighterId) ?? 0) + 1);
    }
  }
  return { stats, diffs };
}

async function main(argv: string[]): Promise<number> {
  const apply = argv.includes('--apply');
  let d;
  try { d = await openLiveDb(['match', 'entry', 'fighterStats', 'fighter']); }
  catch (e) { console.error(`recompute: ${(e as Error).message}. Is \`spacetime start\` running and the module published?`); return 1; }
  try {
    const matches = new Map(d.rows('match').map((m) => [m.id as string, m]));
    const entries: EntryRow[] = d.rows('entry').filter((r) => r.rank != null && matches.get(r.matchId)?.status === 'settled').map((r) => {
      const m = matches.get(r.matchId)!;
      return { fighterId: r.fighterId, rank: num(r.rank) as 1, points: num(r.points), scorePct: num(r.scorePct), hits: num(r.hits), misses: num(r.misses),
        overturned: num(r.overturned), yellow: num(r.yellow), red: num(r.red), firstHitMs: opt(r.firstHitMs) === null ? null : num(r.firstHitMs),
        lastScoreMs: opt(r.lastScoreMs) === null ? null : num(r.lastScoreMs), clutchPoints: num(r.clutchPoints), missesRecovered: num(r.missesRecovered),
        matchId: r.matchId, slot: num(r.slot) as 0, mode: m.mode, isDemo: m.isDemo, voided: false, timeLimitMs: num(m.timeLimitMs), endedAt: tms(m.endedAt),
        eloBefore: num(r.eloBefore), eloAfter: opt(r.eloAfter) === null ? null : num(r.eloAfter), wonAtOdds: opt(r.wonAtOdds) === null ? null : num(r.wonAtOdds) };
    }).sort((a, b) => a.endedAt - b.endedAt);
    const stored = new Map<string, FighterStats>(d.rows('fighterStats').map((r) => [r.fighterId as string, {
      fighterId: r.fighterId, category: r.category, matches: num(r.matches), wins: num(r.wins), podiums: num(r.podiums), avgScorePct: num(r.avgScorePct),
      spd: num(r.spd), acc: num(r.acc), clu: num(r.clu), dis: num(r.dis), grt: num(r.grt), con: num(r.con), ovr: num(r.ovr), form: r.form, streak: num(r.streak),
      upsetUntil: opt(r.upsetUntil) === null ? null : tms(r.upsetUntil), eloHistory: (r.eloHistory as unknown[]).map(num), backersWon: num(r.backersWon),
      earningsUsdc: num(r.earningsUsdc) } as FighterStats]));
    const { diffs } = recomputeAll(entries, stored);
    console.log(`recompute: ${entries.length} settled entries, ${stored.size} stats rows`);
    if (!diffs.length) { console.log('recompute: OK, stored values match the engine exactly (AC-10.1)'); return 0; }
    for (const x of diffs) console.log(`  ${x.fighterId}.${x.field}: stored=${JSON.stringify(x.stored)} recomputed=${JSON.stringify(x.recomputed)}`);
    console.log(`recompute: ${diffs.length} difference(s)`);
    if (apply) {
      console.error('recompute: --apply is not possible yet: the module has no runner reducer that writes fighter_stats / fighter.elo outside settle_match ' +
        '(needs e.g. `set_fighter_stats(stats[], elo[])` runner-only; see docs/requests). Nothing was written.');
      return 3;
    }
    console.log('recompute: dry run (use --apply to write once a reducer exists)');
    return 1;
  } finally { d.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`recompute: ${(e as Error).message}`); process.exit(1); });
}
