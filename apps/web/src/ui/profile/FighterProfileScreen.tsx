import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Swords } from "lucide-react";
import { useStore } from "@/data/store";
import { FighterCard } from "@/ui/card";
import { FormChips } from "@/ui/leaderboard/LeaderboardScreen";
import { selectLeaderboard, selectProfile } from "@/ui/leaderboard/selectors";
import { needsDemo } from "@/ui/lobby/selectors";
import { AppShell } from "@/ui/shell";

const Stat = ({ k, v }: { k: string; v: string | number }) => (
  <div className="rounded-xl bg-zinc-950 px-3 py-2.5 ring-1 ring-zinc-900"><div className="text-[11px] text-zinc-500 uppercase tracking-wider">{k}</div><div className="font-semibold text-lg text-zinc-50 tabular-nums">{v}</div></div>
);

export function FighterProfileScreen({ id }: { id: string }) {
  const conn = useStore((s) => s.conn);
  const matches = useStore((s) => s.matches);
  const fighters = useStore((s) => s.fighters);
  const openMatchId = useStore((s) => s.openMatchId);
  useEffect(() => { if (needsDemo({ conn, matches })) useStore.getState().openReplay("mock-basic", 4); }, [conn, matches]);
  const vm = useMemo(() => selectProfile({ fighters, matches, openMatchId }, id), [fighters, matches, openMatchId, id]);
  const rank = useMemo(() => selectLeaderboard({ fighters }).find((r) => r.id === id)?.rank ?? null, [fighters, id]);

  if (!vm) {
    return (
      <AppShell wide>
        <main className="mx-auto max-w-[1000px] px-6 py-24 text-center">
          <p className="text-zinc-400">{Object.keys(fighters).length === 0 ? "Loading fighter…" : "Fighter not found."}</p>
          <Link className="mt-4 inline-block text-[13px] text-zinc-300 underline" to="/leaderboard">Back to leaderboard</Link>
        </main>
      </AppShell>
    );
  }
  const f = vm.fighter;
  return (
    <AppShell wide>
      <main className="mx-auto grid max-w-[1000px] gap-10 px-4 pt-8 pb-16 sm:px-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col items-center gap-2 lg:items-start">
          <FighterCard fighter={f} flippable size="lg" />
          <p className="text-[11px] text-zinc-600">Tap the card to flip.</p>
        </div>
        <div className="min-w-0">
          <Link className="text-[13px] text-zinc-500 hover:text-zinc-300" to="/leaderboard">← Leaderboard</Link>
          <p className="mt-3 text-[13px] text-zinc-500">{f.title}</p>
          <h1 className="font-semibold text-4xl text-zinc-50 tracking-tight">{f.name}</h1>
          <p className="mt-2 text-zinc-300 italic">“{f.catchphrase}”</p>
          <p className="mt-3 max-w-prose text-[14px] text-zinc-400">{f.bio}</p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            <div><dt className="inline text-zinc-500">Creator </dt><dd className="inline text-zinc-200">{vm.creator}</dd></div>
            <div><dt className="inline text-zinc-500">Type </dt><dd className="inline text-zinc-200">{vm.originText}</dd></div>
            <div><dt className="inline text-zinc-500">Archetype </dt><dd className="inline text-zinc-200 capitalize">{vm.archetype}</dd></div>
          </dl>
          <p className="mt-3 rounded-xl bg-zinc-950 px-4 py-3 text-[13px] text-zinc-300 ring-1 ring-zinc-900"><span className="text-zinc-500">Strategy · </span>{f.strategyBlurb}</p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat k="Elo" v={f.elo} /><Stat k="Rank" v={rank ? `#${rank}` : "–"} /><Stat k="W-L" v={f.stats ? `${f.stats.wins}-${Math.max(0, f.stats.matches - f.stats.wins)}` : "–"} /><Stat k="Win %" v={vm.winPct} />
          </div>
          <div className="mt-3 flex items-center gap-2 text-[12px] text-zinc-500">Form <FormChips form={f.stats?.form ?? ""} /></div>

          {vm.next && (
            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 ring-1 ring-zinc-800">
              <div><div className="text-[11px] text-zinc-500 uppercase tracking-wider">Next match</div><div className="font-medium text-zinc-100">Match #{vm.next.number}</div></div>
              <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 font-medium text-[13px] text-zinc-950 hover:bg-white" to={vm.next.href}><Swords className="size-3.5" /> {vm.next.isOpen ? "Bet now" : "Watch"}</Link>
            </div>
          )}

          <h2 className="mt-8 mb-2 font-semibold text-lg text-zinc-50">Match history</h2>
          {vm.history.length === 0 ? (
            <p className="text-[13px] text-zinc-500">No completed matches yet.</p>
          ) : (
            <ul className="overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-900">
              {vm.history.map((h) => (
                <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-zinc-900 border-t px-4 py-3 text-[13px] first:border-t-0" key={h.matchId}>
                  <span className="font-medium text-zinc-100">Match #{h.number}</span>
                  <span className={h.won ? "font-semibold text-emerald-400" : "text-zinc-500"}>{h.status === "void" ? "Void" : h.won ? "Won" : "Lost"}</span>
                  <span className="min-w-0 truncate text-zinc-500">vs {h.opponents.join(", ")}</span>
                  <span className="ml-auto flex gap-3"><Link className="text-zinc-300 underline" to={h.resultsHref}>Replay</Link><Link className="text-zinc-300 underline" to={h.receiptHref}>Receipt</Link></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </AppShell>
  );
}
