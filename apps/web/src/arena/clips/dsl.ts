// Tiny keyframe DSL shared by all clips. Times are PRD milliseconds; the builder converts to seconds and applies archetype speed.
import gsap from 'gsap';
import { IMPACT, type ClipParams, type ClipTimeline, type PoseDriver, type PoseRef, type PoseState } from './types';

/** A target pose. Bone and weapon values are DELTAS from the idle reference; the rest are absolute offsets. */
export interface Key {
  x?: number; y?: number; rot?: number; sx?: number; sy?: number; alpha?: number;
  w?: number; bones?: Record<string, number>;
}

export const diff = (a: PoseRef, base: PoseRef): { w: number; bones: Record<string, number> } => ({
  w: a.weapon - base.weapon,
  bones: Object.fromEntries(Object.keys(base.bones).map((k) => [k, (a.bones[k] ?? base.bones[k]!) - base.bones[k]!])),
});

export const speedOf = (p: ClipParams): number => (p.archetype === 'speedster' ? 0.8 : 1);

export function builder(d: PoseDriver, p: ClipParams, o: { loop?: boolean } = {}) {
  const k = speedOf(p), reduced = !!p.reduced;
  const loop = !!o.loop && p.loop !== false;
  const tl: ClipTimeline = gsap.timeline({ paused: true, repeat: loop ? -1 : 0 });
  const st: PoseState = d.state;
  const s = (ms: number) => (ms * k) / 1000;
  if (p.facing) tl.call(() => d.setFacing(p.facing!), [], 0);

  const put = (target: object, vars: Record<string, number>, at: number, dur: number, ease: string) => {
    if (Object.keys(vars).length === 0) return;
    if (reduced) tl.set(target, vars, s(at + dur));
    else tl.to(target, { ...vars, duration: s(dur), ease }, s(at));
  };
  const api = {
    tl, s, reduced,
    /** Tween toward `key` over [at, at+dur] ms. `fx` steps (shake, wobble, spin) are dropped under reduced motion. */
    step(at: number, dur: number, key: Key, ease = 'power2.out', fx = false) {
      if (reduced && fx) return api;
      const top: Record<string, number> = {};
      for (const n of ['x', 'y', 'rot', 'sx', 'sy', 'alpha'] as const) if (key[n] !== undefined) top[n] = key[n]!;
      put(st, top, at, dur, ease);
      if (key.w !== undefined) put(st, { weapon: d.base.weapon + key.w }, at, dur, ease);
      for (const [b, v] of Object.entries(key.bones ?? {})) put(st.bones, { [b]: (d.base.bones[b] ?? 0) + v }, at, dur, ease);
      return api;
    },
    /** Return every channel to the idle pose. */
    rest(at: number, dur: number, ease = 'power2.inOut') {
      api.step(at, dur, { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, w: 0, bones: Object.fromEntries(Object.keys(d.base.bones).map((b) => [b, 0])) }, ease);
      return api.face(at + dur, d.base.face);
    },
    face(at: number, name: string) { tl.set(st, { face: name }, s(at)); return api; },
    grounded(at: number, v: boolean) { tl.set(st, { grounded: v }, s(at)); return api; },
    label(at: number, name: string) { tl.addLabel(name, s(at)); return api; },
    /** Contact frame: label + optional callback. */
    impact(at: number, name = IMPACT, cb: (() => void) | undefined = name === IMPACT ? p.onImpact : p.onImpact2) {
      tl.addLabel(name, s(at));
      if (cb) tl.call(cb, [], s(at));
      return api;
    },
    /** Fix the timeline length to `ms` and wire the renderer flush. */
    done(ms: number): ClipTimeline {
      tl.set({}, {}, s(ms));
      tl.eventCallback('onUpdate', () => d.flush());
      tl.eventCallback('onComplete', () => d.flush());
      return tl;
    },
  };
  return api;
}
