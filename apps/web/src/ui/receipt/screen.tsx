// Match receipt (FC-F-084) + replay controls (FC-F-242). Source of truth: the recorded event log.
import type { FightEnvelope } from '@fc/contracts';
import { squadTeam } from '@fc/contracts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonX, Panel, Skeleton } from '@/components/fightcard/primitives';
import { loadFixture } from '@/data/replay';
import { cn } from '@/lib/utils';
import { useStore } from '@/data/store';
import { AppShell } from '@/ui/shell';
import { basescanUrl, buildReceipt, hashCheck, isHighlight, isTxHash, summarize, type HashCheck, type Receipt } from './model';
import { categoryLabel } from '@/ui/match/model';

const fmtT = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

function TxLink({ hash }: { hash: string | null }) {
  if (!hash) return <span className="text-zinc-600">—</span>;
  if (!isTxHash(hash)) return <code className="text-zinc-500">{hash}</code>;
  return <a className="font-mono text-sky-400 hover:underline" href={basescanUrl(hash)} rel="noreferrer" target="_blank">{short(hash)} ↗</a>;
}

export function ReceiptScreen({ id }: { id: string | null }) {
  const [events, setEvents] = useState<FightEnvelope[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [check, setCheck] = useState<HashCheck | null>(null);
  const openReplay = useStore((s) => s.openReplay);
  const receipt: Receipt | null = events ? buildReceipt(events) : null;

  useEffect(() => {
    let live = true;
    setEvents(null); setMissing(false); setCheck(null);
    if (!id) { setMissing(true); return; }
    loadFixture(id).then((fx) => { if (live) setEvents(fx.events); }).catch(() => { if (live) setMissing(true); });
    return () => { live = false; };
  }, [id]);
  useEffect(() => {
    if (!receipt) return;
    let live = true;
    void hashCheck(receipt.state).then((c) => { if (live) setCheck(c); });
    return () => { live = false; };
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppShell title="Match receipt">
      <div className="space-y-4" data-testid="receipt">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-semibold text-lg text-zinc-50">{receipt ? `${categoryLabel(receipt.state.category)} receipt` : 'Match receipt'} <span className="font-mono text-sm text-zinc-500">{id}</span></h1>
          <div className="flex gap-2">
            <Link to={`/match/${id}/results`}><ButtonX size="sm">Results</ButtonX></Link>
            <Link onClick={() => id && openReplay(id)} to={`/match/${id}`}><ButtonX size="sm" tone="primary">Watch replay</ButtonX></Link>
          </div>
        </div>
        {missing && <Panel><p className="text-[13px] text-zinc-400" data-testid="receipt-missing">No recorded event log for this match yet.</p></Panel>}
        {!missing && !receipt && <Skeleton className="h-40 w-full" />}
        {receipt && (
          <>
            <Panel title="Provably fair" data-testid="receipt-hash">
              <div className={cn('mb-2 font-semibold text-sm', check?.result === 'ok' && 'text-emerald-400', check?.result === 'bad' && 'text-red-400', (!check || check.result === 'none') && 'text-zinc-400')}>
                {check?.result === 'ok' ? 'Hash check ✓ commit matches the revealed problem set' : check?.result === 'bad' ? 'Hash check ✗ commit does not match' : 'Awaiting reveal…'}
              </div>
              <div className="break-all text-[11px] text-zinc-500">commit <code className="text-zinc-300">{check?.commit ?? receipt.state.commitHash ?? '—'}</code></div>
              {check?.canonical && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-zinc-300">Canonical problem set + salt</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black p-3 font-mono text-[11px] text-zinc-400" data-testid="canonical">{check.canonical}</pre>
                  <div className="mt-1 break-all text-[11px] text-zinc-500">salt <code className="text-zinc-300">{check.salt}</code></div>
                </details>
              )}
            </Panel>

            <Panel title={`Submissions (${receipt.submissions.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]" data-testid="submissions">
                  <thead className="text-zinc-500"><tr><th className="py-1 pr-3">t</th><th className="pr-3">Fighter</th><th className="pr-3">Problem</th><th className="pr-3">Try</th><th className="pr-3">Live</th><th className="pr-3">Final</th><th>Answer</th></tr></thead>
                  <tbody>
                    {receipt.submissions.map((s) => (
                      <tr className="border-zinc-900 border-t" key={s.seq}>
                        <td className="py-1 pr-3 text-zinc-500">{fmtT(s.t)}</td><td className="pr-3 text-zinc-200">{s.fighterId}{receipt.state.category === 'squads' && <span className="ml-1 rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-400">TEAM {squadTeam(receipt.state.fighters[s.fighterId]?.slot ?? receipt.state.order.indexOf(s.fighterId)) === 'team_a' ? 'A' : 'B'}</span>}</td><td className="pr-3">P{s.problem}</td><td className="pr-3">{s.attempt}</td>
                        <td className={cn('pr-3', s.verdict?.ok ? 'text-emerald-400' : 'text-red-400')}>{s.verdict ? `${s.verdict.ok ? 'hit' : 'miss'} ${s.verdict.points >= 0 ? '+' : ''}${s.verdict.points}` : '—'}</td>
                        <td className={cn('pr-3', s.finalVerdict?.overturned ? 'text-amber-300' : 'text-zinc-400')}>{s.finalVerdict ? (s.finalVerdict.overturned ? 'overturned' : 'upheld') : '—'}</td>
                        <td className="font-mono text-zinc-400">{s.answer ?? <span className="text-zinc-600">hidden until reveal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title={`Entry fees and purse (${receipt.purses.length})`}>
              {receipt.purses.length === 0 ? <p className="text-[13px] text-zinc-500">No purse movements recorded.</p> : (
                <table className="w-full text-left text-[12px]" data-testid="purses">
                  <thead className="text-zinc-500"><tr><th className="py-1 pr-3">Kind</th><th className="pr-3">Fighter</th><th className="pr-3">USDC</th><th>Tx</th></tr></thead>
                  <tbody>
                    {receipt.purses.map((p, i) => (
                      <tr className="border-zinc-900 border-t" key={i}><td className="py-1 pr-3">{p.kind === 'entry' ? 'Entry' : 'Paid'}</td><td className="pr-3 text-zinc-200">{p.fighterId}</td><td className="pr-3">{p.amountUsdc}</td><td><TxLink hash={p.ref} /></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title={`Events (${events!.length})`}>
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full text-left text-[12px]" data-testid="events">
                  <thead className="sticky top-0 bg-zinc-950 text-zinc-500"><tr><th className="py-1 pr-3">seq</th><th className="pr-3">t</th><th className="pr-3">type</th><th>summary</th></tr></thead>
                  <tbody>
                    {events!.map((e) => {
                      const h = isHighlight(e);
                      return (
                        <tr className={cn('border-zinc-900 border-t', h === 'card' && 'bg-yellow-400/10 text-yellow-200', h === 'var' && 'bg-amber-300/10 text-amber-200')} data-highlight={h ?? undefined} key={e.seq}>
                          <td className="py-1 pr-3 text-zinc-500">{e.seq}</td><td className="pr-3 text-zinc-500">{fmtT(e.t)}</td><td className="pr-3 font-mono">{e.type}</td><td>{summarize(e)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}
