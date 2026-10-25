import { describe, expect, it } from 'vitest';
import { SLOTS, formatClock, gemStates, matchClockMs, matchLabel } from '../src/arena/stage/layout';

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
  it('label', () => { expect(matchLabel('m-42')).toBe('MATCH #42'); expect(matchLabel(null)).toBe('MATCH'); });
});
