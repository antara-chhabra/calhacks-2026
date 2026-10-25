import { describe, expect, it } from 'vitest';
import { initialMatchState, reduceMatch, pickTarget } from '../src/index.js';
import { buildLog, reduceAll } from './helpers/log.js';

const base = () => reduceAll(buildLog().slice(0, 5));      // created, locked, 4 entries? -> ensure fighters exist
const set = (s: ReturnType<typeof base>, id: string, patch: object) =>
  ({ ...s, fighters: { ...s.fighters, [id]: { ...s.fighters[id]!, ...patch } } });

describe('pickTarget', () => {
  it('ties go to the lowest slot and never the attacker', () => {
    const s = base();
    expect(pickTarget(s, 'sage')).toBe('vex');
    expect(pickTarget(s, 'vex')).toBe('sage');
  });
  it('picks the opponent with most points', () => {
    const s = set(base(), 'quill', { points: 30 });
    expect(pickTarget(s, 'vex')).toBe('quill');
  });
  it('skips fighters who are out', () => {
    const s = set(set(base(), 'quill', { points: 30 }), 'quill', { status: 'out' });
    expect(pickTarget(s, 'vex')).toBe('sage');
  });
  it('ties above zero still go to lowest slot', () => {
    let s = set(base(), 'glitch', { points: 20 });
    s = set(s, 'quill', { points: 20 });
    expect(pickTarget(s, 'vex')).toBe('glitch');
  });
});

it('squad fighters never target their teammate, including the out-opponent fallback', () => {
  const s = initialMatchState();
  const ev = { v: 1 as const, seq: 1, t: 0, matchId: 'squad', type: 'match.created' as const, data: { category: 'squads' as const, mode: 'mock' as const, isDemo: false, fighters: ['a','b','c','d'], slots: [2,0,3,1] as (0|1|2|3)[], problems: [], commitHash: 'h', bettingClosesAt: 1, timeLimitMs: 1 } };
  const next = reduceMatch(s, ev);
  next.fighters.c!.points = 999;
  expect(pickTarget(next, 'a')).not.toBe('c');
  next.fighters.b!.status = 'out'; next.fighters.d!.status = 'out';
  expect(['b', 'd']).toContain(pickTarget(next, 'a'));
});
