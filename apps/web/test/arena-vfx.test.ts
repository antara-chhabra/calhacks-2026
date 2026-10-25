import { describe, expect, it } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import { countdownStep, hexToInt, Pool, popFor, shakeFor, shakeOffset, sparkCount, varDesat, VAR_T, MINUS, GOLD, BAD } from '../src/arena/vfx/pure';

const attack = (points: number, power: 'light' | 'heavy' | 'special' = 'light'): ArenaCue => ({ kind: 'attack', fighter: 'a' as never, target: 'b' as never, power, problem: 1, points, label: 'x' });

describe('vfx pops', () => {
  it('hit is +N gold', () => expect(popFor(attack(30))).toEqual({ text: '+30', color: GOLD, gain: true }));
  it('whiff is red minus from label, default 5', () => {
    const w = (label: string): ArenaCue => ({ kind: 'whiff', fighter: 'a' as never, target: 'b' as never, problem: 2, label });
    expect(popFor(w(`P2 · MISS · ${MINUS}5`))).toEqual({ text: `${MINUS}5`, color: BAD, gain: false });
    expect(popFor(w('MISS'))?.text).toBe(`${MINUS}5`);
  });
  it('overturned VAR is red minus of |points|; other cues have no pop', () => {
    const v: ArenaCue = { kind: 'var', fighter: 'a' as never, target: 'b' as never, problem: 1, overturned: true, points: -10 };
    expect(popFor(v)).toEqual({ text: `${MINUS}10`, color: BAD, gain: false });
    expect(popFor({ ...v, overturned: false } as ArenaCue)).toBeNull();
    expect(popFor({ kind: 'countdown' })).toBeNull();
  });
});

describe('vfx shake', () => {
  it('scales by power per PRD 10.5', () => {
    expect(shakeFor('light', false).amp).toBe(0);
    expect(shakeFor('heavy', false)).toEqual({ amp: 6, ms: 120 });
    expect(shakeFor('special', false)).toEqual({ amp: 10, ms: 180 });
    expect(shakeFor('ko', false).amp).toBeGreaterThan(shakeFor('heavy', false).amp);
  });
  it('is off in reduced motion', () => {
    for (const k of ['light', 'heavy', 'special', 'ko', 'overturn'] as const) expect(shakeFor(k, true)).toEqual({ amp: 0, ms: 0 });
  });
  it('offset is bounded by amp, decays, and ends at zero', () => {
    const s = shakeFor('special', false);
    for (let t = 0; t < s.ms; t += 7) { const o = shakeOffset(s, t); expect(Math.abs(o.dx)).toBeLessThanOrEqual(s.amp); expect(Math.abs(o.dy)).toBeLessThanOrEqual(s.amp); }
    expect(shakeOffset(s, s.ms)).toEqual({ dx: 0, dy: 0 });
    expect(shakeOffset(shakeFor('heavy', true), 10)).toEqual({ dx: 0, dy: 0 });
  });
  it('spark count is 8-12', () => {
    for (const p of ['light', 'heavy', 'special'] as const) { expect(sparkCount(p)).toBeGreaterThanOrEqual(8); expect(sparkCount(p)).toBeLessThanOrEqual(12); }
  });
});

describe('vfx pool', () => {
  it('reuses released objects and respects the cap', () => {
    let n = 0;
    const p = new Pool(() => ({ id: ++n }), 2);
    const a = p.acquire()!, b = p.acquire()!;
    expect(p.acquire()).toBeNull();
    p.release(a);
    expect(p.acquire()).toBe(a);
    expect(p.created).toBe(2);
    p.release(b);
    expect(p.idle).toBe(1);
    for (let i = 0; i < 100; i++) p.release(p.acquire()!);
    expect(p.created).toBe(2);
  });
});

describe('vfx misc', () => {
  it('countdown steps 3 2 1 FIGHT! each 600 ms', () => {
    expect([0, 600, 1200, 1800].map((t) => countdownStep(t)?.text)).toEqual(['3', '2', '1', 'FIGHT!']);
    expect(countdownStep(2400)).toBeNull();
  });
  it('VAR desaturation ramps, holds, restores; none in reduced motion', () => {
    expect(varDesat(0, false)).toBe(0);
    expect(varDesat(VAR_T.desat, false)).toBe(1);
    expect(varDesat(1000, false)).toBe(1);
    expect(varDesat(VAR_T.end, false)).toBe(0);
    expect(varDesat(1000, true)).toBe(0);
  });
  it('hexToInt', () => { expect(hexToInt('#E5383B')).toBe(0xe5383b); expect(hexToInt('nope')).toBe(0xffffff); });
});
