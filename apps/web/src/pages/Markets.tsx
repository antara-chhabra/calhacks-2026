import { ArrowUpRight, Search, Swords } from "lucide-react";
import { CATEGORY_CATALOG, formatCents } from "@fc/contracts";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { shallow } from "zustand/shallow";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStore } from "@/data/store";
import { AppShell } from "@/ui/shell";
import { fighterVM, needsDemo, selectFeed, selectMe, selectResults } from "@/ui/lobby/selectors";
import { marketTotals, ongoingFight } from "@/ui/lobby/market-board";
import { AccountWidget, BetFeedWidget, MarketTile, ResultsWidget } from "@/ui/widgets";

const NAV_ITEMS = {
  "/markets": { name: "Trending" },
  ...Object.fromEntries(CATEGORY_CATALOG.map((c) => [c.path, { name: c.label }])),
};

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-zinc-800 pb-6 last:border-0"><h2 className="mb-4 text-base font-bold text-white">{title}</h2>{children}</section>;
}

export default function Markets() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const explicitDemo = params.get("demo") === "1";
  const categoryInfo = CATEGORY_CATALOG.find((c) => c.path === pathname);
  const category = categoryInfo?.id;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("activity");
  const [now, setNow] = useState(Date.now);
  const [shown, setShown] = useState(24);
  const s = useStore(({ conn, me, fighters, matches, openMatchId, liveMatchId, markets, bets, register, openReplay }) =>
    ({ conn, me, fighters, matches, openMatchId, liveMatchId, markets, bets, register, openReplay }), shallow);

  useEffect(() => {
    if (explicitDemo && needsDemo(s)) s.openReplay("mock-basic", 4);
  }, [explicitDemo, s.conn, s.matches, s.openReplay]);
  const hasOpenMarkets = Object.values(s.matches).some((m) => m.status === "open");
  useEffect(() => { if (!hasOpenMarkets) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [hasOpenMarkets]);
  useEffect(() => setShown(24), [pathname, query, filter, sort]);

  const names = useMemo(() => Object.fromEntries(Object.keys(s.fighters).map((id) => [id, fighterVM(s, id)])), [s.fighters]);
  const matches = Object.values(s.matches).filter((m) => !category || m.category === category);
  const rows = Object.values(s.markets).flatMap((market) => {
    const match = matches.find((m) => market.id.startsWith(`${m.id}:`));
    return match ? [{ market, match, ...marketTotals(market) }] : [];
  });
  const volume = rows.reduce((sum, r) => sum + r.volume, 0);
  const openCount = rows.filter((r) => r.market.status === "open" && r.match.status === "open" && r.match.bettingClosesAt > now).length;
  const visible = rows.filter(({ market, match }) => {
    const open = market.status === "open" && match.status === "open" && match.bettingClosesAt > now;
    return (filter === "all" || (filter === "open" ? open : market.status === "settled")) &&
      `${market.label} ${match.number} ${match.fighterIds.map((id) => names[id]?.name ?? id).join(" ")}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => sort === "newest" ? b.match.number - a.match.number || a.market.label.localeCompare(b.market.label) :
    Number(b.market.status === "open") - Number(a.market.status === "open") || b.volume - a.volume || b.match.number - a.match.number || a.market.label.localeCompare(b.market.label));
  const me = selectMe(s);
  const feed = selectFeed(s, 8, category);
  const results = selectResults(s, 5, category);
  const fight = s.conn === "live" ? ongoingFight(s) : null;

  return (
    <AppShell wide>
      <nav aria-label="Market categories" className="-mx-4 border-b border-zinc-800 px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex gap-6 overflow-x-auto">{Object.entries(NAV_ITEMS).map(([href, item]) => <Link aria-current={pathname === href ? "page" : undefined} className={`shrink-0 border-b-2 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-white ${pathname === href ? "border-white text-white" : "border-transparent text-zinc-400 hover:text-white"}`} key={href} to={href}>{item.name}</Link>)}</div>
      </nav>
      <div className="pt-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{categoryInfo?.label ?? "Trending markets"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{categoryInfo?.description ?? "Pick your fighter. Read the odds. Follow every verified result."}</p>
          </div>
          {s.conn === "replay" && <span className="rounded-md border border-amber-300/30 px-2.5 py-1 text-xs font-semibold text-amber-200">Replay · demo data</span>}
        </div>
        <dl className="my-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-zinc-800 py-4 text-sm">
          {[["Total volume", formatCents(volume)], ["Open markets", String(openCount)], ["Recorded matches", String(matches.length)], ["Available markets", String(rows.length)]].map(([label, value]) => (
            <div className="flex items-baseline gap-2" key={label}><dt className="text-zinc-400">{label}</dt><dd className="font-bold tabular-nums text-white">{value}</dd></div>
          ))}
        </dl>
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-label="Prediction markets" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="flex h-11 min-w-0 flex-[1_1_200px] items-center gap-2 rounded-lg border border-zinc-700 bg-black px-3 text-zinc-400 focus-within:border-white">
                <Search aria-hidden="true" className="size-4 shrink-0" />
                <input aria-label="Search markets" className="min-w-0 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-400" onChange={(e) => setQuery(e.target.value)} placeholder="Search markets or fighters" type="search" value={query} />
              </label>
              <select aria-label="Market status" className="h-11 rounded-lg border border-zinc-700 bg-black px-3 text-sm text-zinc-200" onChange={(e) => setFilter(e.target.value)} value={filter}>
                <option value="all">All markets</option><option value="open">Open</option><option value="settled">Settled</option>
              </select>
              <select aria-label="Sort markets" className="h-11 rounded-lg border border-zinc-700 bg-black px-3 text-sm text-zinc-200" onChange={(e) => setSort(e.target.value)} value={sort}>
                <option value="activity">Most active</option><option value="newest">Newest</option>
              </select>
            </div>
            {visible.length ? (
              <><div className="flex flex-wrap gap-4" data-testid="market-board">
                {visible.slice(0, shown).map(({ market, match }) => (
                  <article className="flex min-w-0 flex-[1_1_360px] flex-col rounded-xl border border-zinc-800 bg-black p-5 transition-colors hover:border-zinc-600 focus-within:border-zinc-500" data-testid="market-card" key={market.id}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                      <span>{CATEGORY_CATALOG.find((c) => c.id === (match.category ?? "integrals"))?.label} · Match #{match.number}</span>
                      <span>{match.isDemo ? "DEMO" : match.mode === "mock" ? "MOCK" : match.status === "live" || match.status === "review" ? "LIVE" : ""}</span>
                    </div>
                    <MarketTile href={`/match/${match.id}#bet-slip`} market={market} names={names} now={now} closesAt={match.bettingClosesAt} size="l" teamMarket={match.category === "squads"} />
                  </article>
                ))}
              </div>
              {visible.length > shown && <button className="mt-5 min-h-11 w-full rounded-lg border border-zinc-700 px-4 text-sm font-semibold text-white hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-white" onClick={() => setShown((n) => n + 24)} type="button">Show more markets ({visible.length - shown} remaining)</button>}</>
            ) : (
              <div aria-live="polite" className="rounded-xl border border-zinc-800 px-6 py-12" data-testid="category-empty">
                <h2 className="text-lg font-bold text-white">{rows.length ? "No matching markets" : `No ${categoryInfo?.label ?? "prediction"} markets yet`}</h2>
                <p className="mt-2 text-sm text-zinc-400">{rows.length ? "Try another search or market status." : "Markets appear here when the next match is announced."}</p>
              </div>
            )}
          </section>
          <aside aria-label="Account and market activity" className="space-y-6 border-t border-zinc-800 pt-6 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
            {fight && <SidebarSection title="In the arena"><Link className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold text-white hover:text-emerald-300" to={`/match/${fight.id}`}><span className="flex items-center gap-2"><Swords className="size-4" /> Watch Match #{fight.number}</span><ArrowUpRight className="size-4" /></Link></SidebarSection>}
            <SidebarSection title={me.signedIn ? "Your account" : "Join the market"}><div className="min-h-52"><AccountWidget me={me} register={s.register} /></div></SidebarSection>
            <SidebarSection title="Recent results"><ResultsWidget results={results} /></SidebarSection>
            <SidebarSection title="Market activity"><BetFeedWidget feed={feed} /></SidebarSection>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
