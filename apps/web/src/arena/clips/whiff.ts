// whiff · 420 ms · swing through air (label `swing` at 150 ms, NO impact label) → over-rotate → stumble → head shake.
import { builder, diff } from './dsl';
import type { Clip } from './types';

export const whiff: Clip = (d, p = {}) => {
  const b = builder(d, p);
  const strike = diff(d.poses.attack, d.base);
  const x0 = d.state.x;
  b.face(0, 'focus');
  b.step(0, 90, { x: x0 - 6, w: -40, bones: { torso: -10, upperArmF: -95, forearmF: -10 } }, 'power2.out');
  b.step(90, 60, { x: x0 + 14, w: strike.w, bones: strike.bones }, 'power3.in');
  b.label(150, 'swing');
  b.step(150, 100, { x: x0 + 28, rot: 7, w: strike.w + 40, bones: { torso: strike.bones.torso! + 16, head: 6, thighF: -20 } }, 'power2.out');
  [-12, 12, -9].forEach((r, i) => b.step(250 + i * 45, 45, { bones: { head: r } }, 'sine.inOut', true));
  b.face(250, 'hurt');
  b.step(250, 170, { x: x0 + 20 }, 'power2.out');
  b.rest(340, 80);
  return b.done(420);
};
