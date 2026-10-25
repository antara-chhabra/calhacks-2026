import type { RouteObject } from 'react-router-dom';
import { HOUSE_ROSTER, HOUSE_FIGHTERS } from '@fc/contracts';
import type { CardFrame, FighterStats } from '@fc/contracts';
import type { FighterCardData } from '@/data/store';
import { bridge } from '@/bridge';
import { CardModal, CardSkeleton, FighterCard } from '@/ui/card';

const FRAMES: CardFrame[] = ['bronze', 'silver', 'gold', 'elite', 'hot_streak', 'upset', 'rookie'];
const OVR: Record<CardFrame, number> = { bronze: 58, silver: 70, gold: 80, elite: 91, hot_streak: 77, upset: 72, rookie: 62 };

function synth(i: number, frame: CardFrame): FighterStats {
  const id = HOUSE_FIGHTERS[i]!;
  const b = OVR[frame];
  const v = (o: number) => Math.max(30, Math.min(99, b + o + ((i * 7) % 9) - 4));
  const wins = frame === 'rookie' ? 1 : 8 + i;
  const matches = frame === 'rookie' ? 4 : 20;
  return {
    fighterId: id, category: 'integrals' as FighterStats['category'], matches, wins, podiums: wins + 4, avgScorePct: 0.5 + (b - 50) / 150,
    spd: v(6), acc: v(12), clu: v(-6), dis: v(14), grt: v(-14), con: v(2), ovr: b,
    form: frame === 'hot_streak' ? 'WWWWL' : 'WLWPL', streak: frame === 'hot_streak' ? 4 : -1,
    upsetUntil: frame === 'upset' ? Date.now() + 3_600_000 : null,
    eloHistory: Array.from({ length: 20 }, (_, n) => 1450 + i * 20 + Math.round(Math.sin(n / 2 + i) * 30 + n * 4)),
    backersWon: 1_240_00 + i * 31_000, earningsUsdc: 0.09 * (i + 1),
  };
}

function card(i: number, frame: CardFrame, nullStats = false): FighterCardData {
  const id = HOUSE_FIGHTERS[i]!;
  const p = HOUSE_ROSTER[id];
  const stats = nullStats ? null : synth(i, frame);
  return { ...p, origin: 'house', creatorHandle: null, status: 'active', elo: 1500 + i * 25, stats, frame, walletAddress: null, version: 1 } as FighterCardData;
}

function Gallery() {
  const lookup = (id: string) => card(Math.max(0, HOUSE_FIGHTERS.indexOf(id as (typeof HOUSE_FIGHTERS)[number])), 'gold');
  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-zinc-100">
      <h1 className="mb-1 text-lg font-semibold tracking-tight">Fighter cards</h1>
      <p className="mb-6 text-[13px] text-zinc-500">All frames, front and back. Click any card to open the modal.</p>
      {FRAMES.map((fr, r) => (
        <section key={fr} className="mb-8">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-zinc-500">{fr.replace('_', ' ')}</h2>
          <div className="flex flex-wrap gap-4">
            {HOUSE_FIGHTERS.map((id, i) => (
              <FighterCard key={id + fr} fighter={card(i, fr)} size="sm" side={i % 2 === 0 || r > 3 ? 'front' : 'back'} onOpen={() => bridge.emit('openCard', { fighterId: id })} />
            ))}
          </div>
        </section>
      ))}
      <section className="mb-8">
        <h2 className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Sizes (xs sm md lg) · back · skeleton · null stats</h2>
        <div className="flex flex-wrap items-start gap-4">
          {(['xs', 'sm', 'md', 'lg'] as const).map((s) => <FighterCard key={s} fighter={card(1, 'elite')} size={s} flippable />)}
          <FighterCard fighter={card(1, 'elite')} size="md" side="back" />
          <FighterCard fighter={card(5, 'rookie', true)} size="md" />
          <CardSkeleton size="md" />
        </div>
      </section>
      <CardModal lookup={lookup} />
    </div>
  );
}

export const order = 80;
export const routes: RouteObject[] = [{ path: '/dev/cards', element: <Gallery /> }];
