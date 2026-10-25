// victory · 2.4 s loop · hop (squash on landing), sword raised overhead, smug face, pumping sword. Confetti = VFX.
import { builder, diff } from './dsl';
import type { Clip } from './types';

export const victory: Clip = (d, p = {}) => {
  const b = builder(d, p, { loop: true });
  const v = diff(d.poses.victory, d.base);
  b.face(0, 'smug');
  b.step(0, 160, { sy: 0.9, sx: 1.05, bones: { torso: 6 } }, 'power2.in');
  b.step(160, 240, { sy: 1.04, sx: 0.98, bones: { ...v.bones }, w: v.w }, 'power2.out');
  b.step(160, 120, { y: -46 }, 'power2.out').step(280, 120, { y: 0 }, 'power2.in');
  b.step(400, 80, { sy: 0.93, sx: 1.04 }, 'power1.out').step(480, 120, { sy: 1, sx: 1 }, 'power2.out');
  for (let i = 0; i < 3; i++) {
    const t = 600 + i * 600;
    b.step(t, 300, { w: v.w + 8, y: -6, bones: { ...v.bones, upperArmF: v.bones.upperArmF! - 6 } }, 'sine.inOut');
    b.step(t + 300, 300, { w: v.w - 6, y: 0, bones: { ...v.bones } }, 'sine.inOut');
  }
  b.step(2400 - 1, 1, { w: v.w });
  return b.done(2400);
};
