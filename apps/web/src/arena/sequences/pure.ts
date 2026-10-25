// Intro/outro timing + pure helpers (A-09, FC-F-127/128, PRD §10.5). No Pixi, no DOM: unit-tested in node.
export const INTRO = {
  staggerMs: 550,            // drop-ins in slot order, one every 550 ms
  reducedStaggerMs: 150,
  landMs: 300,               // dropIn clip label `land`
  reducedLandMs: 120,        // fade-in
  bubbleLagMs: 350,          // intro line bubble appears this long after landing
  bannerMs: 1800,
  spotlightMs: 800,
  settleMs: 700,             // after the last landing, before the countdown may start
  groupGapMs: 2500,          // dropIns further apart than this start a new stagger group
} as const;
export const COUNTDOWN = { stepMs: 600, fightAtMs: 1800 } as const;   // 3 · 2 · 1 each 600 ms, FIGHT! at 1800 (§10.5)
export const OUTRO = {
  koGapMs: 900, reducedKoGapMs: 250,                 // KOs in rank order 4 → 2
  victoryGapMs: 1100, reducedVictoryGapMs: 300,      // winner pose after the last KO
  podiumDelayMs: 2600, reducedPodiumDelayMs: 700,    // victory → podium handoff
  confettiMs: 2000, spotlightMs: 3400, winnerPopMs: 2400,
} as const;

export const introStagger = (reduced: boolean): number => (reduced ? INTRO.reducedStaggerMs : INTRO.staggerMs);
export const introLand = (reduced: boolean): number => (reduced ? INTRO.reducedLandMs : INTRO.landMs);

/** KO cue `order` is 1-based (4th place first). */
export const koDelay = (order: number, reduced: boolean): number => Math.max(0, order - 1) * (reduced ? OUTRO.reducedKoGapMs : OUTRO.koGapMs);

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Spotlight envelope: fade in, hold, fade out. Reduced motion uses short fades only. */
export function beamAlpha(t: number, dur: number, reduced: boolean): number {
  const fi = reduced ? 120 : 150, fo = reduced ? 120 : 250;
  return clamp01(Math.min(t / fi, (dur - t) / fo));
}

export interface ConfettiPiece { x0: number; y0: number; vx: number; vy: number; rot0: number; vr: number; color: number; size: number; delay: number }
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Deterministic confetti burst across the top of the stage. Reduced motion: none. */
export function makeConfetti(n: number, seed: number, colors: readonly number[], reduced: boolean): ConfettiPiece[] {
  if (reduced || n <= 0 || colors.length === 0) return [];
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    x0: 380 + r() * 1160, y0: -30 - r() * 80, vx: (r() - 0.5) * 260, vy: 160 + r() * 260,
    rot0: r() * Math.PI * 2, vr: (r() - 0.5) * 12, color: colors[Math.floor(r() * colors.length)]!, size: 10 + r() * 12, delay: r() * 600,
  }));
}
export const CONFETTI_GRAVITY = 380;
/** Position of a piece `t` ms after the burst start; null while delayed or after `confettiMs`. */
export function confettiAt(p: ConfettiPiece, t: number): { x: number; y: number; rot: number; alpha: number } | null {
  const s = (t - p.delay) / 1000;
  if (s < 0 || t > OUTRO.confettiMs + p.delay) return null;
  const life = OUTRO.confettiMs / 1000;
  return { x: p.x0 + p.vx * s + Math.sin(s * 5 + p.rot0) * 24, y: p.y0 + p.vy * s + 0.5 * CONFETTI_GRAVITY * s * s, rot: p.rot0 + p.vr * s, alpha: s > life - 0.4 ? clamp01((life - s) / 0.4) : 1 };
}
