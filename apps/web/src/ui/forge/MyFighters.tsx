// My Fighters (FC-F-206): the creator's fighters with card, status, record and earnings.
import { useMemo } from 'react';
import { useStore } from '@/data/store';
import { Panel } from '@/components/fightcard/primitives';
import { cn } from '@/lib/utils';
import { FighterCard } from '@/ui/card';
import { recordText } from '@/ui/card/helpers';

export const STATUS_CLS = {
  provisional: 'bg-amber-300/10 text-amber-300 ring-amber-300/30',
  active: 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/30',
  retired: 'bg-zinc-800 text-zinc-400 ring-zinc-700',
} as const;

export function useMyFighters() {
  const me = useStore((s) => s.me);
  const fighters = useStore((s) => s.fighters);
  return useMemo(() => (me?.handle ? Object.values(fighters).filter((f) => f.creatorHandle === me.handle) : []), [me?.handle, fighters]);
}

export function MyFighters() {
  const mine = useMyFighters();
  return (
    <Panel title="My fighters">
      {mine.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No fighters yet. Forge your first above.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((f) => (
            <li className="flex gap-3 rounded-xl bg-zinc-900/60 p-3 ring-1 ring-zinc-900" data-testid="my-fighter" key={f.id}>
              <FighterCard fighter={f} size="xs" />
              <div className="min-w-0 space-y-1.5 text-[13px]">
                <div className="truncate font-medium text-zinc-100">{f.name}</div>
                <span className={cn('inline-flex h-6 items-center rounded-md px-2 text-[11px] font-semibold ring-1', STATUS_CLS[f.status])}>{f.status.toUpperCase()}</span>
                <div className="text-zinc-400">{recordText(f.stats)}</div>
                <div className="text-zinc-400">Earnings {f.stats ? `${f.stats.earningsUsdc.toFixed(2)} USDC` : '–'}</div>
                {f.status === 'provisional' && f.stats == null && <div className="text-[12px] text-zinc-500">Next match: debut pending</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
