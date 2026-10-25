// Pure helpers for the fighter card (PRD §10.10, FC-F-160–163). No React, no DOM.
import type { CardFrame, FighterStats } from '@fc/contracts';

export const CARD_SIZES = { xs: 120, sm: 200, md: 280, lg: 360 } as const;
export type CardSize = keyof typeof CARD_SIZES;
export const BASE_W = 280;
export const BASE_H = 392;

export const STAT_KEYS = ['spd', 'acc', 'clu', 'dis', 'grt', 'con'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const STAT_LABEL: Record<StatKey, string> = { spd: 'SPD', acc: 'ACC', clu: 'CLU', dis: 'DIS', grt: 'GRT', con: 'CON' };

/** §10.10: >=85 gold, 75-84 white, 65-74 ink-2, <65 ink-3. */
export function statColor(v: number): string {
  if (v >= 85) return '#F5C84B';
  if (v >= 75) return '#FFFFFF';
  if (v >= 65) return '#A1A1AA';
  return '#52525B';
}

/** Cards show "–" until 3 real matches (§11.9). */
export function statsVisible(stats: { matches: number } | null | undefined): boolean {
  return !!stats && stats.matches >= 3;
}

export function statText(stats: FighterStats | null | undefined, k: StatKey): string {
  return statsVisible(stats) && stats ? String(Math.round(stats[k])) : '–';
}

export type FormChip = { result: 'W' | 'P' | 'L'; filled: boolean; tone: 'gold' | 'silver' | 'hollow' };

/** Last 5 results, newest first in the data; chips are shown oldest to newest (left to right). */
export function formChips(form: string | null | undefined): FormChip[] {
  const chars = [...(form ?? '')].slice(0, 5).filter((c): c is 'W' | 'P' | 'L' => c === 'W' || c === 'P' || c === 'L');
  return chars.reverse().map((result) => ({
    result,
    filled: result !== 'L',
    tone: result === 'W' ? 'gold' : result === 'P' ? 'silver' : 'hollow',
  }));
}

export function tierFromOvr(ovr: number): 'bronze' | 'silver' | 'gold' | 'elite' {
  return ovr >= 85 ? 'elite' : ovr >= 75 ? 'gold' : ovr >= 65 ? 'silver' : 'bronze';
}

export type FrameDisplay = {
  label: string;
  ribbon: string | null;
  special: boolean;
  foil: boolean;
  /** shield gradient stops, top to bottom */
  fill: [string, string, string];
  hairline: string;
  accent: string;
};

const FRAMES: Record<CardFrame, Omit<FrameDisplay, 'ribbon'>> = {
  bronze: { label: 'BRONZE', special: false, foil: false, fill: ['#8a5a3a', '#4a2f1e', '#1d130d'], hairline: '#d9a06b', accent: '#d9a06b' },
  silver: { label: 'SILVER', special: false, foil: false, fill: ['#aab2c0', '#4d5463', '#1c2029'], hairline: '#e5e9f0', accent: '#e5e9f0' },
  gold: { label: 'GOLD', special: false, foil: true, fill: ['#e7b94a', '#7a5a14', '#241a06'], hairline: '#ffe08a', accent: '#ffe08a' },
  elite: { label: 'ELITE', special: false, foil: true, fill: ['#5be3ff', '#5b3df0', '#0d0a2e'], hairline: '#c8f5ff', accent: '#8be9ff' },
  hot_streak: { label: 'HOT STREAK', special: true, foil: true, fill: ['#1a1410', '#0b0908', '#000000'], hairline: '#ff7a1a', accent: '#ff7a1a' },
  upset: { label: 'UPSET', special: true, foil: true, fill: ['#e11d8f', '#6d28d9', '#1a0b33'], hairline: '#f5b8ff', accent: '#f5b8ff' },
  rookie: { label: 'ROOKIE', special: true, foil: false, fill: ['#cfe6ff', '#6f93c4', '#1b2a44'], hairline: '#ffffff', accent: '#dff0ff' },
};

/** Maps CardFrame plus context to what the card shows (ribbon text, colours). */
export function frameDisplay(frame: CardFrame, stats?: Pick<FighterStats, 'streak' | 'upsetUntil'> | null, upsetOdds?: number | null): FrameDisplay {
  const base = FRAMES[frame];
  let ribbon: string | null = null;
  if (frame === 'hot_streak') ribbon = `🔥 ×${Math.max(3, stats?.streak ?? 3)}`;
  else if (frame === 'upset') ribbon = upsetOdds ? `UPSET ${upsetOdds.toFixed(1)}×` : 'UPSET';
  else if (frame === 'rookie') ribbon = 'ROOKIE';
  return { ...base, ribbon };
}

/** Polyline path for a 0..1 series within w x h (padding p). */
export function sparkPath(values: number[], w: number, h: number, p = 3, min?: number, max?: number): string {
  if (values.length === 0) return '';
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const span = hi - lo || 1;
  return values
    .map((v, i) => {
      const x = values.length === 1 ? w / 2 : p + (i * (w - 2 * p)) / (values.length - 1);
      const y = h - p - ((v - lo) / span) * (h - 2 * p);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function winPct(stats: Pick<FighterStats, 'matches' | 'wins'> | null | undefined): string {
  return stats && stats.matches > 0 ? `${Math.round((stats.wins / stats.matches) * 100)}%` : '–';
}

export function recordText(stats: Pick<FighterStats, 'matches' | 'wins'> | null | undefined): string {
  return stats ? `W ${stats.wins} · L ${Math.max(0, stats.matches - stats.wins)}` : 'W – · L –';
}

export function ovrDelta(prev: number | null, next: number): 'up' | 'down' | null {
  if (prev == null || prev === next) return null;
  return next > prev ? 'up' : 'down';
}
