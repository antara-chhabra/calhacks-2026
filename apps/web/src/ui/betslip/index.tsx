// Bet slip + My bets (U-05). Screens mount <BetSlip matchId=… />. Kalshi-style order ticket on black.
import { formatCents, LEDGER_MODE_LABEL } from '@fc/contracts';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useStore, type BetRow, type MarketView } from '@/data/store';
import { cn } from '@/lib/utils';
import {
  errorCopy, fmtOdds, impliedPct, KIND_TABS, myStakeInMarket, outcomeLabel, parseDollars, payoutPreview, STAKE_PRESETS, STATUS_LABEL, validateStake,
} from './logic';

const CHIP: Record<keyof typeof STATUS_LABEL, string> = {
  open: 'bg-emerald-400/10 text-emerald-400', locked: 'bg-amber-400/10 text-amber-400', settled: 'bg-zinc-800 text-zinc-300',
  void: 'bg-zinc-800 text-zinc-500', won: 'bg-emerald-400/10 text-emerald-400', lost: 'bg-rose-400/10 text-rose-400', refunded: 'bg-zinc-800 text-zinc-400',
};

export function StatusChip({ status }: { status: keyof typeof STATUS_LABEL }) {
  return <span className={cn('rounded px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wider', CHIP[status])}>{STATUS_LABEL[status]}</span>;
}

/** Odds that roll (slide) vertically whenever the value changes. */
export function RollingOdds({ value, className }: { value: number; className?: string }) {
  const text = fmtOdds(value);
  return (
    <span className={cn('relative inline-block overflow-hidden tabular-nums', className)} style={{ minWidth: '3ch' }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span animate={{ y: 0, opacity: 1 }} className="inline-block" exit={{ y: -10, opacity: 0 }} initial={{ y: 10, opacity: 0 }}
          key={text} transition={{ duration: 0.22 }}>{text}</motion.span>
      </AnimatePresence>
    </span>
  );
}

type Pick = { marketId: string; outcome: string } | null;

function useMatchMarkets(matchId: string | null): MarketView[] {
  const markets = useStore((s) => s.markets);
  return useMemo(() => (matchId ? Object.values(markets).filter((m) => m.id.startsWith(`${matchId}:`)) : []), [markets, matchId]);
}

export function BetSlip(props: { matchId: string | null; compact?: boolean }) {
  const [tab, setTab] = useState<string>('winner');
  const markets = useMatchMarkets(props.matchId);
  const bets = useStore((s) => s.bets);
  const mineCount = bets.filter((b) => b.mine && (!props.matchId || b.matchId === props.matchId)).length;
  return (
    <section className={cn('flex w-full flex-col gap-3 rounded-xl border border-zinc-800 bg-black p-4', props.compact && 'p-3')} data-match={props.matchId ?? ''} id="bet-slip">
      <nav className="flex gap-1 border-zinc-800 border-b pb-2 text-[13px]">
        <button className={cn('rounded-md px-2.5 py-1', tab !== 'mine' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
          onClick={() => setTab('winner')} type="button">Bet slip</button>
        <button className={cn('rounded-md px-2.5 py-1', tab === 'mine' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
          onClick={() => setTab('mine')} type="button">My bets{mineCount ? ` (${mineCount})` : ''}</button>
      </nav>
      {tab === 'mine' ? <MyBets matchId={props.matchId} /> : <Ticket markets={markets} tab={tab} setTab={setTab} />}
      <p className="text-[11px] text-zinc-600">{LEDGER_MODE_LABEL}</p>
    </section>
  );
}

function Ticket({ markets, tab, setTab }: { markets: MarketView[]; tab: string; setTab: (t: string) => void }) {
  const kinds = KIND_TABS.filter((k) => markets.some((m) => m.kind === k.kind));
  const active = kinds.find((k) => k.kind === tab)?.kind ?? kinds[0]?.kind;
  const [pick, setPick] = useState<Pick>(null);
  const [stake, setStake] = useState(500);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const fighters = useStore((s) => s.fighters);
  const me = useStore((s) => s.me);
  const bets = useStore((s) => s.bets);
  const placeBet = useStore((s) => s.placeBet);
  const register = useStore((s) => s.register);
  const claimDemoFunds = useStore((s) => s.claimDemoFunds);
  const fund = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); setNote({ ok: true, text: ok }); } catch (e) { setNote({ ok: false, text: errorCopy(e) }); } finally { setBusy(false); }
  };
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 4000); return () => clearTimeout(t); }, [note]);

  if (kinds.length === 0) return <p className="py-6 text-center text-sm text-zinc-500">No markets for this match yet.</p>;
  const shown = markets.filter((m) => m.kind === active);
  const sel = pick ? markets.find((m) => m.id === pick.marketId) : undefined;
  const problem = sel ? validateStake(stake, { status: sel.status, registered: !!me?.handle, balanceCents: me?.balanceCents ?? 0, myOpenStake: myStakeInMarket(bets, sel.id) }) : null;
  const payout = sel && pick ? payoutPreview(sel, pick.outcome, stake) : 0;
  const nameOf = (o: string): string => fighters[o]?.name ?? outcomeLabel(o);

  const submit = async () => {
    if (!sel || !pick || problem) return;
    setBusy(true);
    try { await placeBet(sel.id, pick.outcome, stake); setNote({ ok: true, text: `Bet placed: ${formatCents(stake)} on ${nameOf(pick.outcome)}` }); }
    catch (e) { setNote({ ok: false, text: errorCopy(e) }); }
    finally { setBusy(false); }
  };

  // Ledger-mode wallet strip: join in one click (welcome $100) and refill when low, so anyone can bet during a demo.
  const wallet = !me?.handle ? (
    <button className="h-9 rounded-lg bg-emerald-500 font-semibold text-black text-sm disabled:opacity-40" disabled={busy}
      onClick={() => fund(() => register(`fan_${Math.random().toString(36).slice(2, 8)}`), 'Joined. $100 in demo funds added.')} type="button">
      Join &amp; get $100 to bet
    </button>
  ) : (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-800">
      <span className="text-zinc-400">Balance <span className="font-semibold text-zinc-100 tabular-nums">{formatCents(me.balanceCents ?? 0)}</span></span>
      {(me.balanceCents ?? 0) < 1000 && (
        <button className="rounded-md px-2 py-1 text-[12px] font-semibold text-emerald-400 ring-1 ring-emerald-500/40 disabled:opacity-40" disabled={busy}
          onClick={() => fund(claimDemoFunds, '$100 in demo funds added.')} type="button">+ $100 demo funds</button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {wallet}
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {kinds.map((k) => {
          const ms = markets.filter((m) => m.kind === k.kind);
          const st = ms.every((m) => m.status === ms[0]!.status) ? ms[0]!.status : 'open';
          return (
            <button aria-selected={k.kind === active} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] ring-1 transition-colors',
              k.kind === active ? 'bg-zinc-100 text-black ring-zinc-100' : 'text-zinc-400 ring-zinc-800 hover:text-zinc-100')}
              key={k.kind} onClick={() => { setTab(k.kind); setPick(null); }} role="tab" type="button">
              {k.label}<StatusChip status={st} />
            </button>
          );
        })}
      </div>

      {shown.map((m) => (
        <div className="flex flex-col gap-1" key={m.id}>
          <div className="flex items-center justify-between text-[12px] text-zinc-500"><span>{m.label}</span><StatusChip status={m.status} /></div>
          {m.outcomes.map((o) => {
            const on = pick?.marketId === m.id && pick.outcome === o;
            const color = fighters[o]?.skin.palette.primary;
            const odds = m.odds[o] ?? 0;
            return (
              <button aria-pressed={on} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-left ring-1 transition-colors',
                on ? 'bg-zinc-900 ring-zinc-200' : 'ring-zinc-800 hover:bg-zinc-900/60', m.status !== 'open' && 'opacity-60')}
                key={o} onClick={() => setPick({ marketId: m.id, outcome: o })} type="button">
                <span className="size-2.5 rounded-full bg-zinc-600" style={color ? { background: color } : undefined} />
                <span className="flex-1 font-medium text-sm text-zinc-100">{nameOf(o)}</span>
                <span className="w-10 text-right text-xs text-zinc-500">{impliedPct(odds)}</span>
                <RollingOdds className="w-12 text-right font-semibold text-sm text-zinc-100" value={odds} />
              </button>
            );
          })}
        </div>
      ))}

      {sel && pick && (
        <div className="flex flex-col gap-2 border-zinc-800 border-t pt-3">
          <div className="grid grid-cols-4 gap-1.5">
            {STAKE_PRESETS.map((c) => (
              <button className={cn('rounded-lg py-2 font-semibold text-sm ring-1 transition-colors', stake === c && !custom ? 'bg-zinc-100 text-black ring-zinc-100' : 'text-zinc-300 ring-zinc-800 hover:ring-zinc-600')}
                key={c} onClick={() => { setStake(c); setCustom(''); }} type="button">${c / 100}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-zinc-800 focus-within:ring-zinc-500">
            <span className="text-zinc-500">Custom $</span>
            <input aria-label="Custom stake in dollars" className="w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-600" inputMode="decimal"
              onChange={(e) => { setCustom(e.target.value); setStake(parseDollars(e.target.value)); }} placeholder="1 – 25" value={custom} />
          </label>
          <dl className="flex items-baseline justify-between text-sm">
            <dt className="text-zinc-500">Payout if {nameOf(pick.outcome)} wins <span className="text-zinc-600">(est.)</span></dt>
            <dd className="font-semibold text-emerald-400 text-lg tabular-nums">{formatCents(payout)}</dd>
          </dl>
          {problem && <p className="text-[12px] text-amber-400" role="status">{problem.message}</p>}
          <button className="h-10 rounded-lg bg-emerald-500 font-semibold text-black text-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!!problem || busy} onClick={submit} type="button">{busy ? 'Placing…' : `Place bet · ${formatCents(stake)}`}</button>
        </div>
      )}
      <AnimatePresence>
        {note && (
          <motion.p animate={{ opacity: 1, y: 0 }} className={cn('rounded-lg px-3 py-2 text-[13px]', note.ok ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400')}
            exit={{ opacity: 0 }} initial={{ opacity: 0, y: 6 }} role="status">{note.text}</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MyBets({ matchId }: { matchId?: string | null }) {
  const bets = useStore((s) => s.bets);
  const markets = useStore((s) => s.markets);
  const fighters = useStore((s) => s.fighters);
  const mine = bets.filter((b: BetRow) => b.mine && (!matchId || b.matchId === matchId));
  if (mine.length === 0) return <p className="py-6 text-center text-sm text-zinc-500">No bets yet. Pick an outcome and place one.</p>;
  return (
    <ul className="flex flex-col divide-y divide-zinc-900">
      {mine.map((b) => (
        <li className="flex items-center gap-3 py-2.5 text-sm" key={b.id}>
          <div className="flex-1">
            <div className="font-medium text-zinc-100">{fighters[b.outcome]?.name ?? outcomeLabel(b.outcome)}</div>
            <div className="text-[12px] text-zinc-500">{markets[b.marketId]?.label ?? b.marketId}</div>
          </div>
          <span className="text-zinc-400 tabular-nums">{formatCents(b.stake)}</span>
          <StatusChip status={b.status} />
          <span className={cn('w-16 text-right tabular-nums', b.status === 'won' ? 'text-emerald-400' : 'text-zinc-500')}>
            {b.status === 'won' || b.status === 'refunded' ? formatCents(b.payout) : '—'}
          </span>
        </li>
      ))}
    </ul>
  );
}
