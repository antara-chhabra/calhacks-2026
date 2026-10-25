// Pure stage helpers (PRD §10.6): slot table, clock formatting, jumbotron gem derivation. No Pixi, no DOM.
import type { ProblemIdx, Slot } from '@fc/contracts';
import type { MatchState } from '@fc/engine';

export const STAGE_W = 1920, STAGE_H = 1080;

export type SlotSpec = { slot: Slot; x: number; y: number; facing: 1 | -1; platform: 'leftFloat' | 'main' | 'rightFloat' };
/** Feet anchors (PRD §10.6). facing 1 = looks right, -1 = looks left. */
export const SLOTS: readonly SlotSpec[] = [
  { slot: 0, x: 390, y: 520, facing: 1, platform: 'leftFloat' },
  { slot: 1, x: 700, y: 760, facing: 1, platform: 'main' },
  { slot: 2, x: 1220, y: 760, facing: -1, platform: 'main' },
  { slot: 3, x: 1530, y: 520, facing: -1, platform: 'rightFloat' },
];

/** Platform top rectangles (x, top y, width, height). */
export const PLATFORMS = {
  leftFloat: { x: 220, y: 520, w: 340, h: 40 },
  rightFloat: { x: 1360, y: 520, w: 340, h: 40 },
  main: { x: 560, y: 760, w: 800, h: 80 },
} as const;

/** m:ss remaining. Clamped to [0, limit]; no start yet = full limit. */
export function matchClockMs(timeLimitMs: number, startedT: number | null, t: number): number {
  if (startedT === null) return Math.max(0, timeLimitMs);
  return Math.max(0, Math.min(timeLimitMs, timeLimitMs - (t - startedT)));
}
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export type GemState = 'pending' | 'solved' | 'overturned';
/**
 * Per problem: `solved` if any fighter has a non-overturned solve; `overturned` if solves exist and all were
 * overturned (VAR); otherwise `pending`.
 */
export function gemStates(s: Pick<MatchState, 'problems' | 'fighters'>): { idx: ProblemIdx; state: GemState }[] {
  const fs = Object.values(s.fighters);
  return s.problems.map((p) => {
    let any = false, live = false;
    for (const f of fs) {
      const sv = f.solved[p.idx];
      if (!sv) continue;
      any = true;
      if (sv.final !== 'overturned') live = true;
    }
    return { idx: p.idx, state: live ? 'solved' : any ? 'overturned' : 'pending' };
  });
}

export function matchLabel(matchId: string | null): string {
  if (!matchId) return 'MATCH';
  const m = /(\d+)$/.exec(matchId);
  return `MATCH #${m ? m[1] : matchId.slice(-4).toUpperCase()}`;
}
