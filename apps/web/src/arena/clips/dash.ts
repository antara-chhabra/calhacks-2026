// dash · 260 ms · crouch (80) → leap arc (160) → land squash (20). Moves `distance` rig px FORWARD from the current x (default 200;
// A-06 passes target-gap − 140). Pass a negative distance to retreat. Stays displaced; the next clip or the cue player resets x.
import { builder } from './dsl';
import type { Clip } from './types';

export const dash: Clip = (d, p = {}) => {
  const b = builder(d, p);
  const dist = p.distance ?? 200;
  const x0 = d.state.x;
  b.step(0, 80, { sy: 0.92, sx: 1.05, bones: { torso: 14, thighF: -26, shinF: 40, thighB: 20, shinB: 30 }, w: 40 }, 'power2.in');
  b.step(80, 160, { x: x0 + dist, sy: 1.06, sx: 0.96, bones: { torso: 18, thighF: -34, shinF: 46, thighB: 30, shinB: 8, upperArmF: -50 }, w: 60 }, 'power2.out');
  b.step(80, 80, { y: -50 }, 'power2.out').step(160, 80, { y: 0 }, 'power2.in');
  b.step(240, 20, { sy: 0.9, sx: 1.08 }, 'power1.out');
  return b.done(260);
};
