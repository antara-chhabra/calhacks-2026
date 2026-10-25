import { describe, expect, it, vi } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import { createAudio, MAX_VOICES, MUTE_KEY, soundsFor } from '../src/audio/manager';

function param() { return { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }; }
function node() { return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), gain: param(), frequency: param(), Q: param(), type: '', buffer: null, loop: false }; }
function mockCtx() {
  const c = {
    state: 'running', currentTime: 0, sampleRate: 8000, destination: node(), resume: vi.fn(), close: vi.fn(),
    oscillators: 0,
    createGain: vi.fn(() => node()),
    createOscillator: vi.fn(() => { c.oscillators++; return node(); }),
    createBiquadFilter: vi.fn(() => node()),
    createBufferSource: vi.fn(() => node()),
    createBuffer: vi.fn((_n: number, len: number) => ({ getChannelData: () => new Float32Array(len) })),
  };
  return c;
}
function store(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
}
function setup(o: { speed?: number; playing?: boolean; coarse?: boolean; st?: ReturnType<typeof store> } = {}) {
  const ctx = mockCtx();
  const factory = vi.fn(() => ctx as unknown as AudioContext);
  const target = new EventTarget();
  const e = { speed: o.speed ?? 1, playing: o.playing ?? true };
  let t = 0;
  const a = createAudio({ env: () => e, ctxFactory: factory, storage: o.st ?? store(), coarsePointer: () => !!o.coarse, gestureTarget: target, now: () => (t += 1000) });
  return { a, ctx, factory, target, e };
}
const atk = (power: 'light' | 'heavy' | 'special'): ArenaCue => ({ kind: 'attack', fighter: 'a' as never, target: 'b' as never, power, problem: 0 as never, points: 10, label: '' });
const gesture = (t: EventTarget) => t.dispatchEvent(new Event('pointerdown'));

describe('cue mapping', () => {
  it('maps cues to sounds', () => {
    const ids = (c: ArenaCue) => soundsFor(c).map((s) => s.sound.id);
    expect(ids(atk('light'))).toEqual(['hitLight']);
    expect(ids(atk('heavy'))).toEqual(['hitHeavy']);
    expect(ids(atk('special'))).toEqual(['hitSpecial']);
    expect(ids({ kind: 'whiff', fighter: 'a', target: 'b', problem: 0, label: '' } as ArenaCue)).toEqual(['swing', 'miss']);
    expect(ids({ kind: 'card', fighter: 'a', color: 'red' } as ArenaCue)).toEqual(['red']);
    expect(ids({ kind: 'card', fighter: 'a', color: 'yellow' } as ArenaCue)).toEqual(['yellow']);
    expect(ids({ kind: 'ko' } as ArenaCue)).toEqual(['ko']);
    expect(ids({ kind: 'timeup' })).toEqual(['horn']);
    expect(ids({ kind: 'countdown' })).toEqual(['beep', 'gong']);
    expect(ids({ kind: 'done', fighter: 'a' } as ArenaCue)).toEqual([]);
  });
  it('plays oscillators for a cue once unlocked', () => {
    const { a, ctx, target } = setup();
    a.start(); gesture(target);
    a.onCue(atk('special'));
    expect(ctx.oscillators).toBeGreaterThan(0);
  });
});

describe('gesture gating', () => {
  it('creates no AudioContext before a gesture', () => {
    const { a, factory, ctx, target } = setup();
    a.start();
    a.onCue(atk('heavy'));
    expect(factory).not.toHaveBeenCalled();
    expect(ctx.oscillators).toBe(0);
    gesture(target);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('speed, pause and voices', () => {
  const think = { kind: 'think', fighter: 'a' } as ArenaCue;
  it('skips low-priority above 2x, keeps high', () => {
    const { a, ctx, target, e } = setup({ speed: 4 });
    a.start(); gesture(target);
    a.onCue(think);
    expect(ctx.oscillators).toBe(0);
    a.onCue(atk('light'));
    expect(ctx.oscillators).toBeGreaterThan(0);
    e.speed = 1;
  });
  it('rate limits ticks', () => {
    let t = 0;
    const ctx = mockCtx(); const target = new EventTarget();
    const a = createAudio({ env: () => ({ playing: true, speed: 1 }), ctxFactory: () => ctx as never, storage: store(), coarsePointer: () => false, gestureTarget: target, now: () => t });
    a.start(); gesture(target);
    a.onCue(think); const n = ctx.oscillators;
    t = 50; a.onCue(think); expect(ctx.oscillators).toBe(n);
    t = 1000; a.onCue(think); expect(ctx.oscillators).toBeGreaterThan(n);
  });
  it('is silent while paused', () => {
    const { a, ctx, target } = setup({ playing: false });
    a.start(); gesture(target);
    a.onCue(atk('heavy'));
    expect(ctx.oscillators).toBe(0);
  });
  it('caps concurrent voices', () => {
    const { a, ctx, target } = setup();
    a.start(); gesture(target);
    for (let i = 0; i < 30; i++) a.onCue({ kind: 'ko', fighter: 'a', order: 1, rank: 1 } as ArenaCue);
    const perKo = 3;
    expect(ctx.oscillators).toBeLessThanOrEqual(MAX_VOICES * perKo);
  });
});

describe('mute', () => {
  it('persists and restores', () => {
    const st = store();
    const one = setup({ st });
    one.a.setMuted(true);
    expect(st.getItem(MUTE_KEY)).toBe('1');
    expect(setup({ st }).a.muted()).toBe(true);
    one.a.setMuted(false);
    expect(setup({ st }).a.muted()).toBe(false);
  });
  it('defaults muted on coarse pointers unless remembered', () => {
    expect(setup({ coarse: true }).a.muted()).toBe(true);
    expect(setup({ coarse: true, st: store({ [MUTE_KEY]: '0' }) }).a.muted()).toBe(false);
    expect(setup({ coarse: false }).a.muted()).toBe(false);
  });
  it('is silent when muted', () => {
    const { a, ctx, target } = setup();
    a.start(); gesture(target); a.setMuted(true);
    a.onCue(atk('heavy'));
    expect(ctx.oscillators).toBe(0);
  });
  it('survives throwing storage', () => {
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const a = createAudio({ storage: bad, coarsePointer: () => false, gestureTarget: null });
    expect(() => a.setMuted(true)).not.toThrow();
    expect(a.muted()).toBe(true);
  });
});

it('unlocks when entering the arena after a navigation gesture and stops on exit', () => {
  const ctx = mockCtx();
  const factory = vi.fn(() => ctx as unknown as AudioContext);
  const a = createAudio({ ctxFactory: factory, activated: () => true, storage: store(), gestureTarget: new EventTarget() });
  a.start();
  expect(factory).toHaveBeenCalledOnce();
  a.onCue(atk('light'));
  expect(ctx.oscillators).toBeGreaterThan(0);
  a.stop();
  expect(ctx.close).toHaveBeenCalledOnce();
  const count = ctx.oscillators;
  a.onCue(atk('heavy'));
  expect(ctx.oscillators).toBe(count);
});
