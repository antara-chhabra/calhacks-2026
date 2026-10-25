// Standalone mobile spectator page (PRD §10.12, FC-F-220..222). No arena / AppShell imports.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatCents } from '@fc/contracts';
import { statusLine } from '@fc/engine';
import { seekReplay, stopReplay, useStore } from '@/data/store';
import { errorCopy, fmtOdds, impliedPct, MIN_STAKE, myStakeInMarket, payoutPreview, validateStake } from '@/ui/betslip/logic';
import { isValidHandle, suggestHandle } from '@/ui/lobby/selectors';
import { checkFairness, feedTone, nameOf, plates, podium, type Fairness } from '@/ui/match/model';
import { barPct, canBet, clampStake, pickView, QUICK_STAKES, STAKE_STEP, winnerMarket } from './model';

const MAX_SLIDER = 2500;

function Shell({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) {
  const me = useStore((s) => s.me);
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-zinc-100" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[13px] font-bold tracking-[0.18em]">FIGHT CARD</span>
        <span className="flex items-center gap-2 text-[13px] tabular-nums text-zinc-300">{badge}{me ? formatCents(me.balanceCents) : '$0.00'}</span>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-6">{children}</main>
      <p className="px-4 pb-6 text-center text-[11px] text-zinc-500">Ledger mode · no funds moved</p>
    </div>
  );
}

const Pill = ({ children, tone }: { children: React.ReactNode; tone: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${tone}`}>{children}</span>
);

function Toast({ msg, bad }: { msg: string | null; bad: boolean }) {
  if (!msg) return null;
  return (
    <div role="status" className={`fixed inset-x-4 bottom-4 z-10 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-medium ${bad ? 'bg-red-950 text-red-300 ring-1 ring-red-500/40' : 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-500/40'}`}>
      {msg}
    </div>
  );
}

function Bet({ replay }: { replay: boolean }) {
  const me = useStore((s) => s.me);
  const matchId = useStore((s) => s.watch.matchId ?? s.openMatchId);
  const markets = useStore((s) => s.markets);
  const fighters = useStore((s) => s.fighters);
  const bets = useStore((s) => s.bets);
  const conn = useStore((s) => s.conn);
  const market = winnerMarket(markets, matchId);
  const [sel, setPick] = useState<string | null>(null);
  const [stake, setStake] = useState(500);
  const [handle, setHandle] = useState(() => suggestHandle());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; bad: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flash = (msg: string, bad: boolean) => { setToast({ msg, bad }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 3000); };
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!market) return <p className="py-12 text-center text-zinc-500">Waiting for the match…</p>;
  const bettable = canBet(conn, market.status);
  const odds = (o: string) => market.odds[o] ?? 0;
  const err = validateStake(stake, { status: market.status, registered: !!me?.handle, balanceCents: me?.balanceCents ?? 0, myOpenStake: myStakeInMarket(bets, market.id) });
  const win = sel ? payoutPreview(market, sel, stake) : 0;

  const doRegister = async () => {
    if (!isValidHandle(handle)) return flash('Handle: 3–16 letters, numbers or _', true);
    setBusy(true);
    try { await useStore.getState().register(handle); } catch (e) { flash(errorCopy(e), true); } finally { setBusy(false); }
  };
  const confirm = async () => {
    if (!sel || err) return flash(err?.message ?? 'Pick a fighter first.', true);
    setBusy(true);
    try { await useStore.getState().placeBet(market.id, sel, stake); flash(`Bet placed · ${formatCents(stake)} on ${nameOf(sel, fighters)}`, false); }
    catch (e) { flash(errorCopy(e), true); } finally { setBusy(false); }
  };

  return (
    <>
      <h1 className="text-lg font-semibold">{market.label}</h1>
      <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Pick a winner">
        {market.outcomes.filter((o) => o !== 'none').map((o) => {
          const on = sel === o;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} disabled={!bettable} onClick={() => setPick(o)}
              className={`flex min-h-[56px] w-full items-center justify-between rounded-xl px-4 text-left ring-1 transition active:scale-[0.99] disabled:opacity-70 ${on ? 'bg-emerald-500/10 ring-emerald-400' : 'bg-zinc-900 ring-zinc-800'}`}>
              <span className="min-w-0 truncate text-base font-semibold">{nameOf(o, fighters)}</span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-xs text-zinc-500">{impliedPct(odds(o))}</span>
                <span className="text-lg font-bold">{fmtOdds(odds(o))}×</span>
              </span>
            </button>
          );
        })}
      </div>

      {replay || !bettable ? (
        <p className="rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-zinc-400">{replay ? 'Replay is read-only — join a live match to bet' : 'Bets closed for this match.'}</p>
      ) : !me?.handle ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-zinc-500" htmlFor="h">Your handle</label>
          <input id="h" value={handle} onChange={(e) => setHandle(e.target.value)} autoCapitalize="off" autoCorrect="off" maxLength={16}
            className="min-h-[48px] rounded-xl bg-zinc-900 px-4 text-base outline-none ring-1 ring-zinc-800 focus:ring-emerald-400" />
          <button type="button" disabled={busy} onClick={doRegister} className="min-h-[52px] rounded-xl bg-emerald-400 text-base font-bold text-black active:bg-emerald-300 disabled:opacity-50">Start playing</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><span className="text-sm text-zinc-400">Stake</span><span className="text-2xl font-bold tabular-nums">{formatCents(stake)}</span></div>
          <input type="range" aria-label="Stake" min={MIN_STAKE} max={MAX_SLIDER} step={STAKE_STEP} value={stake} onChange={(e) => setStake(clampStake(Number(e.target.value)))}
            className="h-11 w-full accent-emerald-400" />
          <div className="grid grid-cols-4 gap-2">
            {QUICK_STAKES.map((q) => (
              <button key={q} type="button" onClick={() => setStake(q)} className={`min-h-[44px] rounded-lg text-sm font-semibold ring-1 ${stake === q ? 'bg-zinc-100 text-black ring-zinc-100' : 'bg-zinc-900 text-zinc-200 ring-zinc-800'}`}>{formatCents(q)}</button>
            ))}
          </div>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">To win</span><span className="font-semibold tabular-nums text-emerald-400">{sel ? formatCents(win) : '—'}</span></div>
          {err && sel && <p className="text-xs text-red-400">{err.message}</p>}
          <button type="button" disabled={busy || !sel} onClick={confirm} className="min-h-[52px] rounded-xl bg-emerald-400 text-base font-bold text-black active:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-500">
            {sel ? `BACK ${nameOf(sel, fighters).toUpperCase()}` : 'PICK A FIGHTER'}
          </button>
        </div>
      )}
      <Toast msg={toast?.msg ?? null} bad={toast?.bad ?? false} />
    </>
  );
}

function Live() {
  const state = useStore((s) => s.watch.state);
  const fighters = useStore((s) => s.fighters);
  const rows = plates(state, fighters);
  const max = Math.max(0, ...rows.map((r) => r.points));
  const lines = state.feed.slice(-3);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
        <span className="text-sm font-bold tracking-wide text-red-400">{state.status === 'review' ? 'VAR REVIEW' : state.status === 'locked' ? 'BETS LOCKED' : 'LIVE'}</span>
      </div>
      <p className="text-sm text-zinc-300" data-testid="status-line">{statusLine(state)}</p>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id}>
            <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{r.name}</span><span className="tabular-nums text-zinc-300">{r.points}</span></div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct(r.points, max)}%`, background: r.skin?.palette.primary ?? '#34d399' }} />
            </div>
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-1.5 rounded-xl bg-zinc-900 p-3 text-[13px]" aria-label="Commentary">
        {lines.length === 0 && <li className="text-zinc-500">Waiting for the bell…</li>}
        {lines.map((l) => <li key={l.seq} className={`break-words ${feedTone(l.kind)}`}>{l.text}</li>)}
      </ul>
    </>
  );
}

function Result() {
  const state = useStore((s) => s.watch.state);
  const fighters = useStore((s) => s.fighters);
  const bets = useStore((s) => s.bets);
  const matchId = useStore((s) => s.watch.matchId);
  const [fair, setFair] = useState<Fairness>('none');
  useEffect(() => { void checkFairness(state).then(setFair); }, [state]);
  const board = useMemo(() => podium(state, fighters), [state, fighters]);
  const winner = board[0];
  const mine = bets.filter((b) => b.mine && b.matchId === matchId);
  const voided = state.status === 'void';
  return (
    <>
      <div className="rounded-2xl bg-zinc-900 p-5 text-center">
        <p className="text-xs tracking-widest text-zinc-500">{voided ? 'MATCH VOID' : 'WINNER'}</p>
        <p className="mt-1 text-3xl font-extrabold">{voided ? 'Refunded' : winner?.name ?? '—'}</p>
        {winner && !voided && <p className="mt-1 text-sm tabular-nums text-zinc-400">{winner.points} pts</p>}
      </div>
      <section aria-label="Your bets" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-zinc-400">Your bets</h2>
        {mine.length === 0 && <p className="text-sm text-zinc-500">No bets this match. Better luck next match.</p>}
        {mine.map((b) => (
          <div key={b.id} className="flex min-h-[44px] items-center justify-between rounded-xl bg-zinc-900 px-4 text-sm">
            <span>{nameOf(b.outcome, fighters)} · {formatCents(b.stake)}</span>
            <span className={b.status === 'won' ? 'font-bold text-emerald-400' : b.status === 'lost' ? 'text-red-400' : 'text-zinc-400'}>
              {b.status === 'won' ? `Won ${formatCents(b.payout)}` : b.status === 'lost' ? 'Lost' : b.status === 'refunded' ? 'Refunded' : 'Pending'}
            </span>
          </div>
        ))}
      </section>
      {fair === 'ok' && <p className="text-center text-sm font-medium text-emerald-400">Provably fair ✓</p>}
      {fair === 'bad' && <p className="text-center text-sm font-medium text-red-400">Fairness check failed</p>}
    </>
  );
}

export default function MobilePage() {
  const [q] = useSearchParams();
  const matchParam = q.get('match');
  const speed = Number(q.get('speed')) || 1;
  const at = Number(q.get('at')) || 0;           // evidence aid: jump a replay to t ms
  const conn = useStore((s) => s.conn);
  const known = useStore((s) => (matchParam ? matchParam in s.matches : false));
  const status = useStore((s) => s.watch.state?.status ?? null);
  const live = conn === 'live' && known;
  const fellBack = useRef(false);

  useEffect(() => {
    const st = useStore.getState();
    if (live && matchParam) { st.watchMatch(matchParam); return; }
    fellBack.current = false;
    st.openReplay(matchParam ?? 'mock-basic', speed);
    const t = at > 0 ? setTimeout(() => seekReplay(at), 400) : undefined;
    return () => { clearTimeout(t); stopReplay(); };
  }, [live, matchParam, speed, at]);

  // Unknown fixture name (e.g. a real match id with no live adapter): fall back to the bundled replay.
  useEffect(() => {
    if (!live && conn === 'offline' && !fellBack.current) { fellBack.current = true; useStore.getState().openReplay('mock-basic', speed); }
  }, [conn, live, speed]);

  const replay = !live;
  const view = pickView(status);
  return (
    <Shell badge={replay ? <Pill tone="bg-amber-400/15 text-amber-300">REPLAY</Pill> : undefined}>
      {view === 'bet' && <Bet replay={replay} />}
      {view === 'live' && <Live />}
      {view === 'result' && <Result />}
    </Shell>
  );
}
