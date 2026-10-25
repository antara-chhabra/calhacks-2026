// Lobby view models: pure selectors from a store snapshot (PRD FC-F-141). No React, no side effects.
import { formatCents } from "@fc/contracts";
import { statusLine } from "@fc/engine";
import type { Store } from "@/data/store";
import type { Agent } from "@/ui/mock";

export type LobbySnapshot = Pick<Store, "conn" | "me" | "fighters" | "matches" | "openMatchId" | "liveMatchId" | "markets" | "bets" | "watch">;

const FALLBACK = "#a1a1aa";

export interface FighterVM { id: string; name: string; title: string; color: string; elo: number; origin: string }
export interface PosterFighter extends FighterVM { odds: number | null; oddsText: string; impliedPct: number | null }
export interface PosterVM {
  matchId: string; number: number; status: string; fighters: PosterFighter[]; commitHash: string; commitShort: string;
  closesAt: number; isOpen: boolean; href: string; poolCents: number; poolText: string;
}
export interface LiveVM { matchId: string; number: number; statusLine: string; rows: { fighter: FighterVM; points: number }[]; href: string }
export interface ResultVM { matchId: string; number: number; winner: FighterVM | null; winnerName: string; href: string }
export interface FeedVM { id: string; handle: string; outcome: string; outcomeColor: string; stakeText: string; status: string; mine: boolean }
export interface MeVM { signedIn: boolean; handle: string | null; balanceText: string; moneyModeText: string }

export const formatOdds = (d: number): string => `${d.toFixed(2)}`;
export const impliedPct = (d: number): number => Math.round(100 / d);
export const shortHash = (h: string): string => (h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h);

/** Countdown text for the betting window; "Closed" once the deadline passes. */
export function countdown(closesAt: number, now: number): string {
  const s = Math.ceil((closesAt - now) / 1000);
  if (s <= 0) return "Closed";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fighterVM(snap: Pick<LobbySnapshot, "fighters">, id: string): FighterVM {
  const f = snap.fighters[id];
  if (!f) return { id, name: id.toUpperCase(), title: "", color: FALLBACK, elo: 0, origin: "house" };
  return { id, name: f.name, title: f.title, color: f.skin.palette.primary, elo: f.elo, origin: f.origin };
}

/** AgentAvatar (shared primitive) wants the legacy Agent shape; only name and color are read. */
export const avatarOf = (v: { name: string; color: string }): Agent => ({ name: v.name, color: v.color }) as Agent;

export function winnerMarket(snap: Pick<LobbySnapshot, "markets">, matchId: string) {
  return Object.values(snap.markets).find((m) => m.kind === "winner" && m.id.startsWith(`${matchId}:`));
}

export function posterMatchId(s: LobbySnapshot): string | null {
  if (s.openMatchId && s.matches[s.openMatchId]) return s.openMatchId;
  const latest = Object.values(s.matches).sort((a, b) => b.number - a.number)[0];
  return latest?.id ?? null;
}

export function selectPoster(s: LobbySnapshot): PosterVM | null {
  const id = posterMatchId(s);
  const m = id ? s.matches[id] : null;
  if (!m) return null;
  const market = winnerMarket(s, m.id);
  const fighters = m.fighterIds.map<PosterFighter>((fid) => {
    const odds = market?.odds[fid] ?? null;
    return { ...fighterVM(s, fid), odds, oddsText: odds ? formatOdds(odds) : "–", impliedPct: odds ? impliedPct(odds) : null };
  });
  const poolCents = market ? Object.values(market.pools).reduce((a, p) => a + p.staked + p.seed, 0) : 0;
  return {
    matchId: m.id, number: m.number, status: m.status, fighters, commitHash: m.commitHash, commitShort: shortHash(m.commitHash),
    closesAt: m.bettingClosesAt, isOpen: m.status === "open" || m.status === "scheduled", href: `/match/${m.id}`, poolCents, poolText: formatCents(poolCents),
  };
}

export function selectLive(s: LobbySnapshot): LiveVM | null {
  const w = s.watch;
  const id = s.liveMatchId ?? (w.matchId && w.state && (w.state.status === "live" || w.state.status === "review") ? w.matchId : null);
  const m = id ? s.matches[id] : null;
  if (!id || !m || !w.state || w.matchId !== id) return null;
  const rows = w.state.order
    .map((fid) => ({ fighter: fighterVM(s, fid), points: w.state.fighters[fid]?.points ?? 0 }))
    .sort((a, b) => b.points - a.points);
  return { matchId: id, number: m.number, statusLine: statusLine(w.state), rows, href: `/match/${id}` };
}

export function selectResults(s: LobbySnapshot, limit = 5): ResultVM[] {
  return Object.values(s.matches)
    .filter((m) => m.status === "settled")
    .sort((a, b) => b.number - a.number)
    .slice(0, limit)
    .map((m) => {
      const winner = m.winnerId ? fighterVM(s, m.winnerId) : null;
      return { matchId: m.id, number: m.number, winner, winnerName: winner?.name ?? "No winner", href: `/match/${m.id}` };
    });
}

export function selectFeed(s: LobbySnapshot, limit = 12): FeedVM[] {
  return [...s.bets]
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, limit)
    .map((b) => {
      const f = s.fighters[b.outcome] ? fighterVM(s, b.outcome) : null;
      return { id: b.id, handle: b.handle, outcome: f?.name ?? b.outcome.toUpperCase(), outcomeColor: f?.color ?? FALLBACK, stakeText: formatCents(b.stake), status: b.status, mine: b.mine };
    });
}

export function selectMe(s: LobbySnapshot): MeVM {
  const me = s.me;
  return {
    signedIn: !!me?.handle, handle: me?.handle ?? null, balanceText: formatCents(me?.balanceCents ?? 0),
    moneyModeText: (me?.moneyMode ?? "ledger") === "ledger" ? "Ledger mode · no funds moved" : "Live money",
  };
}

/** Demo data is needed only when nothing is connected and nothing is loaded (FC-F-141 empty state). */
export const needsDemo = (s: Pick<LobbySnapshot, "conn" | "matches">): boolean => s.conn === "offline" && Object.keys(s.matches).length === 0;

const HANDLE_RE = /^[A-Za-z0-9_]{3,16}$/;
export const isValidHandle = (h: string): boolean => HANDLE_RE.test(h);
const ADJ = ["Judge", "Lucky", "Sharp", "Quiet", "Brave", "Swift", "Cosmic", "Salty"];
const NOUN = ["Otter", "Falcon", "Badger", "Panda", "Heron", "Lynx", "Moose", "Gecko"];
export function suggestHandle(rand: () => number = Math.random): string {
  return `${ADJ[Math.floor(rand() * ADJ.length)]}${NOUN[Math.floor(rand() * NOUN.length)]}${10 + Math.floor(rand() * 90)}`;
}
export function registerErrorText(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  return code === "not_connected" ? "Connect to a live match to play" : code;
}
