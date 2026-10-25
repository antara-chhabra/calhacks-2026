// App shell (U-01). Every screen wraps its content in <AppShell>; props are a stable contract.
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { MorphicNavbar } from "@/components/kokonutui/morphic-navbar";
import { LiveDot, Money, Toaster } from "@/components/fightcard/primitives";
import { useStore } from "@/data/store";
import { cn } from "@/lib/utils";

export const MONEY_DISCLOSURE = "Ledger mode · no funds moved";

const NAV = {
  "/markets": { name: "Lobby" },
  "/match/live": { name: "Live" },
  "/leaderboard": { name: "Leaderboard" },
  "/forge": { name: "Forge" },
};

export function BalancePill({ className }: { className?: string }) {
  const me = useStore((s) => s.me);
  const base = "inline-flex h-8 items-center gap-2 rounded-full bg-zinc-900 px-3 text-[13px] ring-1 ring-zinc-800";
  if (!me) {
    return (
      <Link aria-label="Sign in to get a handle and balance" className={cn(base, "text-zinc-300 hover:ring-zinc-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/60", className)} to="/">
        Sign in
      </Link>
    );
  }
  return (
    <span aria-label={`Balance ${me.balanceCents} cents`} className={cn(base, className)} title={MONEY_DISCLOSURE}>
      {me.handle && <span className="max-w-24 truncate text-zinc-500">@{me.handle}</span>}
      <Money className="font-medium text-zinc-100" cents={me.balanceCents} />
    </span>
  );
}

type Mode = "LIVE" | "REPLAY" | "DEMO" | "MOCK";
/** Resolve the badge from store state. DEMO wins, then MOCK, then replay vs live. */
export function useMode(): Mode {
  const conn = useStore((s) => s.conn);
  const watchMode = useStore((s) => s.watch.mode);
  const m = useStore((s) => (s.watch.matchId ? s.matches[s.watch.matchId] : undefined));
  if (m?.isDemo) return "DEMO";
  if (m?.mode === "mock") return "MOCK";
  if (conn === "replay" || watchMode === "replay") return "REPLAY";
  return "LIVE";
}

const MODE_CLS: Record<Mode, string> = {
  LIVE: "bg-red-500/10 text-red-400 ring-red-500/30",
  REPLAY: "bg-sky-400/10 text-sky-400 ring-sky-400/30",
  DEMO: "bg-amber-300/10 text-amber-300 ring-amber-300/30",
  MOCK: "bg-zinc-800 text-zinc-300 ring-zinc-700",
};

export function ModeBadge({ mode, className }: { mode?: Mode; className?: string }) {
  const auto = useMode();
  const v = mode ?? auto;
  return (
    <span aria-label={`Mode: ${v}`} className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 font-semibold text-[11px] tracking-wide ring-1", MODE_CLS[v], className)}>
      {v === "LIVE" && <LiveDot />}
      {v}
    </span>
  );
}

const CONN: Record<string, { label: string; dot: string }> = {
  connecting: { label: "Connecting", dot: "bg-amber-300 animate-pulse motion-reduce:animate-none" },
  live: { label: "Live", dot: "bg-emerald-400" },
  offline: { label: "Offline", dot: "bg-rose-400" },
  replay: { label: "Replay", dot: "bg-sky-400" },
};

export function ConnIndicator({ className }: { className?: string }) {
  const conn = useStore((s) => s.conn);
  const c = CONN[conn];
  return (
    <span aria-label={`Connection: ${c.label}`} className={cn("inline-flex items-center gap-1.5 text-[12px] text-zinc-500", className)} role="status">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

export function MoneyDisclosure({ className }: { className?: string }) {
  return <span className={cn("text-[12px] text-zinc-500", className)}>{MONEY_DISCLOSURE}</span>;
}

export function AppShell(props: { children: ReactNode; title?: string; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-black text-zinc-100">
      <header className="sticky top-0 z-40 border-zinc-900 border-b bg-black/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link className="shrink-0 rounded-md font-semibold text-[15px] text-zinc-50 tracking-tight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/60" to="/">
            Fight Card
          </Link>
          <nav aria-label="Primary" className="hidden min-w-0 flex-1 justify-center md:flex">
            <MorphicNavbar className="[&_a]:whitespace-nowrap" items={NAV} />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ModeBadge className="hidden sm:inline-flex" />
            <BalancePill />
          </div>
        </div>
        <nav aria-label="Primary mobile" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {Object.entries(NAV).map(([href, n]) => (
            <Link className="shrink-0 rounded-lg px-3 py-1 text-[13px] text-zinc-400 hover:text-zinc-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400/60" key={href} to={href}>
              {n.name}
            </Link>
          ))}
        </nav>
        <div className="border-zinc-900 border-t bg-zinc-950 text-center">
          <MoneyDisclosure className="inline-block py-1" />
        </div>
      </header>
      <main className={cn("mx-auto w-full flex-1 px-4 py-6 sm:px-6", props.wide ? "max-w-[1600px]" : "max-w-[1280px]")}>
        {props.title && <h1 className="mb-5 font-semibold text-2xl text-zinc-50 tracking-tight">{props.title}</h1>}
        {props.children}
      </main>
      <footer className="border-zinc-900 border-t px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2">
          <MoneyDisclosure />
          <ConnIndicator />
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
