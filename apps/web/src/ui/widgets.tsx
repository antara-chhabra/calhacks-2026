import { Eye, Fingerprint, Swords } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import type { WidgetSize } from "@/components/kokonutui/bento-grid";
import { AgentAvatar, Button, LiveDot } from "@/components/fightcard/primitives";
import { cn } from "@/lib/utils";
import type { MarketView } from "@/data/store";
import {
  avatarOf, countdown, type FeedVM, type FighterVM, impliedPct, isValidHandle, type LiveVM, type MeVM, type PosterVM,
  registerErrorText, type ResultVM, suggestHandle,
} from "@/ui/lobby/selectors";

const EMPTY = "flex h-full items-center justify-center text-center text-[13px] text-zinc-500";

/* ------------------------------ Fight-night poster ------------------------------ */

export function PosterWidget({ poster, now, size }: { poster: PosterVM | null; now: number; size: WidgetSize }) {
  if (!poster) return <p className={EMPTY}>No fight scheduled yet. The next card is announced here.</p>;
  const left = countdown(poster.closesAt, now);
  return (
    <div className="@container flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-[11px] text-zinc-950 uppercase tracking-wider">Fight night</span>
        <span className="font-medium text-zinc-200">Match #{poster.number}</span>
        <span className="ml-auto text-zinc-500 tabular-nums">
          {poster.isOpen ? <>Bets close <span className="font-semibold text-zinc-100">{left}</span></> : <span className="uppercase">{poster.status}</span>}
        </span>
      </div>
      <ul className="mt-3 grid flex-1 grid-cols-2 gap-2 @[560px]:grid-cols-4">
        {poster.fighters.map((f) => (
          <li className="flex flex-col rounded-xl bg-zinc-950/60 p-3 ring-1 ring-zinc-800" key={f.id} style={{ boxShadow: `inset 0 2px 0 ${f.color}` }}>
            <div className="flex items-center gap-2">
              <AgentAvatar agent={avatarOf(f)} size={size === "s" ? 24 : 30} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold text-sm text-zinc-50">{f.name}</span>
                <span className="block truncate text-[11px] text-zinc-500">{f.title}</span>
              </span>
            </div>
            <div className="mt-auto flex items-end justify-between pt-3">
              <span className="font-semibold text-2xl text-zinc-50 tabular-nums">{f.oddsText}<span className="text-sm text-zinc-500">×</span></span>
              <span className="text-[11px] text-zinc-400 tabular-nums">{f.impliedPct === null ? "–" : `${f.impliedPct}%`}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500" title={poster.commitHash}>
          <Fingerprint className="size-3.5" /> Commit <code className="text-zinc-300">{poster.commitShort || "pending"}</code>
        </span>
        <span className="text-[11px] text-zinc-500">Pool {poster.poolText}</span>
        <Link className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 font-medium text-[13px] text-zinc-950 transition-colors hover:bg-white" data-no-press to={poster.href}>
          <Swords className="size-3.5" /> {poster.isOpen ? "Bet now" : "Watch"}
        </Link>
      </div>
    </div>
  );
}

/* --------------------------------- Live match tile -------------------------------- */

export function LiveWidget({ live }: { live: LiveVM | null }) {
  if (!live) return <p className={EMPTY}>No match is live. The next fight starts when betting closes.</p>;
  const max = Math.max(...live.rows.map((r) => r.points), 1);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-[11px] text-red-400"><LiveDot /> LIVE</span>
        <span className="min-w-0 truncate font-medium text-zinc-200">Match #{live.number}</span>
      </div>
      <p className="mt-2 text-[12px] text-zinc-400">{live.statusLine}</p>
      <ul className="mt-3 flex-1 space-y-2.5">
        {live.rows.map(({ fighter, points }) => (
          <li className="flex items-center gap-2.5" key={fighter.id}>
            <AgentAvatar agent={avatarOf(fighter)} size={22} />
            <span className="w-14 truncate font-medium text-xs text-zinc-200">{fighter.name}</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(points / max) * 100}%`, backgroundColor: fighter.color }} />
            </span>
            <span className="w-8 text-right text-xs text-zinc-400 tabular-nums">{points}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500"><Eye className="size-3" /> Spectate</span>
        <Link className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-100 px-3 font-medium text-[13px] text-zinc-950 hover:bg-white" data-no-press to={live.href}>
          <Swords className="size-3.5" /> Watch live
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------- Recent results --------------------------------- */

export function ResultsWidget({ results }: { results: ResultVM[] }) {
  if (!results.length) return <p className={EMPTY}>Results appear here once a match settles.</p>;
  return (
    <ul className="space-y-1.5">
      {results.map((r) => (
        <li key={r.matchId}>
          <Link className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-zinc-800/50" data-no-press to={r.href}>
            {r.winner ? <AgentAvatar agent={avatarOf(r.winner)} size={24} /> : <span className="size-6" />}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] text-zinc-100">{r.winnerName} won</span>
              <span className="block text-[11px] text-zinc-500">Match #{r.number}</span>
            </span>
            <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 font-medium text-[11px] text-emerald-400">Settled</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------- Bet feed ------------------------------------ */

const FEED_STATUS: Record<string, string> = { open: "text-zinc-400", won: "text-emerald-400", lost: "text-rose-400", refunded: "text-zinc-400" };

export function BetFeedWidget({ feed }: { feed: FeedVM[] }) {
  if (!feed.length) return <p className={EMPTY}>No bets yet. Be the first on the card.</p>;
  return (
    <ul className="space-y-1.5 overflow-hidden">
      {feed.map((b) => (
        <li className="flex items-center gap-2 px-1 text-[13px]" key={b.id}>
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: b.outcomeColor }} />
          <span className={cn("min-w-0 flex-1 truncate text-zinc-200", b.mine && "font-semibold text-zinc-50")}>{b.handle} on {b.outcome}</span>
          <span className={cn("text-[11px] uppercase", FEED_STATUS[b.status])}>{b.status}</span>
          <span className="w-16 text-right text-zinc-100 tabular-nums">{b.stakeText}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------- Account: onboarding + balance --------------------------- */

export function AccountWidget({ me, register }: { me: MeVM; register: (handle: string) => Promise<void> }) {
  const [handle, setHandle] = useState(() => suggestHandle());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = isValidHandle(handle);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await register(handle);
    } catch (err) {
      setError(registerErrorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Balance</p>
      <p className="font-semibold text-3xl text-zinc-50 tabular-nums">{me.balanceText}</p>
      <p className="mt-1 text-[11px] text-zinc-500">{me.moneyModeText}</p>
      {me.signedIn ? (
        <p className="mt-auto text-[13px] text-zinc-300">Signed in as <span className="font-semibold text-zinc-50">{me.handle}</span>. Your balance is $0.00 until the Director credits test funds.</p>
      ) : (
        <form className="mt-auto space-y-2" onSubmit={submit}>
          <label className="block text-[12px] text-zinc-400" htmlFor="handle">Pick a handle to play</label>
          <div className="flex gap-2">
            <input
              aria-invalid={!valid}
              className="h-9 min-w-0 flex-1 rounded-lg bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-zinc-500"
              id="handle"
              maxLength={16}
              onChange={(e) => setHandle(e.target.value)}
              value={handle}
            />
            <Button disabled={!valid || busy} tone="yes" type="submit">Join</Button>
          </div>
          <p className={cn("text-[11px]", error ? "text-amber-300" : valid ? "text-zinc-500" : "text-rose-400")}>
            {error ?? (valid ? "3 to 16 letters, numbers or underscores." : "Use 3 to 16 letters, numbers or underscores.")}
          </p>
        </form>
      )}
    </div>
  );
}

/* ------------------------------ Fighters (odds board) ------------------------------ */

export function FightersWidget({ fighters }: { fighters: { fighter: FighterVM; oddsText: string; pct: number | null }[] }) {
  if (!fighters.length) return <p className={EMPTY}>Fighters appear when a match is announced.</p>;
  return (
    <ol className="min-h-0 flex-1 overflow-hidden">
      {fighters.map(({ fighter, oddsText, pct }, i) => (
        <li className="grid grid-cols-[20px_1fr_64px_88px] items-center gap-3 border-zinc-800/60 border-b px-1 py-[7px] text-sm last:border-0" key={fighter.id}>
          <span className="text-zinc-500 tabular-nums">{i + 1}</span>
          <span className="flex min-w-0 items-center gap-2.5">
            <AgentAvatar agent={avatarOf(fighter)} size={26} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-medium text-zinc-100">{fighter.name}</span>
              <span className="block truncate text-[11px] text-zinc-500">{fighter.title}</span>
            </span>
          </span>
          <span className="text-right text-zinc-400 tabular-nums">{pct === null ? "–" : `${pct}%`}</span>
          <span className="justify-self-end"><Button className="h-7 w-[84px] px-2 text-xs" tone="yes">Back {oddsText}×</Button></span>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------- Market tile ---------------------------------- */

export function MarketTile({ market, names, size }: { market: MarketView; names: Record<string, FighterVM>; size: WidgetSize }) {
  const rows = market.outcomes.map((o) => ({ id: o, f: names[o], odds: market.odds[o], vol: market.pools[o]?.staked ?? 0 }));
  const total = rows.reduce((a, r) => a + r.vol, 0);
  return (
    <div className="flex h-full flex-col">
      <p className="text-[11px] text-zinc-500 uppercase">{market.kind.replace("_", " ")} · {market.status}</p>
      <p className="mt-1 font-medium text-[15px] text-zinc-50 leading-snug">{market.label}</p>
      <ul className="mt-2 flex-1 space-y-1">
        {rows.slice(0, size === "s" ? 3 : 5).map((r) => (
          <li className="flex items-center gap-2" key={r.id}>
            {r.f && <AgentAvatar agent={avatarOf(r.f)} size={20} />}
            <span className="w-14 truncate text-[13px] text-zinc-200">{r.f?.name ?? r.id}</span>
            <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <span className="absolute inset-y-0 left-0 rounded-full bg-zinc-300" style={{ width: `${r.odds ? impliedPct(r.odds) : 0}%` }} />
            </span>
            <span className="w-9 text-right font-semibold text-[13px] text-zinc-100 tabular-nums">{r.odds ? `${impliedPct(r.odds)}%` : "–"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-zinc-500">{total.toLocaleString("en-US")}¢ staked</p>
    </div>
  );
}
