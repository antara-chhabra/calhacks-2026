// In-canvas labels: pure model (no Pixi) so it runs in node tests (PRD FC-F-125, AC-07.3, art-bible §5 #9).
import type { ArenaCue } from '@fc/engine';
import type { FighterId } from '@fc/contracts';

export const BUBBLE_MAX_CHARS = 80;
export const BUBBLE_WRAP_COLS = 22;
export const BUBBLE_TTL_MS = 3000;
export const HIT_TTL_MS = 1400;
export const MAX_HIT_LABELS = 12;

export interface HitLabel { id: number; text: string; target: FighterId; kind: 'hit' | 'miss'; ageMs: number; ttlMs: number }
export interface Bubble { fighter: FighterId; lines: string[]; ageMs: number; ttlMs: number }

/** Sanitise (text only, never markup), collapse whitespace, truncate to 80 chars with an ellipsis. */
export function clampBubble(text: string, max = BUBBLE_MAX_CHARS): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…';
}

/** Greedy word wrap; words longer than `cols` are hard-split. */
export function wrapBubble(text: string, cols = BUBBLE_WRAP_COLS): string[] {
  const lines: string[] = [];
  let cur = '';
  for (let w of text.split(' ').filter(Boolean)) {
    while (w.length > cols) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(w.slice(0, cols)); w = w.slice(cols);
    }
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= cols) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Label text for attack/whiff cues; the engine already formats "P3 · ★★★ · +30" / "P3 · MISS · −5". */
export function hitText(cue: ArenaCue): { text: string; target: FighterId; kind: 'hit' | 'miss' } | null {
  if (cue.kind === 'attack') return { text: cue.label, target: cue.target, kind: 'hit' };
  if (cue.kind === 'whiff') return { text: cue.label, target: cue.target, kind: 'miss' };
  return null;
}

const RAMP: [number, number][] = [[0, 0xffffff], [60, 0xf2c14e], [120, 0xff8a5b], [200, 0xe5383b]];
const lerp = (a: number, b: number, t: number): number => {
  const c = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};
/** Damage % → text colour: white → gold → orange → red, clamped at 0 and 200. */
export function damageColor(pct: number): number {
  const p = Math.max(0, Number.isFinite(pct) ? pct : 0);
  for (let i = 1; i < RAMP.length; i++) {
    const [p1, c1] = RAMP[i]!, [p0, c0] = RAMP[i - 1]!;
    if (p <= p1) return lerp(c0, c1, (p - p0) / (p1 - p0));
  }
  return RAMP[RAMP.length - 1]![1];
}
export const damageText = (pct: number): string => `${Math.max(0, Math.round(pct))}%`;

export class LabelModel {
  hits: HitLabel[] = [];
  bubbles = new Map<FighterId, Bubble>();
  private nextId = 1;

  /** Synchronous: called from the cue hook on arrival, so a label exists in the same tick as verdict.live (AC-07.3). */
  onCue(cue: ArenaCue): void {
    const h = hitText(cue);
    if (h) {
      this.hits.push({ id: this.nextId++, ...h, ageMs: 0, ttlMs: HIT_TTL_MS });
      if (this.hits.length > MAX_HIT_LABELS) this.hits.splice(0, this.hits.length - MAX_HIT_LABELS);
    } else if (cue.kind === 'say') {
      const t = clampBubble(cue.text);
      if (t) this.bubbles.set(cue.fighter, { fighter: cue.fighter, lines: wrapBubble(t), ageMs: 0, ttlMs: BUBBLE_TTL_MS }); // replaces the old one
      else this.bubbles.delete(cue.fighter);
    }
  }
  /** `dtMs` is real time; `speed` scales lifetimes with replay speed. */
  update(dtMs: number, speed = 1): void {
    const d = dtMs * (speed > 0 ? speed : 1);
    for (const h of this.hits) h.ageMs += d;
    this.hits = this.hits.filter((h) => h.ageMs < h.ttlMs);
    for (const [k, b] of this.bubbles) { b.ageMs += d; if (b.ageMs >= b.ttlMs) this.bubbles.delete(k); }
  }
  snap(): void { this.hits = []; this.bubbles.clear(); }
}
