import { useEffect, useMemo, useState } from "react";
import { CATEGORY_CATALOG, type Category } from "@fc/contracts";
import { Link } from "react-router-dom";
import { Tabs } from "@/components/fightcard/primitives";
import { useStore } from "@/data/store";
import { FighterCard } from "@/ui/card";
import { formChips } from "@/ui/card/helpers";
import { needsDemo } from "@/ui/lobby/selectors";
import { AppShell } from "@/ui/shell";
import { type BoardFilter, type BoardTab, type LeaderRow, selectLeaderboard } from "./selectors";

const TABS: { id: BoardTab; label: string }[] = CATEGORY_CATALOG.map((c) => ({ id: c.id as Category, label: c.label }));
const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "house", label: "House" },
  { id: "community", label: "Community" },
];
const CHIP: Record<string, string> = { W: "bg-emerald-400/90 text-zinc-950", P: "bg-zinc-300 text-zinc-950", L: "bg-zinc-800 text-zinc-500" };

export function FormChips({ form }: { form: string }) {
  const chips = formChips(form);
  if (!chips.length) return <span className="text-zinc-600">–</span>;
  return (
    <span aria-label={`Form ${form}`} className="inline-flex gap-1">
      {chips.map((c, i) => <span className={`grid size-5 place-items-center rounded font-semibold text-[10px] ${CHIP[c.result]}`} key={i}>{c.result}</span>)}
    </span>
  );
}

const Num = ({ children }: { children: React.ReactNode }) => <span className="text-right text-zinc-300 tabular-nums">{children}</span>;
const COLS = "grid-cols-[2rem_minmax(0,1.6fr)_3rem_3.5rem_4rem_3.5rem_3.5rem_6.5rem_6.5rem]";

function Name({ r }: { r: LeaderRow }) {
  return (
    <Link className="flex min-w-0 items-center gap-3 hover:text-white" to={r.href}>
      <span className="size-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-zinc-800" style={{ backgroundColor: `${r.color}22` }}>
        <span className="block origin-top-left" style={{ transform: "scale(0.3)", width: 120, height: 168 }}><FighterCard fighter={r.fighter} size="xs" /></span>
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-semibold text-sm text-zinc-50">{r.name}</span>
        <span className="block truncate text-[11px] text-zinc-500">{r.title} · {r.origin === "house" ? "House" : "Community"}</span>
      </span>
    </Link>
  );
}

function Row({ r }: { r: LeaderRow }) {
  return (
    <li className="border-zinc-900 border-t">
      {/* desktop */}
      <div className={`hidden items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-zinc-900/50 md:grid ${COLS}`}>
        <span className="font-semibold text-zinc-500 tabular-nums">{r.rank}</span>
        <Name r={r} />
        <Num>{r.ovr ?? "–"}</Num><Num>{r.elo}</Num><Num>{r.record}</Num><Num>{r.winPct}</Num><Num>{r.avgScore}</Num>
        <FormChips form={r.form} />
        <Num>{r.backers}</Num>
      </div>
      {/* phone */}
      <Link className="flex flex-col gap-2 px-4 py-3 md:hidden" to={r.href}>
        <div className="flex items-center gap-3">
          <span className="w-5 font-semibold text-sm text-zinc-500 tabular-nums">{r.rank}</span>
          <Name r={r} />
          <span className="ml-auto text-right leading-tight"><span className="block font-semibold text-sm text-zinc-50 tabular-nums">{r.elo}</span><span className="text-[10px] text-zinc-500">Elo</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-8 text-[11px] text-zinc-400 tabular-nums">
          <span>OVR {r.ovr ?? "–"}</span><span>{r.record}</span><span>{r.winPct}</span><span>Avg {r.avgScore}</span><span>{r.backers}</span><FormChips form={r.form} />
        </div>
      </Link>
    </li>
  );
}

export function LeaderboardScreen() {
  const [tab, setTab] = useState<BoardTab>("integrals");
  const [filter, setFilter] = useState<BoardFilter>("all");
  const conn = useStore((s) => s.conn);
  const matches = useStore((s) => s.matches);
  const fighters = useStore((s) => s.fighters);
  useEffect(() => { if (needsDemo({ conn, matches })) useStore.getState().openReplay("mock-basic", 4); }, [conn, matches]);
  const rows = useMemo(() => selectLeaderboard({ fighters }, tab, filter), [fighters, tab, filter]);

  return (
    <AppShell wide>
      <main className="mx-auto max-w-[1100px] px-4 pt-8 pb-16 sm:px-6">
        <p className="text-[13px] text-zinc-500">Global ranking by Elo</p>
        <h1 className="mb-6 font-semibold text-3xl text-zinc-50 tracking-tight">Leaderboard</h1>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs label="Category" onChange={setTab} tabs={TABS} value={tab} />
          <Tabs label="Origin" onChange={setFilter} tabs={FILTERS} value={filter} />
        </div>
        {rows.length === 0 ? (
          <p className="rounded-xl bg-zinc-950 px-4 py-12 text-center text-[13px] text-zinc-500 ring-1 ring-zinc-900">No fighters match this filter yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-900">
            <div className={`hidden gap-3 px-4 py-2.5 text-[11px] text-zinc-500 uppercase tracking-wider md:grid ${COLS}`}>
              <span>#</span><span>Fighter</span><span className="text-right">OVR</span><span className="text-right">Elo</span><span className="text-right">W-L</span>
              <span className="text-right">Win %</span><span className="text-right">Avg</span><span>Form</span><span className="text-right">Backers won</span>
            </div>
            <ul>{rows.map((r) => <Row key={r.id} r={r} />)}</ul>
          </div>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">Backer winnings in dollars (ledger mode, no funds moved). Fighter purse is paid in USDC.</p>
      </main>
    </AppShell>
  );
}
