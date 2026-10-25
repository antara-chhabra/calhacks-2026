// Director panel (FC-F-007). Token from location.hash -> sessionStorage; polls health (3 s) and log (3 s).
import { CATEGORY_CATALOG, HOUSE_ROSTER, type Category } from '@fc/contracts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ButtonX, LiveDot, Modal, Panel, toast } from '@/components/fightcard/primitives';
import { config } from '@/config';
import { fixtureNames } from '@/data/replay';
import { cn } from '@/lib/utils';
import { AdminError, createAdminClient, forgetToken, loadToken, type Health } from './client';

const POLL_MS = 3000;

function Pill({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'bad' | 'neutral' }) {
  const cls = tone === 'ok' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-zinc-300';
  return (
    <div className="rounded-xl bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800">
      <div className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={cn('font-medium text-sm', cls)}>{value}</div>
    </div>
  );
}

export function DirectorPanel() {
  const [token, setToken] = useState<string | null>(() => loadToken(window.location.hash));
  const client = useMemo(() => (token ? createAdminClient(config.runnerAdminUrl, token) : null), [token]);
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<AdminError | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [matchId, setMatchId] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [category, setCategory] = useState<Category>('integrals');
  const [windowS, setWindowS] = useState('');
  const [demoFx, setDemoFx] = useState('');
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const fixtures = useMemo(() => fixtureNames(), []);

  // A new #token=… in the same tab replaces the stored one.
  useEffect(() => {
    const on = () => { const t = loadToken(window.location.hash); if (t) setToken(t); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // Drop the token from the address bar once stored.
  useEffect(() => { if (token && window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search); }, [token]);

  const poll = useCallback(async () => {
    if (!client) return;
    try {
      const [h, l] = await Promise.all([client.health(), client.log(50)]);
      setHealth(h); setLines(l); setErr(null);
    } catch (e) { setErr(e instanceof AdminError ? e : new AdminError('unreachable', 'Runner unreachable', 0)); }
  }, [client]);
  useEffect(() => {
    if (!client) return;
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [client, poll]);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lines]);
  useEffect(() => { if (!demoFx && fixtures[0]) setDemoFx(fixtures[0]); }, [fixtures, demoFx]);

  async function run(name: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(name);
    try { await fn(); if (ok) toast(ok, 'success'); void poll(); }
    catch (e) { toast(e instanceof AdminError ? e.message : 'Action failed', 'error'); if (e instanceof AdminError && e.unauthorized) setErr(e); }
    finally { setBusy(null); }
  }
  const needId = (fn: (id: string) => Promise<unknown>) => () => {
    const id = matchId.trim();
    if (!id) { toast('Enter a match id (or create one) first', 'error'); return Promise.resolve(); }
    return fn(id);
  };

  if (!client) {
    return (
      <Panel title="Director" data-testid="director-no-token">
        <p className="text-[13px] text-zinc-400">Open this page as <code className="text-zinc-200">/director#token=&lt;FC_DIRECTOR_TOKEN&gt;</code>. The token is kept in this tab only.</p>
      </Panel>
    );
  }

  const unreachable = err?.unreachable;
  const dis = !!busy || !!unreachable;
  const toggleFighter = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const wnum = Number(windowS);

  return (
    <div className="space-y-4" data-testid="director">
      {err && (
        <div className={cn('rounded-xl border px-4 py-3 text-[13px]', unreachable ? 'border-amber-300/30 bg-amber-300/5 text-amber-200' : 'border-red-500/30 bg-red-500/5 text-red-300')} data-testid="director-error" role="alert">
          {err.message}
          {err.unauthorized && <button className="ml-3 underline" onClick={() => { forgetToken(); setToken(null); }} type="button">Forget token</button>}
        </div>
      )}

      <Panel action={<span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500"><LiveDot />polling 3 s</span>} title="Runner health">
        {health ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="health">
            <Pill label="Mode" tone="neutral" value={health.mode} />
            <Pill label="Engine" tone="neutral" value={health.engine} />
            <Pill label="Spacetime" tone={health.stdb === 'ok' ? 'ok' : 'bad'} value={health.stdb} />
            <Pill label="Droid" tone={health.droid === 'down' ? 'bad' : 'ok'} value={health.droid} />
            <Pill label="Payments" tone={health.payments === 'down' ? 'bad' : 'neutral'} value={health.payments} />
            <Pill label="Season" tone={health.season.on ? 'ok' : 'neutral'} value={health.season.on ? 'on' : 'off'} />
            <Pill label="Played" tone="neutral" value={String(health.season.played)} />
            <Pill label="Credits / h" tone="neutral" value={String(health.season.creditsHour)} />
            {health.season.pausedReason && <div className="col-span-full text-[12px] text-amber-300">Season paused: {health.season.pausedReason}</div>}
          </div>
        ) : (
          <div className="text-[13px] text-zinc-500">{unreachable ? 'Runner unreachable' : 'Loading…'}</div>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Create match">
          <label className="mb-1 block text-[12px] text-zinc-400">Challenge category
            <select aria-label="Challenge category" className="mt-1 block h-9 w-full rounded-lg bg-zinc-900 px-3 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-hidden focus-visible:ring-zinc-400" onChange={(e) => setCategory(e.target.value as Category)} value={category}>
              {CATEGORY_CATALOG.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">{CATEGORY_CATALOG.find((c) => c.id === category)?.description}</p>
          <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Fighters">
            {Object.entries(HOUSE_ROSTER).map(([id, f]) => (
              <button aria-pressed={picked.includes(id)} className={cn('rounded-full px-3 py-1 text-[12px] ring-1', picked.includes(id) ? 'bg-zinc-100 text-zinc-900 ring-zinc-100' : 'bg-zinc-900 text-zinc-300 ring-zinc-800 hover:ring-zinc-600')} key={id} onClick={() => toggleFighter(id)} type="button">{f.name}</button>
            ))}
          </div>
          <p className="mb-3 text-[11px] text-zinc-500">{picked.length === 0 ? 'No selection: four fighters are picked automatically.' : picked.length < 4 ? 'Select at least 4 fighters.' : `${picked.length} selected`}</p>
          <label className="mb-3 block text-[12px] text-zinc-400">Bet window (seconds)
            <input className="mt-1 block h-9 w-28 rounded-lg bg-zinc-900 px-3 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-hidden focus-visible:ring-zinc-400" inputMode="numeric" onChange={(e) => setWindowS(e.target.value.replace(/\D/g, ''))} placeholder="default" value={windowS} />
          </label>
          <ButtonX disabled={dis || (picked.length > 0 && picked.length < 4)} loading={busy === 'create'} onClick={() => void run('create', async () => {
            const r = await client.createMatch({ category, ...(picked.length ? { fighters: picked } : {}), ...(wnum >= 1 ? { betWindowS: wnum } : {}) });
            setMatchId(r.matchId);
          }, 'Match created')} tone="primary">Create match now</ButtonX>
        </Panel>

        <Panel title="Control match">
          <label className="mb-3 block text-[12px] text-zinc-400">Match id
            <input className="mt-1 block h-9 w-full rounded-lg bg-zinc-900 px-3 font-mono text-sm text-zinc-100 ring-1 ring-zinc-800 outline-hidden focus-visible:ring-zinc-400" data-testid="match-id" onChange={(e) => setMatchId(e.target.value)} placeholder="m_…" value={matchId} />
          </label>
          <div className="flex flex-wrap gap-2">
            <ButtonX disabled={dis} loading={busy === 'lock'} onClick={() => void run('lock', needId((id) => client.lock(id)), 'Betting locked, fight starting')} tone="primary">Fight now</ButtonX>
            <ButtonX disabled={dis} loading={busy === 'hold'} onClick={() => void run('hold', needId((id) => client.hold(id, 30)), 'Betting held +30 s')}>Hold +30 s</ButtonX>
            <ButtonX disabled={dis} onClick={() => setVoidOpen(true)} tone="no">Void…</ButtonX>
          </div>
        </Panel>

        <Panel title="Season">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-zinc-400">Auto-schedule matches</span>
            <ButtonX disabled={dis || !health} loading={busy === 'season'} onClick={() => health && void run('season', () => client.setSeason(!health.season.on), health.season.on ? 'Season off' : 'Season on')} tone={health?.season.on ? 'yes' : 'secondary'}>{health?.season.on ? 'On' : 'Off'}</ButtonX>
          </div>
        </Panel>

        <Panel title="Demo">
          <div className="flex gap-2">
            <select aria-label="Demo fixture" className="h-9 min-w-0 flex-1 rounded-lg bg-zinc-900 px-2 text-sm text-zinc-100 ring-1 ring-zinc-800" onChange={(e) => setDemoFx(e.target.value)} value={demoFx}>
              {fixtures.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <ButtonX disabled={dis || !demoFx} loading={busy === 'demo'} onClick={() => void run('demo', () => client.demo(demoFx), 'Demo started')}>Run demo</ButtonX>
          </div>
        </Panel>
      </div>

      <Panel title="Runner log (last 50)">
        <pre className="max-h-72 overflow-auto rounded-lg bg-black p-3 font-mono text-[11px] text-zinc-400 leading-relaxed" data-testid="log" ref={logRef}>{lines.length ? lines.join('\n') : unreachable ? 'Runner unreachable' : 'No log lines yet.'}</pre>
      </Panel>

      <Modal onClose={() => setVoidOpen(false)} open={voidOpen} title="Void match">
        <p className="mb-3 text-[13px] text-zinc-400">Void <code className="text-zinc-200">{matchId || '—'}</code>: all bets are refunded.</p>
        <input aria-label="Reason" className="mb-4 h-9 w-full rounded-lg bg-zinc-900 px-3 text-sm text-zinc-100 ring-1 ring-zinc-800" maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" value={reason} />
        <div className="flex gap-2">
          <ButtonX disabled={!reason.trim() || !matchId.trim()} onClick={() => { setVoidOpen(false); void run('void', () => client.voidMatch(matchId.trim(), reason.trim()), 'Match voided'); setReason(''); }} tone="no">Void match</ButtonX>
          <ButtonX onClick={() => setVoidOpen(false)} tone="ghost">Cancel</ButtonX>
        </div>
      </Modal>
    </div>
  );
}
