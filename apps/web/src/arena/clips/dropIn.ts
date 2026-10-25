// dropIn · 450 ms · fall from above (300) → squash on landing (80, scaleY 0.85) → stand (70). Label `land` at 300.
import { builder } from './dsl';
import type { Clip } from './types';

export const dropIn: Clip = (d, p = {}) => {
  const b = builder(d, p);
  if (b.reduced) {   // FC-F-128 / bible §6: no fall, no squash: stand in place with a 120 ms fade-in
    b.tl.set(d.state, { alpha: 0, y: 0 }, 0);
    b.tl.call(() => d.flush(), [], 0);
    b.tl.to(d.state, { alpha: 1, duration: 0.12, ease: 'none' }, 0);
    b.label(120, 'land');
    return b.done(450);
  }
  const from = -700;
  b.grounded(0, true);
  b.tl.set(d.state, { y: from, sy: 1.08, sx: 0.96 }, 0);
  b.tl.call(() => d.flush(), [], 0);
  b.step(0, 300, { y: 0 }, 'power2.in');
  b.step(0, 300, { bones: { upperArmF: -40, upperArmB: -60, thighF: -22, thighB: 18, shinF: 24, shinB: 20 } }, 'sine.out');
  b.label(300, 'land');
  b.step(300, 80, { sy: 0.85, sx: 1.1, bones: { thighF: -26, shinF: 40, thighB: 24, shinB: 30, torso: 8 } }, 'power3.out');
  b.rest(380, 70, 'back.out(2)');
  return b.done(450);
};
