// counter · 160 ms · parry: blade snaps up (label `parry` at 50 ms = flash frame), hold, recover.
import { builder } from './dsl';
import type { Clip } from './types';

export const counter: Clip = (d, p = {}) => {
  const b = builder(d, p);
  b.face(0, 'focus');
  b.step(0, 50, { w: -55, x: d.state.x + 6, bones: { upperArmF: -85, forearmF: -20, torso: -6 } }, 'power3.out');
  b.label(50, 'parry');
  b.rest(110, 50);
  return b.done(160);
};
