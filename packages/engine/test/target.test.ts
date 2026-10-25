import { describe, expect, it } from 'vitest';
import { pickTarget } from '../src/index.js';
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
