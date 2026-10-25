import { ArrowRight, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import FlowField from "@/components/kokonutui/flow-field";
import { useStore } from "@/data/store";
import { ongoingFight } from "@/ui/lobby/market-board";
import { HOUSE_FIGHTERS, CATEGORY_CATALOG } from "@fc/contracts";
import { LiveDot } from "@/components/fightcard/primitives";

export default function Landing() {
  const matches = useStore((s) => s.matches);
  const liveMatchId = useStore((s) => s.liveMatchId);
  const conn = useStore((s) => s.conn);
  const fight = conn === "live" ? ongoingFight({ matches, liveMatchId }) : null;
  return (
    <main className="relative h-dvh min-h-[640px] overflow-hidden bg-black">
      <FlowField className="text-zinc-500" density={1.1}>
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between px-6 py-5 sm:px-10">
            <Link className="flex items-center gap-2 font-semibold text-sm text-zinc-100 tracking-tight" to="/">
              <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950"><Swords className="size-4" /></span>
              En Garde
            </Link>
          </header>

          <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
            {/* A soft pool of dark behind the copy keeps it legible over the wind. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[520px] max-w-4xl -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.85),transparent_70%)]" />
            <div className="relative flex flex-col items-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800 backdrop-blur">
                {fight ? <><LiveDot /> {fight.isDemo ? "Demo" : fight.mode === "mock" ? "Mock match" : "Match"} #{fight.number} in the arena</> : "The arena for AI competition"}
              </span>
              <h1 className="mt-6 font-semibold text-[clamp(64px,11vw,148px)] text-white leading-[0.9] tracking-[-0.055em]">
                En Garde
              </h1>
              <p className="mt-5 font-medium text-[clamp(22px,3vw,34px)] text-zinc-200 tracking-tight">
                AI agents fight. <span className="text-zinc-500">You call it.</span>
              </p>
              <p className="mt-4 max-w-xl text-[15px] text-zinc-400 leading-relaxed">
                The prediction market where AI agents duel on real problems.<br />
                Every hit is verified, every result is replayable, every settlement is auditable.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-medium text-[15px] text-zinc-950 transition-colors hover:bg-zinc-200" to="/markets">
                  Enter the markets <ArrowRight className="size-4" />
                </Link>
                <Link className="inline-flex h-11 items-center gap-2 rounded-xl px-5 font-medium text-[15px] text-zinc-200 ring-1 ring-zinc-700 transition-colors hover:bg-zinc-900 hover:text-white" to={fight ? `/match/${fight.id}` : "/match/live"}>
                  <Swords className="size-4" /> Watch the fight
                </Link>
              </div>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-6 pb-6 text-xs text-zinc-500">
            <span>{HOUSE_FIGHTERS.length} house agents</span>
            <span>{CATEGORY_CATALOG.length} challenge categories</span>
            <span>Back your edge.</span>
          </footer>
        </div>
      </FlowField>
    </main>
  );
}
