// Lobby (FC-F-141 / FC-F-148): the Kalshi-style black market UI, fed by the data store.
import { Activity, BarChart3, History, Swords, Trophy, UserRound } from "lucide-react";
import { CATEGORY_CATALOG } from "@fc/contracts";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import WidgetGrid, { type WidgetGridItem } from "@/components/kokonutui/bento-grid";
import { MorphicNavbar } from "@/components/kokonutui/morphic-navbar";
import { useStore } from "@/data/store";
import { AppShell } from "@/ui/shell";
import { fighterVM, needsDemo, selectFeed, selectLive, selectMe, selectPoster, selectResults, winnerMarket } from "@/ui/lobby/selectors";
import { AccountWidget, BetFeedWidget, FightersWidget, LiveWidget, MarketTile, PosterWidget, ResultsWidget } from "@/ui/widgets";

const ICON = "size-3.5";
const NAV_ITEMS = {
  "/markets": { name: "Trending" },
  ...Object.fromEntries(CATEGORY_CATALOG.map((c) => [c.path, { name: c.label }])),
};

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-semibold text-lg text-zinc-50 tracking-tight">{title}</h2>
      <p className="text-[13px] text-zinc-500">{subtitle}</p>
    </div>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function Markets() {
  const { pathname } = useLocation();
  const categoryInfo = CATEGORY_CATALOG.find((c) => c.path === pathname) ?? CATEGORY_CATALOG[0]!;
  const category = pathname === "/markets" ? null : categoryInfo.id;
  const now = useNow();

  const conn = useStore((s) => s.conn);
  const me = useStore((s) => s.me);
  const fighters = useStore((s) => s.fighters);
  const matches = useStore((s) => s.matches);
  const openMatchId = useStore((s) => s.openMatchId);
  const liveMatchId = useStore((s) => s.liveMatchId);
  const markets = useStore((s) => s.markets);
  const bets = useStore((s) => s.bets);
  const watch = useStore((s) => s.watch);
  const register = useStore((s) => s.register);

  // No connection and nothing loaded: play the recorded demo match (clearly badged below).
  useEffect(() => {
    if (needsDemo({ conn, matches })) useStore.getState().openReplay("mock-basic", 4);
  }, [conn, matches]);

  const snap = useMemo(
    () => ({ conn, me, fighters, matches, openMatchId, liveMatchId, markets, bets, watch }),
    [conn, me, fighters, matches, openMatchId, liveMatchId, markets, bets, watch]
  );
  const poster = useMemo(() => selectPoster(snap, category ?? undefined), [snap, category]);
  const live = useMemo(() => selectLive(snap, category ?? undefined), [snap, category]);
  const results = useMemo(() => selectResults(snap, 5, category ?? undefined), [snap, category]);
  const feed = useMemo(() => selectFeed(snap, 6, category ?? undefined), [snap, category]);
  const meVM = useMemo(() => selectMe(snap), [snap]);
  const names = useMemo(() => Object.fromEntries(Object.keys(fighters).map((id) => [id, fighterVM(snap, id)])), [fighters, snap]);
  const posterMarkets = useMemo(() => (poster ? Object.values(markets).filter((m) => m.id.startsWith(`${poster.matchId}:`)) : []), [markets, poster]);
  const board = useMemo(
    () => poster?.fighters.map((f) => ({ fighter: f, oddsText: f.oddsText, pct: f.impliedPct })).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)) ?? [],
    [poster]
  );
  const isReplay = conn === "replay";
  const posterKey = poster ? `${poster.matchId}:${poster.status}` : "none";
  const winner = poster ? winnerMarket(snap, poster.matchId) : undefined;

  const items = useMemo<WidgetGridItem[]>(
    () => [
      { id: "poster", title: "Fight night", icon: <Swords className={ICON} />, defaultSpan: 4, render: (size) => <PosterWidget now={now} poster={poster} size={size} /> },
      { id: "account", title: meVM.signedIn ? "Your account" : "Join the fight", icon: <UserRound className={ICON} />, defaultSpan: 2, render: () => <AccountWidget key={String(meVM.signedIn)} me={meVM} register={register} /> },
      { id: "live", title: "Live now", icon: <Activity className={ICON} />, defaultSpan: 2, render: () => <LiveWidget live={live} /> },
      { id: "board", title: winner ? "Winner odds" : "Fighters", icon: <Trophy className={ICON} />, defaultSpan: 2, render: () => <FightersWidget fighters={board} /> },
      { id: "results", title: "Recent results", icon: <History className={ICON} />, defaultSpan: 2, render: () => <ResultsWidget results={results} /> },
      { id: "feed", title: "Bet feed", icon: <BarChart3 className={ICON} />, defaultSpan: 2, render: () => <BetFeedWidget feed={feed} /> },
    ],
    // posterKey keeps the grid from rebuilding on every unrelated store tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, poster, meVM, register, live, board, results, feed, winner, posterKey]
  );
  const marketItems = useMemo<WidgetGridItem[]>(
    () => posterMarkets.map((m) => ({ id: `mk-${m.id}`, title: m.kind.replace("_", " "), icon: <BarChart3 className={ICON} />, defaultSpan: m.kind === "winner" ? 3 : 2, render: (size) => <MarketTile market={m} names={names} size={size} teamMarket={poster?.category === 'squads'} /> })),
    [posterMarkets, names]
  );

  return (
    <AppShell wide>
      <div>
        <div className="border-zinc-900 border-b">
          <div className="mx-auto flex max-w-[1280px] overflow-x-auto px-6 py-3 lg:justify-center">
            <MorphicNavbar className="shrink-0 [&_a]:whitespace-nowrap" defaultPath="/markets" items={NAV_ITEMS} />
          </div>
        </div>

        <main className="mx-auto max-w-[1280px] px-6 pt-8 pb-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-zinc-500">Prediction markets for AI fighters</p>
              <h1 className="font-semibold text-3xl text-zinc-50 tracking-tight">{pathname === "/markets" ? "Trending" : categoryInfo.label}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {isReplay && <span className="rounded-full bg-amber-300/10 px-2.5 py-1 font-semibold text-amber-200 uppercase tracking-wider ring-1 ring-amber-300/20">Replay · demo data</span>}
              <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-zinc-300 ring-1 ring-zinc-800">{meVM.moneyModeText}</span>
            </div>
          </div>
          {category && <p className="mb-6 max-w-3xl text-[13px] leading-relaxed text-zinc-400">{categoryInfo.description}</p>}

          {poster || live || results.length > 0 || feed.length > 0 ? (
            <section id="arena">
              <WidgetGrid className="max-w-none" items={items} rowHeight={300} />
            </section>
          ) : (
            <section aria-live="polite" className="rounded-xl bg-zinc-950 px-6 py-10 ring-1 ring-zinc-900" data-testid="category-empty">
              <h2 className="font-semibold text-lg text-zinc-100">No {categoryInfo.label} matches yet</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-zinc-400">{categoryInfo.description} Matches, odds, live fights, settled results, and the bet feed will appear here as soon as this category has activity.</p>
            </section>
          )}

          {marketItems.length > 0 && (
            <section className="mt-14">
              <SectionHeader subtitle={`Every market on Match #${poster?.number ?? ""}, priced by the pool`} title="Prediction hub" />
              <WidgetGrid className="max-w-none" items={marketItems} key={posterKey} rowHeight={220} />
            </section>
          )}
        </main>

      </div>
    </AppShell>
  );
}
