// stagger · 500 ms · dazed wobble (stars = VFX, label `stars`). Wobble is dropped under reduced motion (held lean instead).
import { builder } from './dsl';
import type { Clip } from './types';

export const stagger: Clip = (d, p = {}) => {
  const b = builder(d, p);
  b.face(0, 'hurt').label(60, 'stars');
  b.step(0, 80, { bones: { head: 10, torso: 8, upperArmF: 12, upperArmB: -14 } }, 'power2.out');
  [-5, 5, -4, 3].forEach((r, i) => b.step(80 + i * 85, 85, { rot: r, bones: { head: r * 2 } }, 'sine.inOut', true));
  b.rest(420, 80);
  return b.done(500);
};
