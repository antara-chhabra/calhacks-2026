// Results panel (FC-F-145) + provably-fair panel (FC-F-081). Used inline on the match screen and on /match/:id/results.
import { formatCents, LEDGER_MODE_LABEL } from '@fc/contracts';
import type { MatchState } from '@fc/engine';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useState } from 'react';
import { FighterPortrait } from '@/arena';
import { cn } from '@/lib/utils';
import { useStore } from '@/data/store';
import { checkFairness, categoryLabel, type Fairness, matchNumber, nameOf, podium, varOverturns, settledMarketsForMatch } from './model';
import { squadTeam } from '@fc/contracts';

function Tex({ src }: { src: string }) {
  let html = '';
  try { html = katex.renderToString(src, { throwOnError: false, displayMode: false }); } catch { html = src; }
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function FairnessPanel({ state }: { state: MatchState }) {
  const [res, setRes] = useState<Fairness>('none');
  useEffect(() => {
    let live = true;
    void checkFairness(state).then((r) => { if (live) setRes(r); });
    return () => { live = false; };
  }, [state.commitHash, state.reveal]);
  const set = state.reveal?.problemSet;
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" data-testid="fair-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={cn('font-semibold text-sm', res === 'ok' && 'text-emerald-400', res === 'bad' && 'text-red-400', res === 'none' && 'text-zinc-400')}>
          {res === 'ok' ? 'Provably fair ✓' : res === 'bad' ? 'Hash mismatch ✗' : 'Awaiting reveal…'}
        </div>
        <code className="truncate text-[11px] text-zinc-500" title={state.commitHash ?? ''}>commit {state.commitHash ? `${state.commitHash.slice(0, 10)}…${state.commitHash.slice(-4)}` : '—'}</code>
      </div>
      <p className="mt-1 text-xs text-zinc-500">SHA-256(problem set + salt) was published before the bell. Your browser recomputed it from the revealed set.</p>
      {set && (
        <details className="mt-3 group">
          <summary className="cursor-pointer select-none text-xs text-zinc-300 hover:text-white">Show the {set.problems.length} revealed problems</summary>
          <ol className="mt-2 space-y-2" data-testid="fair-problems">
            {set.problems.map((p) => (
              <li className="rounded-lg border border-zinc-800 p-3 text-sm" key={p.idx}>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>P{p.idx} · {'★'.repeat(p.difficulty)} · {p.points} pts{p.trap ? ' · trap' : ''}</span>
                  <span>{p.family}</span>
                </div>
                {state.category === 'integrals' ? <div className="py-1.5 text-zinc-100"><Tex src={p.statementTex} /></div> : p.evaluation && <div className="py-1.5 whitespace-pre-wrap text-zinc-100">{p.evaluation.prompt}</div>}
                {p.evaluation && state.category !== 'integrals' && <div className="mb-2 rounded-md bg-black/40 p-2 text-[12px] text-zinc-300">{p.evaluation.kind === 'code' ? <><div className="text-[10px] uppercase tracking-wide text-zinc-500">Reference implementation</div><pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono">{p.reference}</pre><div className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">Revealed test cases</div><ul className="mt-1 space-y-1 font-mono">{p.evaluation.tests.map((t, i) => <li className="break-all" key={i}>input {t.inputJson} → output {t.outputJson}</li>)}</ul></> : <><div className="text-[10px] uppercase tracking-wide text-zinc-500">Accepted answers</div><p className="mt-1 break-all font-mono">{p.evaluation.answers.join(' · ')}</p></>}</div>}
                {state.category === 'integrals' && <div className="grid gap-x-4 gap-y-0.5 text-[11px] text-zinc-500 sm:grid-cols-2">
                  <span>integrand <code className="text-zinc-300">{p.integrand}</code></span>
                  <span>reference <code className="text-zinc-300">{p.reference}</code></span>
                  <span>live domain <code className="text-zinc-300">[{p.liveDomain.join(', ')}]</code></span>
                  <span>final domains <code className="text-zinc-300">{p.finalDomains.map((d) => `[${d.join(', ')}]`).join(' ')}</code></span>
                </div>}
              </li>
            ))}
          </ol>
          <div className="mt-2 break-all text-[11px] text-zinc-600">seed {set.seed} · salt {state.reveal?.salt}</div>
        </details>
      )}
    </section>
  );
}

const MEDAL = ['text-amber-300', 'text-zinc-300', 'text-orange-400', 'text-zinc-500'];

export function ResultsPanel({ state }: { state: MatchState }) {
  const fighters = useStore((s) => s.fighters);
  const markets = useStore((s) => s.markets);
  const bets = useStore((s) => s.bets);
  const rows = podium(state, fighters);
  const settled = state.settled;
  const mine = bets.filter((b) => b.mine && b.matchId === state.matchId);
  const myPayout = mine.reduce((n, b) => n + (b.status === 'won' ? b.payout : 0), 0);
  const mkts = settledMarketsForMatch(markets, state.matchId);
  const teamMarket = state.category === 'squads' ? mkts.find((m) => m.kind === 'team_winner') : undefined;
  const teamOutcome = teamMarket?.result?.toLowerCase();
  const teamScores = Object.values(state.fighters).reduce((s, fighter) => {
    if (fighter.slot < 2) s.a += fighter.points; else s.b += fighter.points;
    return s;
  }, { a: 0, b: 0 });
  if (rows.length === 0) return <div className="rounded-xl border border-zinc-800 p-6 text-sm text-zinc-500">Results appear once the match is settled.</div>;
  return (
    <div className="space-y-4" data-testid="results">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-zinc-500">{categoryLabel(state.category)} · Final standings{matchNumber(state.matchId) ? ` · match #${matchNumber(state.matchId)}` : ''}</h2>
        {state.category === 'squads' && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm" data-testid="team-result"><span className="font-semibold text-zinc-100">{teamOutcome === 'team_a' ? 'Team A wins' : teamOutcome === 'team_b' ? 'Team B wins' : 'Team result pending'}</span><span className="tabular-nums text-zinc-300">Team A {teamScores.a} · Team B {teamScores.b}</span></div>}
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((r) => {
            const el = settled?.elo[r.id]; const ovr = settled?.ovr[r.id];
            return (
              <li className={cn('rounded-lg border p-3 text-center', r.rank === 1 ? 'border-amber-300/40 bg-amber-300/5' : 'border-zinc-800')} data-rank={r.rank} key={r.id}>
                <div className={cn('text-xs font-semibold', MEDAL[r.rank - 1])}>#{r.rank}</div>
                <div className="mx-auto my-1 flex size-20 items-center justify-center">{r.skin && <FighterPortrait pose={r.pose} size={80} skin={r.skin} />}</div>
                <div className="font-semibold text-zinc-100">{r.name}{state.category === 'squads' && <span className="ml-1.5 rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-semibold text-zinc-400">TEAM {squadTeam(state.fighters[r.id]?.slot ?? state.order.indexOf(r.id)) === 'team_a' ? 'A' : 'B'}</span>}</div>
                <div className="text-lg tabular-nums text-zinc-100">{r.points}<span className="text-xs text-zinc-500"> pts</span></div>
                <div className="text-[11px] text-zinc-500">{Math.round(r.scorePct * 100)}% of max{r.overturned ? ` · VAR −${r.overturned}` : ''}</div>
                {el && <div className="mt-1 text-[11px] tabular-nums text-zinc-400">Elo {el[0]} → {el[1]} <Delta d={el[1] - el[0]} /></div>}
                {ovr && <div className="text-[11px] tabular-nums text-zinc-400">OVR {ovr[0]} → {ovr[1]} <Delta d={ovr[1] - ovr[0]} /></div>}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
          <span>VAR overturns <b className="text-zinc-100">{varOverturns(state)}</b></span>
          {settled && <span>Total paid <b className="text-zinc-100">{formatCents(settled.totalPaid)}</b></span>}
          {mine.length > 0 && <span>Your payouts <b className="text-emerald-400">{formatCents(myPayout)}</b></span>}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Markets</h2>
        {mkts.length === 0 && (settled?.results.length ?? 0) === 0 && <p className="text-sm text-zinc-500">No markets settled.</p>}
        <ul className="divide-y divide-zinc-800/70 text-sm">
          {(mkts.length ? mkts.map((m) => ({ id: m.id, label: m.label, outcome: m.result ?? 'void' })) : (settled?.results ?? []).map((r) => ({ id: r.marketId, label: r.marketId, outcome: r.outcome }))).map((m) => (
            <li className="flex items-center justify-between gap-3 py-1.5" key={m.id}>
              <span className="truncate text-zinc-300">{m.label}</span>
              <span className="shrink-0 text-zinc-100">{state.category === 'squads' && m.outcome.toLowerCase() === 'team_a' ? 'Team A' : state.category === 'squads' && m.outcome.toLowerCase() === 'team_b' ? 'Team B' : nameOf(m.outcome, fighters).toUpperCase()}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[11px] text-zinc-600">{LEDGER_MODE_LABEL}</div>
      </section>
      <FairnessPanel state={state} />
    </div>
  );
}

function Delta({ d }: { d: number }) {
  return <span className={d > 0 ? 'text-emerald-400' : d < 0 ? 'text-red-400' : 'text-zinc-500'}>({d > 0 ? '+' : d < 0 ? '−' : '±'}{Math.abs(d)})</span>;
}
