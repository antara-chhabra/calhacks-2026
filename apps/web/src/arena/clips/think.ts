// think · 1.6 s loop · head tilt 6°, hand to chin. The "…" bubble is VFX (A-07).
import { builder } from './dsl';
import type { Clip } from './types';

export const think: Clip = (d, p = {}) => {
  const b = builder(d, p, { loop: true });
  b.face(0, 'focus');
  b.step(0, 300, { w: -34, bones: { head: 6, torso: 3, upperArmF: -75, forearmF: -75 } }, 'power2.out');
  b.step(300, 500, { sy: 1.01, bones: { head: 4 } }, 'sine.inOut');
  b.step(800, 500, { sy: 1, bones: { head: 7 } }, 'sine.inOut');
  b.rest(1300, 300);
  return b.done(1600);
};
