// Match screen (FC-F-142/144, §10.9): top bar, arena, plates, commentary feed, bet slip rail, QR, replay controls.
import { statusLine, type MatchState } from '@fc/engine';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArenaCanvas, FighterPortrait } from '@/arena';
import { bridge } from '@/bridge';
import { config } from '@/config';
import { useStore } from '@/data/store';
import { fixtureNames } from '@/data/replay';
import { cn } from '@/lib/utils';
import { getPodium, subscribePodium } from '@/arena/sequences/podium';
import { AppShell } from '@/ui/shell';
import { BetSlip } from '@/ui/betslip';
import { categoryLabel, clockText, FEED_STYLE, feedStamp, matchNumber, matchSourceFor, plates, problemGems, ResultsRevealGate, STATUS_BADGE } from './model';
import { ResultsPanel } from './results';

/** Wait through connection hydration, then attach to a known DB match or bundled fixture. */
export function useMatchSource(id: string | null, speed?: number): void {
  const conn = useStore((s) => s.conn);
  const matches = useStore((s) => s.matches);
  const liveMatchId = useStore((s) => s.liveMatchId);
  useEffect(() => {
    const st = useStore.getState();
    const target = id ?? liveMatchId ?? (conn === 'connecting' ? null : st.openMatchId ?? 'mock-basic');
    const source = matchSourceFor({ target, conn, matches, fixtures: fixtureNames() });
    if (!target || source === 'wait' || source === 'none') return;
    if (source === 'live') {
      if (st.watch.matchId !== target || st.watch.mode !== 'live') st.watchMatch(target);
      return;
    }
    if (st.watch.matchId !== target || st.watch.mode !== 'replay' || st.openMatchId !== target) st.openReplay(target, speed ?? 1);
  }, [id, speed, conn, matches, liveMatchId]);
}

export const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Gems() {
  const state = useStore((s) => s.watch.state);
  const COL = { open: 'border-zinc-600', held: 'bg-emerald-400 border-emerald-400', pending: 'bg-amber-300 border-amber-300', overturned: 'bg-red-500 border-red-500' };
  return (
    <ol aria-label="Problems" className="flex items-center gap-1.5">
      {problemGems(state).map((g) => (
        <li className={cn('size-3 rotate-45 border', COL[g.state])} key={g.idx} title={`P${g.idx} · ${g.points} pts · ${g.state}`} />
      ))}
    </ol>
  );
}

function TopBar() {
  const state = useStore((s) => s.watch.state);
  const mode = useStore((s) => s.watch.mode);
  const speed = useStore((s) => s.watch.speed);
  const conn = useStore((s) => s.conn);
  const num = matchNumber(state.matchId);
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-zinc-800 px-4 py-2.5 text-sm">
      <div className="font-semibold text-zinc-100">MATCH{num ? ` #${num}` : ''} <span className="font-normal text-zinc-500">· {categoryLabel(state.category)}</span></div>
      <Gems />
      <div className="tabular-nums text-zinc-100" data-testid="clock">{clockText(state)}</div>
      <div className="min-w-0 flex-1 truncate text-zinc-400" data-testid="status-line">{statusLine(state)}</div>
      {mode === 'replay' && <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] text-zinc-300">REPLAY ×{speed}</span>}
      {conn === 'offline' && mode === 'live' && <span className="text-[11px] text-amber-400">Reconnecting…</span>}
      <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', state.status === 'live' ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-300')}>{STATUS_BADGE[state.status]}</span>
    </header>
  );
}

function Plates() {
  const state = useStore((s) => s.watch.state);
  const fighters = useStore((s) => s.fighters);
  return (
    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 p-2 lg:grid-cols-4" data-testid="plates">
      {plates(state, fighters).map((p) => (
        <button
          className={cn('flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-zinc-900', p.leading ? 'border-zinc-600' : 'border-zinc-800', p.status === 'ko' || p.status === 'out' ? 'opacity-60' : '')}
          data-fighter={p.id}
          key={p.id}
          onClick={() => { bridge.emit('selectFighter', { fighterId: p.id }); bridge.emit('openCard', { fighterId: p.id }); }}
          type="button"
        >
          <span className="size-10 shrink-0 overflow-hidden rounded-md bg-zinc-900">{p.skin && <FighterPortrait pose={p.status === 'winner' ? 'victory' : p.status === 'ko' ? 'ko' : 'idle'} size={40} skin={p.skin} />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2"><b className="truncate text-sm text-zinc-100">{p.name}{p.team && <span className="ml-1.5 rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-semibold text-zinc-400">TEAM {p.team}</span>}</b><span className="tabular-nums text-sm text-zinc-100">{p.points}</span></span>
            <span className="block truncate text-[11px] tabular-nums text-zinc-500">{p.hits}✓ {p.misses}✗ · 🟨{p.yellow}{p.red ? ` 🟥${p.red}` : ''} · {p.statusLabel}</span>
            {p.activity && <span className="block truncate text-[11px] italic text-zinc-500">“{p.activity}”</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Feed() {
  const feed = useStore((s) => s.watch.state.feed);
  const startedT = useStore((s) => s.watch.state.startedT);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => { const el = ref.current; if (el && !paused) el.scrollTop = el.scrollHeight; }, [feed, paused]);
  return (
    <section className="flex min-h-0 flex-col" aria-label="Commentary">
      <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
        <span>Commentary</span>
        <button className="rounded px-1.5 py-0.5 normal-case hover:bg-zinc-900 hover:text-zinc-200" onClick={() => setPaused((p) => !p)} type="button">{paused ? 'Resume scroll' : 'Pause scroll'}</button>
      </div>
      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3 text-[13px]" data-testid="feed" ref={ref}>
        {feed.map((l) => (
          <li className="flex gap-2" data-kind={l.kind} key={l.seq}>
            <span className="w-9 shrink-0 tabular-nums text-zinc-600">{feedStamp(l, startedT)}</span>
            <span className={FEED_STYLE[l.kind]?.tone}>{l.text}</span>
          </li>
        ))}
        {feed.length === 0 && <li className="text-zinc-600">Waiting for the bell…</li>}
      </ol>
    </section>
  );
}

function Qr({ matchId }: { matchId: string | null }) {
  const [src, setSrc] = useState('');
  const url = `${config.publicWebUrl}/m${matchId ? `?match=${encodeURIComponent(matchId)}` : ''}`;
  useEffect(() => { void QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: '#000000', light: '#ffffff' } }).then(setSrc).catch(() => setSrc('')); }, [url]);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 p-2">
      {src ? <img alt={`QR code to ${url}`} className="size-16 rounded bg-white" src={src} /> : <div className="size-16 rounded bg-zinc-900" />}
      <div className="text-[11px] text-zinc-500">Bet from your phone<br /><span className="text-zinc-400">{url.replace(/^https?:\/\//, '')}</span></div>
    </div>
  );
}

function ResultsHandoff({ state, hudOnly }: { state: MatchState; hudOnly: boolean }) {
  const revision = useStore((s) => s.watch.playbackRevision);
  const [revealed, setRevealed] = useState(false);
  const [gate] = useState(() => new ResultsRevealGate());
  useEffect(() => {
    const showNow = gate.update({ matchId: state.matchId, status: state.status, playbackRevision: revision,
      reducedMotion: prefersReducedMotion(), hudOnly });
    setRevealed(showNow);
    if (state.status !== 'settled' || showNow) return;

    let done = false;
    const reveal = (matchId: string) => {
      if (!done && gate.podium(matchId)) { done = true; setRevealed(true); }
    };
    const accept = (podium: ReturnType<typeof getPodium>) => {
      if (podium.revealed && podium.matchId) reveal(podium.matchId);
    };
    const unsubscribe = subscribePodium(accept);
    accept(getPodium());
    const fallback = window.setTimeout(() => { if (!done) { done = true; setRevealed(gate.fallback()); } }, 3500);
    return () => { done = true; unsubscribe(); window.clearTimeout(fallback); };
  }, [gate, state.matchId, state.status, revision, hudOnly]);
  return state.status === 'settled' && revealed ? <div className="border-t border-zinc-800 p-4"><ResultsPanel state={state} /></div> : null;
}

function ReplayControls() {
  const { mode, speed, playing } = useStore((s) => s.watch);
  const setSpeed = useStore((s) => s.setSpeed);
  const setPlaying = useStore((s) => s.setPlaying);
  if (mode !== 'replay') return null;
  return (
    <div className="flex items-center gap-1.5 border-t border-zinc-800 px-3 py-2 text-xs" data-testid="replay-controls">
      <button className="rounded border border-zinc-700 px-2 py-1 text-zinc-200 hover:bg-zinc-900" onClick={() => setPlaying(!playing)} type="button">{playing ? 'Pause' : 'Play'}</button>
      {[1, 2, 5, 10].map((n) => (
        <button className={cn('rounded border px-2 py-1 tabular-nums', speed === n ? 'border-zinc-300 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900')} key={n} onClick={() => setSpeed(n)} type="button">{n}×</button>
      ))}
      <span className="ml-auto text-zinc-600">Replay · bets disabled</span>
    </div>
  );
}

export function MatchScreen({ id }: { id: string | null }) {
  const [q] = useSearchParams();
  const speed = Number(q.get('speed')) || undefined;
  const hudOnly = q.get('hud-only') === '1';
  useMatchSource(id, speed);
  const state = useStore((s) => s.watch.state);
  const mode = useStore((s) => s.watch.mode);
  return (
    <AppShell title="Match" wide>
      <div className="flex flex-col">
        <TopBar />
        {state.status === 'void' && <div className="bg-zinc-900 px-4 py-2 text-center text-sm text-zinc-200">MATCH VOID · all bets refunded{state.voidReason ? ` · ${state.voidReason}` : ''}</div>}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          <aside className="order-2 space-y-3 overflow-y-auto border-zinc-800 p-3 lg:order-1 lg:border-r">
            {mode === 'live' && <BetSlip matchId={state.matchId} />}
            {mode === 'replay' && <div className="rounded-lg border border-zinc-800 p-3 text-xs text-zinc-500">Replay. Bet controls are hidden.</div>}
            <Qr matchId={state.matchId} />
          </aside>
          <main className="order-1 flex min-h-0 min-w-0 flex-col lg:order-2">
            <div className="relative h-[56dvh] min-h-[320px] bg-black">
              {hudOnly ? <div className="flex h-full items-center justify-center text-xs text-zinc-700">arena hidden (hud-only)</div> : <ArenaCanvas reducedMotion={prefersReducedMotion()} />}
            </div>
            <ReplayControls />
            <Plates />
          </main>
          <aside className="order-3 flex h-[320px] flex-col lg:h-auto lg:max-h-[calc(56dvh+200px)] border-zinc-800 lg:border-l"><Feed /></aside>
        </div>
        <ResultsHandoff hudOnly={hudOnly} state={state} />
      </div>
    </AppShell>
  );
}

export function ResultsScreen({ id }: { id: string | null }) {
  const [q] = useSearchParams();
  useMatchSource(id, Number(q.get('speed')) || 10);
  const state = useStore((s) => s.watch.state);
  return (
    <AppShell title="Results">
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="text-lg font-semibold text-zinc-100">Results{matchNumber(state.matchId) ? ` · match #${matchNumber(state.matchId)}` : ''}</h1>
        {state.status !== 'settled' && <p className="text-sm text-zinc-500" data-testid="not-settled">{statusLine(state)}</p>}
        {state.status === 'settled' && <ResultsPanel state={state} />}
      </div>
    </AppShell>
  );
}
