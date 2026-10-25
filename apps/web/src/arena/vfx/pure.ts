// VFX pure helpers (A-07, FC-F-124, PRD §10.5, art-bible §3/§6). No Pixi, no DOM: unit-tested in node.
import type { ArenaCue } from '@fc/engine';

export const MINUS = '−';                 // PRD uses the true minus sign in pops
export const GOLD = 0xf2c14e, BAD = 0xe5383b, OK = 0x2ec4a6, OUTLINE = 0x14121f;
export const HIT_STOP_MS = 70;                 // §10.5 Impact
export const FLASH_MS = 60;
export const PARTICLE_CAP = 200;               // art-bible §5 #10
export const BIG_FONT = 'Lilita One, Impact, sans-serif';

export type Power = Extract<ArenaCue, { kind: 'attack' }>['power'];
export type ShakeKind = Power | 'ko' | 'overturn';

export interface PopSpec { text: string; color: number; gain: boolean }

/** Score pop for a cue (§10.5): `+30` gold for a hit, `−5` red for a whiff, `−N` red for an overturned VAR. */
export function popFor(cue: ArenaCue): PopSpec | null {
  switch (cue.kind) {
    case 'attack': return { text: `+${Math.abs(cue.points)}`, color: GOLD, gain: true };
    case 'whiff': {
      const m = /[−-](\d+)/.exec(cue.label);
      return { text: `${MINUS}${m ? m[1] : '5'}`, color: BAD, gain: false };
    }
    case 'var': return cue.overturned ? { text: `${MINUS}${Math.abs(cue.points)}`, color: BAD, gain: false } : null;
    default: return null;
  }
}

export interface ShakeSpec { amp: number; ms: number }
/** Screen shake (§10.5: heavy 6 px / 120 ms, special 10 px / 180 ms; light none). KO and VAR overturn also shake (bible §5 #13). Off in reduced motion. */
export function shakeFor(kind: ShakeKind, reduced: boolean): ShakeSpec {
  if (reduced) return { amp: 0, ms: 0 };
  switch (kind) {
    case 'light': return { amp: 0, ms: 0 };
    case 'heavy': return { amp: 6, ms: 120 };
    case 'special': return { amp: 10, ms: 180 };
    case 'ko': return { amp: 12, ms: 240 };
    case 'overturn': return { amp: 8, ms: 160 };
  }
}
/** Damped deterministic shake offset after `elapsed` ms. */
export function shakeOffset(s: ShakeSpec, elapsed: number): { dx: number; dy: number } {
  if (s.ms <= 0 || s.amp <= 0 || elapsed >= s.ms) return { dx: 0, dy: 0 };
  const p = elapsed / s.ms, k = s.amp * (1 - p);
  return { dx: k * Math.sin(p * 47), dy: k * 0.7 * Math.cos(p * 61) };
}

export const sparkCount = (power: Power): number => (power === 'light' ? 8 : power === 'heavy' ? 10 : 12);
export const arcRadius = (power: Power): number => (power === 'light' ? 120 : power === 'heavy' ? 170 : 210);
export const arcMs = (power: Power): number => (power === 'light' ? 220 : power === 'heavy' ? 340 : 520) * 0.6;
/** Score pop lasts 700 ms and rises 48 px (§10.5); reduced motion shortens it. */
export const popMs = (reduced: boolean): number => (reduced ? 420 : 700);
export const popRise = 48;
export const sparkMs = 180;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const easeOutCubic = (p: number): number => 1 - (1 - p) ** 3;
export const easeOutBack = (p: number): number => { const c = 1.70158; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };
export const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

export function hexToInt(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  return m ? parseInt(m[1]!, 16) : 0xffffff;
}

/** Countdown step for time `t` ms since the cue (§10.5: "3 · 2 · 1 · FIGHT!" each 600 ms); null once finished. */
export const COUNT_STEPS = ['3', '2', '1', 'FIGHT!'] as const;
export const COUNT_STEP_MS = 600;
export function countdownStep(t: number): { text: string; p: number } | null {
  if (t < 0) return null;
  const i = Math.floor(t / COUNT_STEP_MS);
  if (i >= COUNT_STEPS.length) return null;
  return { text: COUNT_STEPS[i]!, p: (t - i * COUNT_STEP_MS) / COUNT_STEP_MS };
}

/** VAR sequence timeline (§10.5, ≈2.2 s): phase boundaries in ms. */
export const VAR_T = { freeze: 150, desat: 350, stamp: 570, ghost: 1070, verdict: 1500, resat: 1900, end: 2200 } as const;
/** Desaturation amount 0..1 (1 = stage at 30% saturation) at time t. Reduced motion: no stage filter. */
export function varDesat(t: number, reduced: boolean): number {
  if (reduced || t < VAR_T.freeze || t >= VAR_T.end) return 0;
  if (t < VAR_T.desat) return (t - VAR_T.freeze) / (VAR_T.desat - VAR_T.freeze);
  if (t < VAR_T.resat) return 1;
  return 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat);
}

/** Bounded object pool: acquire reuses released objects; returns null when the cap is reached. */
export class Pool<T> {
  private readonly free: T[] = [];
  private made = 0;
  constructor(private readonly make: () => T, readonly cap = Infinity) {}
  get created(): number { return this.made; }
  get idle(): number { return this.free.length; }
  acquire(): T | null {
    const t = this.free.pop();
    if (t !== undefined) return t;
    if (this.made >= this.cap) return null;
    this.made++;
    return this.make();
  }
  release(t: T): void { this.free.push(t); }
}
