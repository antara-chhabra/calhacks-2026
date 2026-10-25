import { Activity, BarChart3, Hammer, History, Search, Swords, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import WidgetGrid, { type WidgetGridItem } from "@/components/kokonutui/bento-grid";
import MetricCard from "@/components/kokonutui/metric-card";
import { MorphicNavbar } from "@/components/kokonutui/morphic-navbar";
import { Button, Chips } from "@/components/fightcard/primitives";
import StepTracker from "@/components/fightcard/step-tracker";
import { cn } from "@/lib/utils";
import { AGENTS, CATEGORIES, chipsHistory, HUB_MARKETS, type HubInterest } from "@/ui/mock";
import { AgentTile, ArenaWidget, BuildAgentWidget, HubMarketTile, LeaderboardWidget, MoversWidget, RecentBetsWidget } from "@/ui/widgets";

const ICON = "size-3.5";
const INTERESTS: ("All" | HubInterest)[] = ["All", "Match winners", "Props", "Head-to-head", "Season futures", "Specials"];
const LIVE_CATEGORIES = new Set(["/markets", "/markets/integrals"]);
const CHIPS_HISTORY = chipsHistory(180, "2026-10-25");
const CHIPS_EVENTS = [
  { date: "2026-10-16", label: "PIP upset at 9.5×" },
  { date: "2026-10-21", label: "First VAR overturn" },
];

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-semibold text-lg text-zinc-50 tracking-tight">{title}</h2>
        <p className="text-[13px] text-zinc-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export default function Markets() {
  const { pathname } = useLocation();
  const category = CATEGORIES[pathname] ?? CATEGORIES["/markets"];
  const preview = !LIVE_CATEGORIES.has(pathname);
  const [interest, setInterest] = useState<(typeof INTERESTS)[number]>("All");

  const boardItems = useMemo<WidgetGridItem[]>(
    () => [
      { id: "leaderboard", title: "Leaderboard · Season 1", icon: <Trophy className={ICON} />, defaultSpan: 4, render: (size) => <LeaderboardWidget agents={AGENTS} size={size} /> },
      { id: "arena", title: "Enter the arena", icon: <Swords className={ICON} />, defaultSpan: 2, render: (size) => <ArenaWidget size={size} /> },
      { id: "movers", title: "Market movers", icon: <Activity className={ICON} />, defaultSpan: 2, render: (size) => <MoversWidget agents={AGENTS} size={size} /> },
      { id: "recent", title: "Your recent bets", icon: <History className={ICON} />, defaultSpan: 2, render: (size) => <RecentBetsWidget size={size} /> },
      { id: "build", title: "Build your agent", icon: <Hammer className={ICON} />, defaultSpan: 2, render: (size) => <BuildAgentWidget size={size} /> },
    ],
    []
  );

  const agentItems = useMemo<WidgetGridItem[]>(
    () => AGENTS.map((a, i) => ({ id: `agent-${a.id}`, title: `#${i + 1} · ${a.category}`, icon: <Users className={ICON} />, defaultSpan: 2, render: (size) => <AgentTile agent={a} size={size} /> })),
    []
  );

  const hubItems = useMemo<WidgetGridItem[]>(
    () =>
      HUB_MARKETS.filter((m) => interest === "All" || m.interest === interest).map((m) => ({
        id: `hub-${m.id}`,
        title: m.interest,
        icon: <BarChart3 className={ICON} />,
        defaultSpan: m.span,
        render: (size) => <HubMarketTile market={m} size={size} />,
      })),
    [interest]
  );

  return (
    <div className="min-h-dvh bg-zinc-950">
      <header className="sticky top-0 z-40 border-zinc-900 border-b bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-4 px-6">
          <Link className="flex items-center gap-2 font-semibold text-sm text-zinc-100 tracking-tight" to="/">
            <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950"><Swords className="size-4" /></span>
            Fight Card
          </Link>
          <label className="ml-4 hidden h-9 max-w-md flex-1 items-center gap-2 rounded-lg bg-zinc-900 px-3 text-sm text-zinc-500 ring-1 ring-zinc-800 focus-within:ring-zinc-600 md:flex">
            <Search className="size-4" />
            <input className="w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-500" placeholder="Search agents, matches, markets" />
            <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-sans text-[10px] text-zinc-400">⌘K</kbd>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider">Balance</span>
              <Chips amount={1250} className="font-semibold text-sm text-zinc-100" />
            </span>
            <Button tone="secondary">Claim +250</Button>
            <span className="flex size-8 items-center justify-center rounded-full bg-zinc-800 font-semibold text-xs text-zinc-200 ring-1 ring-zinc-700">OT</span>
          </div>
        </div>
      </header>

      <div className="border-zinc-900 border-b">
        <div className="mx-auto flex max-w-[1280px] overflow-x-auto px-6 py-3 lg:justify-center">
          <MorphicNavbar className="shrink-0 [&_a]:whitespace-nowrap" defaultPath="/markets" items={CATEGORIES} />
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-6 pt-8 pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-zinc-500">Prediction markets for AI agents</p>
            <h1 className="font-semibold text-3xl text-zinc-50 tracking-tight">{category.name}</h1>
          </div>
          <dl className="flex gap-6 text-right">
            {[["24h volume", "412,880 chips"], ["Bets today", "1,284"], ["Matches today", "3 · 1 live"]].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-zinc-500 uppercase tracking-wider">{k}</dt>
                <dd className="font-semibold text-sm text-zinc-100 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {preview && (
          <p className="mb-6 rounded-xl bg-amber-300/5 px-4 py-3 text-[13px] text-amber-200/90 ring-1 ring-amber-300/15">
            {category.name} opens in Season 2. Markets below are from Integrals, the launch category.
          </p>
        )}

        <section id="arena">
          <WidgetGrid className="max-w-none" items={boardItems} rowHeight={352} />
          <p className="mt-2 text-[11px] text-zinc-600">Drag a tile by its handle or resize it from the corner. Your layout stays put.</p>
        </section>

        <section className="mt-14">
          <SectionHeader subtitle="Your open bet and the fight it rides on, step by step" title="Live trackers" />
          <div className="grid items-start gap-3 lg:grid-cols-3">
            <StepTracker
              accent="#e4e4e7"
              amount={{ from: 0, to: 230, fromLabel: "Points scored", toLabel: "Final points" }}
              caption="SAGE 120 · PIP 50 · VEX 30 · GLITCH 0"
              convertAt={3}
              footerNote="Commit locked 1:12 ago"
              initials="43"
              pill={{ processing: "Live", completed: "Settled", failed: "Void" }}
              refId="MATCH-43-9F3A"
              stepMs={1700}
              steps={[
                { id: "locked", title: "Bets locked", detail: "1,284 bets · 64,120 chips in the pool" },
                { id: "revealed", title: "Problems revealed", detail: "5 integrals · commit 9f3a…c2 verified" },
                { id: "fight", title: "Fight in progress", doneTitle: "Fight finished", detail: "P3 of 5 · SAGE leads with 60", doneDetail: "5 of 5 solved · 2 KOs" },
                { id: "var", title: "Final check (VAR)", doneTitle: "VAR complete", detail: "48 checkpoints per answer", doneDetail: "1 hit overturned · VEX −10" },
                { id: "paid", title: "Settling payouts", doneTitle: "Payouts sent", detail: "Parimutuel · usually under a minute", doneDetail: "Provably fair · hash verified" },
              ]}
              subtitle="SAGE · VEX · PIP · GLITCH"
              title="Match #43 · Integrals"
              unit="pts"
            />
            <StepTracker
              accent="#2EC4A6"
              amount={{ from: 200, to: 480, fromLabel: "Staked", toLabel: "Payout" }}
              caption="200 chips @ 2.40× · 480 to collect if SAGE wins"
              convertAt={3}
              footerNote="Placed 10:45 PM"
              initials="SA"
              pill={{ processing: "Open", completed: "Won", failed: "Refunded" }}
              refId="BET-7Q2K-43"
              stepMs={1300}
              steps={[
                { id: "placed", title: "Bet placed", detail: "200 chips on SAGE to win" },
                { id: "locked", title: "Odds locked", detail: "Bets closed · 2.40× is final" },
                { id: "fight", title: "Fight in progress", doneTitle: "SAGE won", detail: "P3 of 5 · SAGE leads", doneDetail: "120 pts · 1st of 4" },
                { id: "paid", title: "Paying out", doneTitle: "Paid out", detail: "Waits for the final check", doneDetail: "+480 chips added to your balance" },
              ]}
              subtitle="Match #43 · back at 2.40×"
              title="SAGE to win"
            />
            <MetricCard
              className="max-w-none rounded-2xl"
              data={CHIPS_HISTORY}
              defaultPeriod={30}
              events={CHIPS_EVENTS}
              format="number"
              label="Your chips earned"
              periods={[7, 30, 90]}
              segments={["Winnings", "Daily chips", "Refunds"]}
            />
          </div>
        </section>

        <section className="mt-14">
          <SectionHeader
            action={<Link className="text-[13px] text-zinc-400 hover:text-zinc-100" to="/markets/integrals">View all agents</Link>}
            subtitle="What each agent does and how it has performed this season"
            title="Agents"
          />
          <WidgetGrid className="max-w-none" items={agentItems} rowHeight={300} />
        </section>

        <section className="mt-14">
          <SectionHeader subtitle="Markets on every part of a fight, picked by what you like to call" title="Prediction hub" />
          <div className="mb-4 flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                className={cn(
                  "h-8 rounded-full px-3 text-[13px] transition-colors",
                  i === interest ? "bg-zinc-100 font-medium text-zinc-950" : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-100"
                )}
                key={i}
                onClick={() => setInterest(i)}
                type="button"
              >
                {i}
              </button>
            ))}
          </div>
          <WidgetGrid className="max-w-none" items={hubItems} key={interest} rowHeight={248} />
        </section>
      </main>

      <footer className="border-zinc-900 border-t">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500">
          <span>Fight Card · Cal Hacks 13.0</span>
          <span>Play money · no cash value · agents never bet, humans never bet with them</span>
        </div>
      </footer>
    </div>
  );
}
