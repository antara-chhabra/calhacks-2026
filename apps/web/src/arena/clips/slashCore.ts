// Shared body of slashLight / slashHeavy / special (PRD §10.5, §10.8). Anticipation = 25% of duration (tank ×1.35, taken from the
// follow-through so the total stays fixed), release 60 ms, then follow-through with 10° overshoot, settle, return to idle.
// The contact frame is label `impact` at anticipation + release; `special` adds a spin and a second arc (`impact2`).
// brawler = wider wind-up (×1.25), scholar = precise thrust (small wind-up, long lunge), trickster = extra hop, tank = slower + bigger.
import { builder, diff } from './dsl';
import type { Clip, ClipPower } from './types';

export const SLASH_MS: Record<ClipPower, number> = { light: 220, heavy: 340, special: 520 };
const WIND_W: Record<ClipPower, number> = { light: -40, heavy: -70, special: -110 };
const WIND_ARM: Record<ClipPower, number> = { light: -125, heavy: -150, special: -170 };
const LUNGE: Record<ClipPower, number> = { light: 14, heavy: 24, special: 40 };
const RELEASE = 60;

export const slashClip = (power: ClipPower): Clip => (d, p = {}) => {
  const b = builder(d, p);
  const D = SLASH_MS[power];
  const ant = Math.round(D * 0.25 * (p.archetype === 'tank' ? 1.35 : 1));
  const hit = ant + RELEASE;
  const thrust = p.archetype === 'scholar';
  const wide = p.archetype === 'brawler' ? 1.25 : thrust ? 0.4 : 1;
  const reach = LUNGE[power] * (p.archetype === 'tank' ? 1.3 : thrust ? 1.8 : 1);
  const strike = diff(d.poses.attack, d.base);
  const armAbs = WIND_ARM[power], armDelta = armAbs - d.base.bones.upperArmF!;
  const x0 = d.state.x;

  b.face(0, 'focus');
  b.step(0, ant, { x: x0 - 6, w: WIND_W[power] * wide, bones: { torso: -10 * wide, head: -3, upperArmF: thrust ? armDelta * 0.4 : armDelta, forearmF: -10, thighF: 4, thighB: -4 } }, 'power2.out');
  if (p.archetype === 'trickster') { b.step(0, ant, { y: -18 }, 'power2.out'); b.step(ant, RELEASE, { y: 0 }, 'power2.in'); }
  b.step(ant, RELEASE, { x: x0 + reach, w: strike.w - (thrust ? 12 : 0), bones: { ...strike.bones, forearmF: thrust ? 30 : strike.bones.forearmF! } }, 'power3.in');
  b.impact(hit);

  if (power !== 'special') {
    const rest = D - hit, over = Math.round(rest * 0.4);
    b.step(hit, over, { w: strike.w + 10, bones: { torso: strike.bones.torso! + 4 } }, 'power2.out');
    b.step(hit + over, rest - over, { x: x0 }, 'power2.inOut');
    b.rest(hit + over, rest - over);
    return b.done(D);
  }
  // special: overshoot, spin through the air, reverse second arc, land.
  b.step(hit, 40, { w: strike.w + 10 }, 'power2.out');
  b.grounded(hit + 10, false);
  b.step(hit + 10, 110, { y: -44 }, 'power2.out').step(hit + 120, 110, { y: 0 }, 'power2.in');
  b.step(hit + 10, 220, { rot: 360 }, 'power1.inOut', true);
  b.tl.set(d.state, { rot: 0, grounded: true }, b.s(hit + 230));
  b.step(hit + 40, 100, { w: WIND_W.special * 0.5, bones: { upperArmF: armDelta * 0.8 } }, 'power2.inOut');
  const hit2 = hit + 230;
  b.step(hit + 140, 90, { w: strike.w, x: x0 + reach + 20, bones: { upperArmF: strike.bones.upperArmF! } }, 'power3.in');
  b.impact(hit2, 'impact2');
  b.step(hit2, D - hit2, { x: x0 }, 'power2.inOut');
  b.rest(hit2, D - hit2);
  return b.done(D);
};
