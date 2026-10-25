// cardReact · 600 ms · yellow card = shrug, red card = slump (hurt face).
import { builder } from './dsl';
import type { Clip } from './types';

export const cardReact: Clip = (d, p = {}) => {
  const b = builder(d, p);
  if ((p.color ?? 'yellow') === 'yellow') {
    b.step(0, 150, { sy: 0.98, bones: { head: -6, upperArmF: -38, forearmF: 30, upperArmB: -28, forearmB: -30 }, w: -10 }, 'back.out(2)');
    b.step(150, 250, { bones: { head: -4 } }, 'sine.inOut');
    b.rest(400, 200);
  } else {
    b.face(0, 'hurt');
    b.step(0, 260, { sy: 0.96, bones: { torso: 22, head: 24, upperArmF: 70, forearmF: 40, upperArmB: -4, thighF: 4 }, w: 50 }, 'power2.out');
    b.rest(420, 180);
  }
  return b.done(600);
};
