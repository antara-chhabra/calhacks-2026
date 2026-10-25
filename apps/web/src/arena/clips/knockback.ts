// knockback · 300 ms slide + 400 ms return = 700 ms. Slide 60–180 px scaled by damagePct (60 + 1.2·pct), power3.out; returns to x = 0.
import { builder } from './dsl';
import type { Clip } from './types';

export const knockback: Clip = (d, p = {}) => {
  const b = builder(d, p);
  const dist = Math.min(180, Math.max(60, 60 + 1.2 * (p.damagePct ?? 0)));
  b.face(0, 'hurt');
  b.step(0, 300, { x: d.state.x - dist, bones: { head: -22, torso: -18, upperArmF: 14, upperArmB: -20, thighF: 14, shinF: -8 }, w: -20 }, 'power3.out');
  b.step(0, 150, { y: -14 }, 'power2.out').step(150, 150, { y: 0 }, 'power2.in');
  b.label(300, 'return');
  b.step(300, 400, { x: 0 }, 'power2.inOut');
  b.rest(300, 400);
  return b.done(700);
};
