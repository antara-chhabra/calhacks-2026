// Presenter controls on the arena screen (demo flow): open a match that waits for bets, then start the fight on cue.
// Shown only when this tab holds the Director token (/match/live#token=… or a prior /director visit); viewers never see it.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_CATALOG, type Category } from '@fc/contracts';
import { config } from '@/config';
import { useStore } from '@/data/store';
import { createAdminClient, loadToken } from '@/ui/director/client';

const WAIT_FOR_BETS_S = 3600;   // betting stays open until the presenter presses Start

export function PresenterControls() {
  const token = useMemo(() => loadToken(window.location.hash), []);
  const client = useMemo(() => (token ? createAdminClient(config.runnerAdminUrl, token) : null), [token]);
  const navigate = useNavigate();
  const state = useStore((s) => s.watch.state);
  const current = useStore((s) => (s.watch.matchId ? s.matches[s.watch.matchId] : undefined));
  const [category, setCategory] = useState<Category>((current?.category as Category | undefined) ?? 'integrals');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!client) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const open = state.status === 'open' && !!state.matchId;
  const finished = !state.matchId || state.status === 'settled' || state.status === 'void';

  return (
    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="presenter-controls">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Presenter</div>
      {open && (
        <button className="h-10 w-full rounded-lg bg-amber-400 font-semibold text-black text-sm disabled:opacity-40" disabled={busy}
          onClick={() => run(async () => { await client.lock(state.matchId!); setMsg('Betting locked. Fight starting.'); })} type="button">
          Start the fight ▶
        </button>
      )}
      {finished && (
        <>
          <select aria-label="Challenge category" className="h-9 w-full rounded-lg bg-zinc-900 px-2 text-sm text-zinc-100 ring-1 ring-zinc-800"
            onChange={(e) => setCategory(e.target.value as Category)} value={category}>
            {CATEGORY_CATALOG.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="h-10 w-full rounded-lg bg-zinc-100 font-semibold text-black text-sm disabled:opacity-40" disabled={busy}
            onClick={() => run(async () => {
              const { matchId } = await client.createMatch({ category, betWindowS: WAIT_FOR_BETS_S });
              navigate(`/match/${matchId}`);
            })} type="button">
            New match · waits for bets
          </button>
        </>
      )}
      {!open && !finished && <p className="text-[12px] text-zinc-400">Fight in progress.</p>}
      {msg && <p className="text-[12px] text-zinc-400" role="status">{msg}</p>}
    </div>
  );
}
