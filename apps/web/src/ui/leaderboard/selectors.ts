// Leaderboard + profile view models (PRD FC-F-165, FC-F-182). Pure selectors over a store snapshot.
import { cardFrame } from '@fc/engine';
import { formatCents } from "@fc/contracts";
import type { Category } from "@fc/contracts";
import type { FighterCardData, MatchRow, Store } from "@/data/store";
import { formChips, recordText, winPct } from "@/ui/card/helpers";

export type BoardSnapshot = Pick<Store, "fighters" | "matches" | "openMatchId">;
export type BoardFilter = "all" | "house" | "community";
export type BoardTab = Category;

export interface LeaderRow {
  rank: number; id: string; name: string; title: string; color: string; origin: string; fighter: FighterCardData;
  ovr: number | null; elo: number; matches: number; wins: number; record: string; winPct: string; avgScore: string; form: string;
  earnings: string; backers: string; href: string;
}

const isHouse = (f: FighterCardData) => f.origin === "house";
export const matchesFilter = (f: FighterCardData, filter: BoardFilter): boolean => filter === "all" || (filter === "house" ? isHouse(f) : !isHouse(f));
export const statsForTab = (f: FighterCardData, tab: BoardTab) => f.categoryStats?.[tab] ?? (f.stats?.category === tab ? f.stats : null);
const eloForTab = (f: FighterCardData, tab: BoardTab): number => statsForTab(f, tab)?.eloHistory.at(-1) ?? (tab === 'integrals' ? f.elo : 1000);

/** Elo desc; ties by OVR desc, then name. Retired fighters are hidden. */
export function selectLeaderboard(s: Pick<BoardSnapshot, "fighters">, tab: BoardTab = "integrals", filter: BoardFilter = "all"): LeaderRow[] {
  const list = Object.values(s.fighters)
    .filter((f) => f.status !== "retired" && matchesFilter(f, filter))
    .sort((a, b) => eloForTab(b, tab) - eloForTab(a, tab) || (statsForTab(b, tab)?.ovr ?? 0) - (statsForTab(a, tab)?.ovr ?? 0) || a.name.localeCompare(b.name));
  return list.map((f, i) => {
    const st = statsForTab(f, tab);
    return {
      rank: i + 1, id: f.id, name: f.name, title: f.title, color: f.skin.palette.primary, origin: f.origin, fighter: { ...f, stats: st, elo: st?.eloHistory.at(-1) ?? (tab === 'integrals' && st ? f.elo : 1000), frame: st ? cardFrame(st, f.status === 'provisional', Date.now()) : f.status === 'provisional' ? 'rookie' : 'bronze' },
      ovr: st ? st.ovr : null, elo: eloForTab(f, tab), matches: st?.matches ?? 0, wins: st?.wins ?? 0,
      record: st ? `${st.wins}-${Math.max(0, st.matches - st.wins)}` : "–", winPct: winPct(st),
      avgScore: st && st.matches > 0 ? `${Math.round(st.avgScorePct * 100)}%` : "–", form: st?.form ?? "",
      earnings: st ? `${st.earningsUsdc.toFixed(2)} USDC` : "–", backers: st ? formatCents(st.backersWon) : "–", href: `/fighter/${f.id}`,
    };
  });
}

export interface HistoryRow { matchId: string; number: number; status: MatchRow["status"]; won: boolean; settled: boolean; opponents: string[]; resultsHref: string; receiptHref: string }
export interface ProfileVM {
  fighter: FighterCardData; creator: string; originText: string; archetype: string; record: string; winPct: string;
  history: HistoryRow[]; next: { matchId: string; number: number; href: string; isOpen: boolean } | null;
}

const upcoming = (m: MatchRow) => m.status !== "settled" && m.status !== "void";

export function selectProfile(s: BoardSnapshot, id: string): ProfileVM | null {
  const f = s.fighters[id];
  if (!f) return null;
  const mine = Object.values(s.matches).filter((m) => m.fighterIds.includes(id)).sort((a, b) => b.number - a.number);
  const history = mine.filter((m) => !upcoming(m)).map<HistoryRow>((m) => ({
    matchId: m.id, number: m.number, status: m.status, won: m.winnerId === id, settled: m.status === "settled",
    opponents: m.fighterIds.filter((x) => x !== id).map((x) => s.fighters[x]?.name ?? x.toUpperCase()),
    resultsHref: `/match/${m.id}/results`, receiptHref: `/match/${m.id}/receipt`,
  }));
  const nx = mine.filter(upcoming).sort((a, b) => a.number - b.number)[0];
  return {
    fighter: f, creator: f.creatorHandle ? `@${f.creatorHandle}` : "En Garde house", originText: f.origin === "house" ? "House fighter" : "Community fighter",
    archetype: f.archetype, record: recordText(f.stats), winPct: winPct(f.stats), history,
    next: nx ? { matchId: nx.id, number: nx.number, href: `/match/${nx.id}`, isOpen: nx.status === "open" } : null,
  };
}

export const formResults = (form: string): ("W" | "P" | "L")[] => formChips(form).map((c) => c.result);
