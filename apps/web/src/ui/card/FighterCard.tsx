// Fighter card (PRD §10.10, FC-F-160–163). Base design 280x392, scaled uniformly per size.
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import { motion } from 'motion/react';
import { formatCents } from '@fc/contracts';
import type { FighterStats } from '@fc/contracts';
import { FighterPortrait } from '@/arena';
import type { FighterCardData } from '@/data/store';
import {
  BASE_H, BASE_W, CARD_SIZES, STAT_KEYS, STAT_LABEL, formChips, frameDisplay, ovrDelta, recordText, sparkPath,
  statColor, statText, statsVisible, winPct, type CardSize,
} from './helpers';

export type FighterCardProps = {
  fighter: FighterCardData;
  size: 'xs' | 'sm' | 'md' | 'lg';
  side?: 'front' | 'back';
  flippable?: boolean;
  onOpen?: () => void;
};

const SHIELD = 'M 26 2 H 112 Q 124 2 128 14 Q 140 26 152 14 Q 156 2 168 2 H 254 Q 278 2 278 26 V 318 Q 278 352 140 390 Q 2 352 2 318 V 26 Q 2 2 26 2 Z';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const DISPLAY = '"Lilita One", "Barlow Condensed", Impact, sans-serif';
const COND = '"Barlow Condensed", "Inter", system-ui, sans-serif';

function ShieldBg({ fighter, rid }: { fighter: FighterCardData; rid: string }): JSX.Element {
  const fd = frameDisplay(fighter.frame, fighter.stats);
  const glow = fighter.skin.palette.primary;
  return (
    <svg width={BASE_W} height={BASE_H} viewBox={`0 0 ${BASE_W} ${BASE_H}`} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      <defs>
        <linearGradient id={`g${rid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fd.fill[0]} /><stop offset="0.55" stopColor={fd.fill[1]} /><stop offset="1" stopColor={fd.fill[2]} />
        </linearGradient>
        <radialGradient id={`r${rid}`} cx="50%" cy="38%" r="45%">
          <stop offset="0" stopColor={glow} stopOpacity="0.4" /><stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`c${rid}`}><path d={SHIELD} /></clipPath>
        <linearGradient id={`s${rid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.22" /><stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#g${rid})`} />
      <g clipPath={`url(#c${rid})`}>
        <rect width={BASE_W} height={BASE_H} fill={`url(#r${rid})`} />
        {fighter.frame === 'upset' && <rect width={BASE_W} height={BASE_H} fill={`url(#s${rid})`} />}
        {fd.foil && <rect className="fc-sheen" width={BASE_W} height={BASE_H} fill={`url(#s${rid})`} />}
      </g>
      <path d={SHIELD} fill="none" stroke="#0b0b10" strokeWidth="3" />
      <path d={SHIELD} fill="none" stroke={fd.hairline} strokeWidth="2" transform="translate(140 196) scale(0.94) translate(-140 -196)" opacity="0.9"
        className={fighter.frame === 'hot_streak' ? 'fc-ember' : undefined} />
    </svg>
  );
}

function FormDots({ form }: { form: string | null | undefined }): JSX.Element {
  const chips = formChips(form);
  return (
    <span style={{ display: 'inline-flex', gap: 5 }} aria-label={`Form ${form ?? ''}`}>
      {chips.length === 0 && <span style={{ color: '#71717a', fontFamily: MONO, fontSize: 11 }}>no form</span>}
      {chips.map((c, i) => (
        <span key={i} title={c.result} style={{
          width: 11, height: 11, borderRadius: 99, boxSizing: 'border-box',
          background: c.tone === 'gold' ? '#F5C84B' : c.tone === 'silver' ? '#C9CEDB' : 'transparent',
          border: c.tone === 'hollow' ? '1.5px solid #71717a' : '1.5px solid rgba(0,0,0,0.5)',
        }} />
      ))}
    </span>
  );
}

function RollNumber({ value, color, glowing, fontSize }: { value: string; color: string; glowing: boolean; fontSize: number }): JSX.Element {
  return (
    <motion.span key={value} initial={glowing ? { y: -10, opacity: 0 } : false} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
      style={{ color, fontSize, fontWeight: 700, fontFamily: COND, textShadow: glowing ? `0 0 10px ${color}` : undefined }}>
      {value}
    </motion.span>
  );
}

function usePrevStats(stats: FighterStats | null, ovr: number | null) {
  const prev = useRef<{ stats: FighterStats | null; ovr: number | null }>({ stats, ovr });
  const [changed, setChanged] = useState<Record<string, boolean>>({});
  const [delta, setDelta] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const p = prev.current;
    const ch: Record<string, boolean> = {};
    if (p.stats && stats) for (const k of STAT_KEYS) if (Math.round(p.stats[k]) !== Math.round(stats[k])) ch[k] = true;
    const d = p.ovr != null && ovr != null ? ovrDelta(p.ovr, ovr) : null;
    prev.current = { stats, ovr };
    if (!Object.keys(ch).length && !d) return;
    setChanged(ch);
    const t1 = setTimeout(() => setChanged({}), 600);
    if (d) { setDelta(d); const t2 = setTimeout(() => setDelta(null), 10_000); return () => { clearTimeout(t1); clearTimeout(t2); }; }
    return () => clearTimeout(t1);
  }, [stats, ovr]);
  return { changed, delta };
}

export function CardSkeleton({ size }: { size: CardSize }): JSX.Element {
  const w = CARD_SIZES[size], k = w / BASE_W;
  return (
    <div style={{ width: w, height: BASE_H * k }} aria-busy aria-label="Loading card">
      <svg width={w} height={BASE_H * k} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
        <path d={SHIELD} fill="#18181b" stroke="#3f3f46" strokeWidth="3" className="fc-pulse" />
      </svg>
    </div>
  );
}

function Front({ fighter, rid }: { fighter: FighterCardData; rid: string }): JSX.Element {
  const { stats } = fighter;
  const fd = frameDisplay(fighter.frame, stats);
  const { changed, delta } = usePrevStats(stats, stats ? stats.ovr : null);
  const originLabel = fighter.origin === 'house' ? 'HOUSE' : fighter.origin === 'community' ? 'COMMUNITY' : 'BYO';
  const retired = fighter.status === 'retired';
  const ink = fighter.frame === 'rookie' ? '#0b1626' : '#fff';
  return (
    <div style={{ position: 'absolute', inset: 0, filter: retired ? 'grayscale(1)' : undefined }}>
      <ShieldBg fighter={fighter} rid={rid} />
      <div style={{ position: 'absolute', left: 22, top: 18, color: ink, lineHeight: 1 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 56 }}>{stats ? <RollNumber value={String(stats.ovr)} color={ink} glowing={!!delta} fontSize={56} /> : '–'}</div>
        <div style={{ fontFamily: COND, fontSize: 16, fontWeight: 700, letterSpacing: 1, marginTop: 2, color: fd.accent }}>
          {fighter.archetype === 'scholar' ? 'INT' : fighter.archetype.slice(0, 3).toUpperCase()}
          {delta && <span style={{ marginLeft: 6, color: delta === 'up' ? '#22c55e' : '#f43f5e' }}>{delta === 'up' ? '▲' : '▼'}</span>}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 20, top: 22, fontFamily: COND, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: ink, opacity: 0.85,
        border: `1px solid ${fd.hairline}`, borderRadius: 4, padding: '1px 6px', background: 'rgba(0,0,0,0.25)' }}>{originLabel}</div>
      <div style={{ position: 'absolute', left: 40, top: 22, width: 200, height: 200, display: 'flex', justifyContent: 'center' }}>
        <FighterPortrait skin={fighter.skin} pose="hero" size={200} />
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, top: 198, textAlign: 'center' }}>
        <div style={{ background: 'rgba(0,0,0,0.72)', borderTop: `2px solid ${fd.hairline}`, borderBottom: `2px solid ${fd.hairline}`, padding: '2px 0' }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 28, lineHeight: 1.05, color: '#fff', letterSpacing: 1 }}>{fighter.name}</div>
        </div>
        <div style={{ fontFamily: COND, fontSize: 13, letterSpacing: 2, color: ink, opacity: 0.85, marginTop: 2 }}>{fighter.title.toUpperCase()}</div>
      </div>
      {fd.ribbon && (
        <div style={{ position: 'absolute', right: -2, top: 66, background: fd.hairline, color: '#111', fontFamily: COND, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, padding: '2px 10px', transform: 'rotate(8deg)', border: '2px solid #0b0b10' }}>{fd.ribbon}</div>
      )}
      <div style={{ position: 'absolute', left: 36, right: 36, top: 262, display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 0, lineHeight: '21px' }}>
        {STAT_KEYS.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <RollNumber value={statText(stats, k)} color={statsVisible(stats) && stats ? statColor(stats[k]) : '#71717a'} glowing={!!changed[k]} fontSize={22} />
            <span style={{ fontFamily: COND, fontSize: 13, color: ink, opacity: 0.8, letterSpacing: 1 }}>{STAT_LABEL[k]}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 30, right: 30, top: 330, borderTop: `1px solid ${fd.hairline}55`, paddingTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: ink }}>
        <span style={{ fontFamily: COND, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>{recordText(stats)}</span>
        <FormDots form={stats?.form} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 356, textAlign: 'center', fontFamily: MONO, fontSize: 11, color: ink, opacity: 0.75 }}>🔒 MODEL · CLASSIFIED</div>
      {retired && <div style={{ position: 'absolute', left: 30, right: 30, top: 150, textAlign: 'center', transform: 'rotate(-14deg)', border: '3px solid #f43f5e', color: '#f43f5e', fontFamily: DISPLAY, fontSize: 30, background: 'rgba(0,0,0,0.5)' }}>RETIRED</div>}
    </div>
  );
}

function Back({ fighter, rid }: { fighter: FighterCardData; rid: string }): JSX.Element {
  const s = fighter.stats;
  const fd = frameDisplay(fighter.frame, s);
  const col = fighter.skin.palette.primary;
  const elo = s?.eloHistory?.length ? s.eloHistory : [fighter.elo];
  const scores = s ? deriveScores(s) : [];
  const Row = ({ k, v }: { k: string; v: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: COND, fontSize: 15 }}>
      <span style={{ opacity: 0.7, letterSpacing: 1 }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, color: '#fff' }}>
      <ShieldBg fighter={{ ...fighter, frame: fighter.frame }} rid={rid} />
      <div style={{ position: 'absolute', inset: 0, background: 'transparent' }} />
      <div style={{ position: 'absolute', left: 28, right: 28, top: 30 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, letterSpacing: 2, textAlign: 'center' }}>SCOUTING REPORT</div>
        <div style={{ fontFamily: COND, fontSize: 13, textAlign: 'center', opacity: 0.8, letterSpacing: 2 }}>{fighter.name} · {fd.label}</div>
        <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, opacity: 0.6 }}>LAST 10 · SCORE %</div>
          <svg width={216} height={44} viewBox="0 0 216 44">
            <path d={sparkPath(scores, 216, 44, 4, 0, 100)} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ marginTop: 8, display: 'grid', gap: 1 }}>
          <Row k="W-L-PODIUMS" v={s ? `${s.wins}-${Math.max(0, s.matches - s.wins)}-${s.podiums}` : '–'} />
          <Row k="WIN %" v={winPct(s)} />
          <Row k="AVG SCORE" v={s ? `${Math.round(s.avgScorePct * 100)}%` : '–'} />
        </div>
        <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 6 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}><span>ELO</span><span>{Math.round(fighter.elo)}</span></div>
          <svg width={216} height={36} viewBox="0 0 216 36">
            <path d={sparkPath(elo, 216, 36)} fill="none" stroke="#F5C84B" strokeWidth={2} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ marginTop: 8, display: 'grid', gap: 1 }}>
          <Row k="BACKERS WON" v={s ? formatCents(s.backersWon) : '–'} />
          <Row k="PURSE USDC" v={s ? s.earningsUsdc.toFixed(2) : '–'} />
        </div>
      </div>
    </div>
  );
}

/** Per-match score series is not part of FighterStats; use recent eloHistory deltas mapped to 0..100 as a stand-in trend around avgScorePct. */
function deriveScores(s: FighterStats): number[] {
  const h = s.eloHistory.slice(-10);
  if (h.length < 2) return [Math.round(s.avgScorePct * 100)];
  const base = s.avgScorePct * 100;
  const mean = h.reduce((a, b) => a + b, 0) / h.length;
  return h.map((e) => Math.max(0, Math.min(100, base + (e - mean) / 2)));
}

export function FighterCard({ fighter, size, side, flippable, onOpen }: FighterCardProps): JSX.Element {
  const rid = useId().replace(/:/g, '');
  const [flipped, setFlipped] = useState(false);
  const showBack = side ? side === 'back' : flipped;
  const w = CARD_SIZES[size], k = w / BASE_W;
  const frame = fighter.frame;
  const click = () => { if (flippable) setFlipped((f) => !f); onOpen?.(); };
  const face: CSSProperties = { position: 'absolute', top: 0, left: 0, width: BASE_W, height: BASE_H, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' };
  return (
    <div
      role={onOpen || flippable ? 'button' : undefined}
      tabIndex={onOpen || flippable ? 0 : undefined}
      aria-label={`${fighter.name} card, OVR ${fighter.stats?.ovr ?? 'unknown'}`}
      onClick={click}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } }}
      data-frame={frame} data-size={size}
      className="fc-card"
      style={{ width: w, height: BASE_H * k, position: 'relative', cursor: onOpen || flippable ? 'pointer' : 'default', perspective: 1200, flex: 'none' }}
    >
      <style>{CSS}</style>
      <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${k})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
        <motion.div initial={false} animate={{ rotateY: showBack ? 180 : 0 }} transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ width: BASE_W, height: BASE_H, position: 'relative', transformStyle: 'preserve-3d' }}>
          <div style={face}><Front fighter={fighter} rid={rid + 'f'} /></div>
          <div style={{ ...face, transform: 'rotateY(180deg)' }}><Back fighter={fighter} rid={rid + 'b'} /></div>
        </motion.div>
      </div>
    </div>
  );
}

const CSS = `
.fc-card:hover .fc-sheen{animation:fc-sheen 1.2s ease}
@keyframes fc-sheen{from{transform:translateX(-120%)}to{transform:translateX(120%)}}
@keyframes fc-ember{0%,100%{opacity:.55}50%{opacity:1}}
.fc-ember{animation:fc-ember 1.4s ease-in-out infinite}
@keyframes fc-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.fc-pulse{animation:fc-pulse 1.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.fc-ember,.fc-pulse,.fc-card:hover .fc-sheen{animation:none}}
`;
