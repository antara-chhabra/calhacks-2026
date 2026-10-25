import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { bridge } from '@/bridge';
import { useStore } from '@/data/store';
import type { FighterCardData } from '@/data/store';
import { FighterCard } from './FighterCard';

/** Listens to bridge 'openCard' and shows the lg card in a modal. `lookup` overrides the store (used by the dev gallery). */
export function CardModal({ lookup }: { lookup?: (id: string) => FighterCardData | undefined }): JSX.Element | null {
  const [id, setId] = useState<string | null>(null);
  const fighters = useStore((s) => s.fighters);
  useEffect(() => bridge.on('openCard', (p) => setId(p.fighterId)), []);
  useEffect(() => {
    if (!id) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setId(null); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [id]);
  const fighter = id ? (lookup?.(id) ?? fighters[id]) : undefined;
  if (!id || !fighter) return null;
  return (
    <div role="dialog" aria-modal aria-label={`${fighter.name} card`} onClick={() => setId(null)}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()}>
        <FighterCard fighter={fighter} size="lg" flippable />
      </div>
      <p className="text-xs text-zinc-500">Click the card to flip · Esc to close</p>
    </div>
  );
}
