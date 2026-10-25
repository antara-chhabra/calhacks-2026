// hitReact · 200 ms · head snap back, hurt face.
import { builder } from './dsl';
import type { Clip } from './types';

export const hitReact: Clip = (d, p = {}) => {
  const b = builder(d, p);
  b.face(0, 'hurt');
  b.step(0, 60, { x: d.state.x - 8, w: -30, bones: { head: -26, torso: -14, upperArmF: 10 } }, 'power3.out');
  b.step(60, 140, { x: d.state.x, w: 0, bones: { head: 0, torso: 0, upperArmF: 0 } }, 'power2.inOut');
  return b.face(200, d.base.face).done(200);
};
