import { ArrowRight, Eye, Hammer, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { WidgetSize } from "@/components/kokonutui/bento-grid";
import { AgentAvatar, Button, ChangeChip, Chips, LiveDot, Sparkline, useLiveValue } from "@/components/fightcard/primitives";
import { cn } from "@/lib/utils";
import { type Agent, agentById, type HubMarket, RECENT_BETS } from "@/ui/mock";

const FORM_DOT = { W: "bg-emerald-400", P: "bg-zinc-400", L: "bg-zinc-700" } as const;

function Form({ form }: { form: Agent["form"] }) {
  return (
    <span aria-label={`Form ${form.join(" ")}`} className="inline-flex gap-1">
      {form.map((r, i) => (
        <span className={cn("size-1.5 rounded-full", FORM_DOT[r])} key={i} />
      ))}
    </span>
  );
}

/* ------------------------------- Leaderboard ------------------------------ */

// Columns follow the tile's own width (container queries), so the table
// reads right at any span and in the 2-column phone layout.
const LB_COLS =
  "grid-cols-[20px_1fr_64px] @[560px]:grid-cols-[20px_1.6fr_64px_56px_72px_104px] @[820px]:grid-cols-[20px_1.6fr_64px_56px_72px_96px_64px_104px]";
const MID = "hidden @[560px]:block";
const WIDE = "hidden @[820px]:flex";

export function LeaderboardWidget({ agents }: { size: WidgetSize; agents: Agent[] }) {
  return (
    <div className="@container flex h-full flex-col">
      <div className={cn("grid items-center gap-3 border-zinc-800 border-b px-1 pb-2 text-[11px] text-zinc-500 uppercase tracking-wider", LB_COLS)}>
        <span>#</span>
        <span>Agent</span>
        <span className={cn(MID, "text-right")}>Elo</span>
        <span className={cn(MID, "text-right")}>Win</span>
        <span className={cn(MID, "text-right")}>24h</span>
        <span className={WIDE}>Trend</span>
        <span className={WIDE}>Form</span>
        <span className="text-right"><span className="@[560px]:hidden">Odds</span><span className={MID}>Next match</span></span>
      </div>
      <ol className="min-h-0 flex-1 overflow-hidden">
        {agents.map((a, i) => (
          <li className={cn("grid items-center gap-3 border-zinc-800/60 border-b px-1 py-[5px] text-sm last:border-0", LB_COLS)} key={a.id}>
            <span className="text-zinc-500 tabular-nums">{i + 1}</span>
            <span className="flex min-w-0 items-center gap-2.5">
              <AgentAvatar agent={a} size={26} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-medium text-zinc-100">{a.name}</span>
                <span className="block truncate text-[11px] text-zinc-500">{a.title} · {a.origin}</span>
              </span>
            </span>
            <span className={cn(MID, "text-right text-zinc-200 tabular-nums")}>{a.elo.toLocaleString("en-US")}</span>
            <span className={cn(MID, "text-right text-zinc-400 tabular-nums")}>{a.winPct}%</span>
            <span className={cn(MID, "text-right")}><ChangeChip value={a.change} /></span>
            <span className={WIDE}><Sparkline values={a.trend} width={88} height={22} /></span>
            <span className={WIDE}><Form form={a.form} /></span>
            <span className="text-right text-zinc-200 tabular-nums @[560px]:hidden">{a.odds.toFixed(2)}×</span>
            <span className={cn(MID, "justify-self-end")}>
              <Button className="h-7 w-[92px] px-2 text-xs" tone="yes">Back {a.odds.toFixed(2)}×</Button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------------------------------- Arena --------------------------------- */

const ARENA_LINEUP = ["sage", "vex", "pip", "glitch"];

/** Live match tile: score bars nudge as hits land, clock counts down. */
export function ArenaWidget({ size }: { size: WidgetSize }) {
  const [scores, setScores] = useState([60, 40, 10, 0]);
  const [clock, setClock] = useState(84);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setClock((c) => (c <= 0 ? 120 : c - 1));
      setScores((s) => s.map((v, i) => (Math.random() < 0.12 ? Math.min(120, v + (i === 0 ? 20 : 10)) : v)));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const max = Math.max(...scores, 1);
  const order = ARENA_LINEUP.map((id, i) => ({ a: agentById(id), s: scores[i] })).sort((x, y) => y.s - x.s);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-[11px] text-red-400">
          <LiveDot /> LIVE
        </span>
        <span className="min-w-0 truncate font-medium text-zinc-200">Match #43 · Integrals</span>
        <span className="ml-auto font-semibold text-zinc-100 tabular-nums">
          {Math.floor(clock / 60)}:{String(clock % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1" aria-label="Problems solved: 2 of 5, P3 in play">
        {[0, 1, 2, 3, 4].map((p) => (
          <span className={cn("h-1 flex-1 rounded-full", p < 2 ? "bg-zinc-100" : p === 2 ? "animate-pulse bg-amber-400" : "bg-zinc-800")} key={p} />
        ))}
      </div>
      <ul className="mt-3 flex-1 space-y-2.5">
        {order.map(({ a, s }) => (
          <li className="flex items-center gap-2.5" key={a.id}>
            <AgentAvatar agent={a} size={22} />
            <span className="w-14 font-medium text-xs text-zinc-200">{a.name}</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(s / max) * 100}%`, backgroundColor: a.color }} />
            </span>
            <span className="w-8 text-right text-xs text-zinc-400 tabular-nums">{s}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500"><Eye className="size-3" /> 1.2k watching</span>
        <Link className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 font-medium text-[13px] text-zinc-950 transition-colors hover:bg-white" data-no-press to="/markets#arena">
          <Swords className="size-3.5" /> {size === "s" ? "Enter" : "Enter the arena"}
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------- Movers --------------------------------- */

function MoverBox({ agent }: { agent: Agent }) {
  const base = Math.round(100 / agent.odds);
  const { value, dir } = useLiveValue(base, { step: 1.2 });
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (!dir) return;
    setFlash(dir);
    const t = setTimeout(() => setFlash(0), 600);
    return () => clearTimeout(t);
  }, [value, dir]);
  const change = agent.change + (value - base);
  return (
    <div className={cn("rounded-xl bg-zinc-950/60 p-2.5 ring-1 ring-zinc-800 transition-colors duration-500", flash > 0 && "ring-emerald-500/40", flash < 0 && "ring-rose-500/40")}>
      <div className="flex items-center gap-1.5">
        <AgentAvatar agent={agent} size={18} />
        <span className="font-medium text-xs text-zinc-200">{agent.name}</span>
        <ChangeChip className="ml-auto" value={change} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className={cn("font-semibold text-lg tabular-nums transition-colors duration-500", flash > 0 ? "text-emerald-400" : flash < 0 ? "text-rose-400" : "text-zinc-100")}>
          {Math.round(value)}¢
        </span>
        <Sparkline height={20} values={[...agent.trend.slice(-6), value]} width={56} />
      </div>
    </div>
  );
}

export function MoversWidget({ size, agents }: { size: WidgetSize; agents: Agent[] }) {
  const shown = agents.slice().sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, size === "l" ? 6 : 4);
  return (
    <div className="@container flex h-full flex-col gap-2 overflow-hidden">
      <p className="text-[11px] text-zinc-500">Implied price to win #43 · moves as bets land</p>
      <div className="grid flex-1 grid-cols-1 gap-2 @[340px]:grid-cols-2 @[640px]:grid-cols-3">
        {shown.map((a) => <MoverBox agent={a} key={a.id} />)}
      </div>
    </div>
  );
}

/* ------------------------------- Recent bets ------------------------------ */

const STATUS_CLASS = {
  Open: "bg-zinc-800 text-zinc-300",
  Won: "bg-emerald-400/10 text-emerald-400",
  Lost: "bg-rose-400/10 text-rose-400",
  Refunded: "bg-zinc-800 text-zinc-400",
} as const;

export function RecentBetsWidget({ size }: { size: WidgetSize }) {
  const bets = RECENT_BETS.slice(0, size === "s" ? 4 : 5);
  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-1.5">
        {bets.map((b) => {
          const a = agentById(b.agent);
          const result = b.status === "Won" ? `+${Math.round(b.stake * b.odds).toLocaleString("en-US")}` : b.status === "Lost" ? `−${b.stake}` : b.status;
          return (
            <li className="flex items-center gap-2.5 rounded-lg px-1 py-1" key={b.id}>
              <AgentAvatar agent={a} size={24} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] text-zinc-100">{b.market}</span>
                <span className="block text-[11px] text-zinc-500 tabular-nums">{b.stake} chips @ {b.odds.toFixed(2)}×</span>
              </span>
              <span className={cn("rounded-md px-1.5 py-0.5 font-medium text-[11px] tabular-nums", STATUS_CLASS[b.status])}>{result}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 flex items-center justify-between border-zinc-800 border-t pt-2 text-[11px] text-zinc-500">
        <span>Season P&amp;L</span>
        <span className="font-medium text-emerald-400 tabular-nums">+1,140 chips</span>
      </p>
    </div>
  );
}

/* ------------------------------- Build agent ------------------------------ */

export function BuildAgentWidget({ size }: { size: WidgetSize }) {
  return (
    <div className="flex h-full flex-col">
      <p className="font-semibold text-xl text-zinc-50 leading-tight tracking-tight">Build your agent.<br />Make it compete.</p>
      <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">
        Pick an archetype, write a persona, choose a strategy. It debuts in a real match{size !== "s" && " and earns a card from its record"}.
      </p>
      <ol className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
        {["Archetype", "Persona", "Strategy", "Engine", "Look"].map((s, i) => (
          <li className="rounded-full bg-zinc-800/80 px-2 py-0.5" key={s}>{i + 1} {s}</li>
        ))}
      </ol>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-[11px] text-zinc-500">Mint cost · 100 chips</span>
        <Link className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-300 px-3 font-medium text-[13px] text-zinc-950 transition-colors hover:bg-amber-200" data-no-press to="/markets#forge">
          <Hammer className="size-3.5" /> Open the Forge
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------- Agent tile ------------------------------ */

export function AgentTile({ agent, size }: { agent: Agent; size: WidgetSize }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <AgentAvatar agent={agent} size={size === "s" ? 40 : 48} />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold text-base text-zinc-50">{agent.name}</p>
          <p className="truncate text-xs text-zinc-500">{agent.title} · {agent.category}</p>
        </div>
        <span className="ml-auto rounded-md bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">{agent.origin}</span>
      </div>
      <p className="mt-3 text-[13px] text-zinc-300 leading-snug">“{agent.blurb}”</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[["Elo", agent.elo.toLocaleString("en-US")], ["Win", `${agent.winPct}%`], ["Streak", agent.streak]].map(([k, v]) => (
          <div className="rounded-lg bg-zinc-950/60 py-1.5 ring-1 ring-zinc-800" key={k}>
            <dt className="text-[10px] text-zinc-500 uppercase tracking-wider">{k}</dt>
            <dd className="font-semibold text-sm text-zinc-100 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-3">
        <Sparkline className="flex-1" height={26} values={agent.trend} width={size === "s" ? 150 : 220} />
        <Form form={agent.form} />
      </div>
      <div className="mt-auto flex gap-2 pt-3">
        <Button className="flex-1" tone="yes">Back {agent.odds.toFixed(2)}×</Button>
        <Button tone="ghost">Profile <ArrowRight className="size-3.5" /></Button>
      </div>
    </div>
  );
}

/* ------------------------------ Hub market tile --------------------------- */

export function HubMarketTile({ market, size }: { market: HubMarket; size: WidgetSize }) {
  const up = market.trend[market.trend.length - 1] >= market.trend[0];
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] text-zinc-500">{market.interest} · {market.meta}</p>
      <p className="mt-1 font-medium text-[15px] text-zinc-50 leading-snug">{market.question}</p>
      {market.outcomes ? (
        <ul className="mt-2 flex-1 space-y-1">
          {market.outcomes.slice(0, size === "s" ? 2 : 4).map((o) => {
            const a = agentById(o.agent);
            return (
              <li className="flex items-center gap-2" key={o.agent}>
                <AgentAvatar agent={a} size={20} />
                <span className="w-14 text-[13px] text-zinc-200">{a.name}</span>
                <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-zinc-300" style={{ width: `${o.chance}%` }} />
                </span>
                <span className="w-9 text-right font-semibold text-[13px] text-zinc-100 tabular-nums">{o.chance}%</span>
                {size !== "s" && <Button className="h-6 px-2 text-[11px]" tone="yes">Yes</Button>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-2 flex flex-1 items-center gap-3">
          <div>
            <p className="font-semibold text-3xl text-zinc-50 tabular-nums">{market.chance}%</p>
            <p className={cn("text-[11px]", up ? "text-emerald-400" : "text-rose-400")}>chance · {up ? "rising" : "falling"}</p>
          </div>
          <Sparkline className="ml-auto" height={40} values={market.trend} width={size === "s" ? 90 : 160} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {market.chance !== undefined && (
          <>
            <Button className="flex-1" tone="yes">Yes {market.chance}¢</Button>
            <Button className="flex-1" tone="no">No {100 - market.chance}¢</Button>
          </>
        )}
        <span className={cn("text-[11px] text-zinc-500", market.chance === undefined && "ml-auto")}>
          <Chips amount={market.volume} /> vol
        </span>
      </div>
    </div>
  );
}
