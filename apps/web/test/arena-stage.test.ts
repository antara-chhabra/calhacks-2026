import { describe, expect, it } from 'vitest';
import { JUMBO, PLATFORMS, SLOTS, STAGE_H, STAGE_W, formatClock, gemStates, matchClockMs, matchLabel } from '../src/arena/stage/layout';

describe('stage layout', () => {
  it('slot table matches PRD §10.6', () => {
    expect(SLOTS.map((s) => [s.x, s.y, s.facing])).toEqual([[390, 520, 1], [700, 760, 1], [1220, 760, -1], [1530, 520, -1]]);
  });
  it('clock', () => {
    expect(formatClock(84_000)).toBe('1:24');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(59_001)).toBe('1:00');
    expect(matchClockMs(300_000, null, 5)).toBe(300_000);
    expect(matchClockMs(300_000, 1000, 61_000)).toBe(240_000);
    expect(matchClockMs(300_000, 0, 999_999)).toBe(0);
  });
  it('gems', () => {
    const problems = [1, 2, 3, 4, 5].map((idx) => ({ idx, difficulty: 'easy', points: 10 })) as never;
    const f = (solved: object) => ({ solved }) as never;
    const st = { problems, fighters: {
      a: f({ 1: { final: 'held' }, 2: { final: 'overturned' }, 3: { final: 'pending' } }),
      b: f({ 2: { final: 'overturned' }, 3: { final: 'overturned' }, 4: { final: 'overturned' } }),
    } } as never;
    expect(gemStates(st).map((g) => g.state)).toEqual(['solved', 'overturned', 'solved', 'overturned', 'pending']);
  });
  it('jumbotron stays clear of every fighter, its labels and its weapon arc', () => {
    // A fighter (with helm, raised weapon and head label) occupies its slot column from its feet up to the top of the stage.
    const reach = 360;   // greatsword tip ≈ 100 art px ahead of the grip, plus the body half-width
    expect(JUMBO.y).toBeGreaterThan(PLATFORMS.main.y + PLATFORMS.main.h);
    expect(JUMBO.x).toBeGreaterThanOrEqual(0); expect(JUMBO.x + JUMBO.w).toBeLessThanOrEqual(STAGE_W);
    expect(JUMBO.y + JUMBO.h).toBeLessThanOrEqual(STAGE_H);
    for (const s of SLOTS) {
      const x0 = s.x - reach, x1 = s.x + reach, overlapsX = JUMBO.x < x1 && JUMBO.x + JUMBO.w > x0;
      if (overlapsX) expect(JUMBO.y, `slot ${s.slot}`).toBeGreaterThan(s.y);   // only ever below the feet
    }
  });
  it('label', () => { expect(matchLabel('m-42')).toBe('MATCH #42'); expect(matchLabel(null)).toBe('MATCH'); });
});
