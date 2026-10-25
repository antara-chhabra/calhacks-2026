import { describe, expect, it, vi } from 'vitest';
import { ATTACK_CLIPS, CLIPS, CLIP_MS, LOOPING_CLIPS, type ClipName, type PoseDriver } from '../src/arena/clips';

const PRD_CLIPS = ['idle', 'think', 'toolUse', 'dash', 'slashLight', 'slashHeavy', 'special', 'whiff', 'counter', 'hitReact', 'knockback', 'stagger', 'koBlast', 'victory', 'taunt', 'dropIn', 'cardReact'];
const BONES = ['torso', 'head', 'upperArmF', 'forearmF', 'upperArmB', 'forearmB', 'thighF', 'shinF', 'footF', 'thighB', 'shinB', 'footB'];
const ref = (v: Record<string, number>, w: number, face = 'neutral') => ({ bones: Object.fromEntries(BONES.map((b) => [b, v[b] ?? 0])), weapon: w, face });

function fake(): PoseDriver & { flushes: number } {
  const base = ref({ torso: -2, head: -3, upperArmF: -30, forearmF: -50, upperArmB: 22, forearmB: 8, thighF: -6, shinF: 10, footF: -4, thighB: 8, shinB: -8 }, 36);
  const d = {
    flushes: 0,
    state: { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: base.weapon, bones: { ...base.bones }, face: 'neutral' },
    base,
    poses: { attack: ref({ torso: 16, upperArmF: -96, forearmF: -10, thighF: -38 }, 112, 'focus'), ko: ref({ torso: -6, upperArmF: -125 }, -62, 'ko'), victory: ref({ upperArmF: -160, forearmF: -6 }, 8, 'smug') },
    setFacing: vi.fn(),
    flush() { d.flushes++; },
  };
  return d as unknown as PoseDriver & { flushes: number };
}

describe('clip registry', () => {
  it('has every PRD §10.8 clip, and nothing is undefined', () => {
    expect(Object.keys(CLIPS).sort()).toEqual([...PRD_CLIPS].sort());
    for (const n of PRD_CLIPS) expect(typeof CLIPS[n as ClipName]).toBe('function');
  });
});

describe.each(PRD_CLIPS as ClipName[])('clip %s', (name) => {
  it('builds a paused timeline with the documented duration', () => {
    const tl = CLIPS[name](fake(), { facing: 1 });
    expect(tl.paused()).toBe(true);
    expect(tl.duration() * 1000).toBeCloseTo(CLIP_MS[name], 0);
    expect(tl.repeat()).toBe(LOOPING_CLIPS.includes(name) ? -1 : 0);
  });
  it('runs to the end without producing NaN and flushes the driver', () => {
    const d = fake();
    const tl = CLIPS[name](d, { loop: false, distance: 150, damagePct: 40, color: 'red' });
    tl.progress(1);
    expect(d.flushes).toBeGreaterThan(0);
    const s = d.state;
    for (const v of [s.x, s.y, s.rot, s.sx, s.sy, s.alpha, s.weapon, ...BONES.map((b) => s.bones[b]!)]) expect(Number.isFinite(v)).toBe(true);
  });
  it('speedster is 0.8x', () => {
    expect(CLIPS[name](fake(), { archetype: 'speedster' }).duration() * 1000).toBeCloseTo(CLIP_MS[name] * 0.8, 0);
  });
  it('reduced motion keeps duration and lands in finite state', () => {
    const d = fake();
    const tl = CLIPS[name](d, { reduced: true, loop: false });
    expect(tl.duration() * 1000).toBeCloseTo(CLIP_MS[name], 0);
    tl.progress(1);
    expect(Number.isFinite(d.state.x)).toBe(true);
  });
});

describe('attack clips', () => {
  it.each(ATTACK_CLIPS)('%s exposes an impact label and fires onImpact once at it', (name) => {
    const onImpact = vi.fn();
    const tl = CLIPS[name](fake(), { onImpact });
    const at = tl.labels.impact;
    expect(at).toBeGreaterThan(0.1);
    expect(at).toBeLessThan(tl.duration());
    tl.time(at - 0.005);
    expect(onImpact).not.toHaveBeenCalled();
    tl.time(at + 0.005);
    expect(onImpact).toHaveBeenCalledTimes(1);
    tl.progress(1);
    expect(onImpact).toHaveBeenCalledTimes(1);
  });
  it('impact lands after 25% anticipation + 60 ms release', () => {
    expect(CLIPS.slashLight(fake()).labels.impact * 1000).toBeCloseTo(55 + 60, 0);
    expect(CLIPS.slashHeavy(fake()).labels.impact * 1000).toBeCloseTo(85 + 60, 0);
    expect(CLIPS.special(fake()).labels.impact * 1000).toBeCloseTo(130 + 60, 0);
    expect(CLIPS.special(fake()).labels.impact2).toBeGreaterThan(CLIPS.special(fake()).labels.impact!);
  });
  it('tank anticipates longer; whiff has no impact label', () => {
    expect(CLIPS.slashHeavy(fake(), { archetype: 'tank' }).labels.impact).toBeGreaterThan(CLIPS.slashHeavy(fake()).labels.impact!);
    expect(CLIPS.whiff(fake()).labels.impact).toBeUndefined();
  });
  it('facing is applied at t=0', () => {
    const d = fake();
    CLIPS.slashLight(d, { facing: -1 }).progress(0.01);
    expect(d.setFacing).toHaveBeenCalledWith(-1);
  });
  it('knockback distance scales with damage (60..180 px)', () => {
    const run = (damagePct: number) => { const d = fake(); CLIPS.knockback(d, { damagePct }).time(0.3); return -d.state.x; };
    expect(run(0)).toBeCloseTo(60, 0);
    expect(run(200)).toBeCloseTo(180, 0);
    expect(run(50)).toBeCloseTo(120, 0);
  });
});
