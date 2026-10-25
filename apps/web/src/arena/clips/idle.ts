// idle · 1.2 s loop · breathe (body scaleY 1.00↔1.02), head bob, weapon sway ±2° (PRD §10.5). No per-node offsets exist in the rig, so
// the 2 px head bob is a ±1.5° head nod.
import { builder } from './dsl';
import type { Clip } from './types';

export const idle: Clip = (d, p = {}) => {
  const b = builder(d, p, { loop: true });
  b.step(0, 600, { sy: 1.02, w: 2, bones: { head: 1.5, torso: 0.8 } }, 'sine.inOut');
  b.step(600, 600, { sy: 1, w: -2, bones: { head: 0, torso: 0 } }, 'sine.inOut');
  return b.done(1200);
};
