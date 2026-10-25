// taunt · 900 ms · archetype-specific gesture, smug face. brawler (default) = chest beat, scholar = adjust-spectacles tap to the head,
// trickster = wiggle + spin-hop, tank = stomp + flex, speedster = beckon (durations ×0.8).
import { builder } from './dsl';
import type { Clip } from './types';

export const taunt: Clip = (d, p = {}) => {
  const b = builder(d, p);
  b.face(0, 'smug');
  switch (p.archetype) {
    case 'scholar':
      b.step(0, 200, { bones: { head: 4, upperArmF: -100, forearmF: -130 }, w: -30 }, 'power2.out');
      b.step(200, 500, { bones: { head: 6 } }, 'sine.inOut').rest(700, 200);
      break;
    case 'trickster':
      b.step(0, 150, { sy: 0.92, sx: 1.05 }, 'power2.in');
      b.step(150, 350, { y: -40, rot: 0 }, 'power2.out').step(500, 250, { y: 0 }, 'power2.in');
      b.step(150, 600, { rot: 360 }, 'power1.inOut', true);
      b.tl.set(d.state, { rot: 0 }, b.s(750));
      b.rest(750, 150);
      break;
    case 'tank':
      b.step(0, 250, { y: -14, bones: { upperArmF: -70, forearmF: -90, upperArmB: -70, forearmB: -90 } }, 'power2.out');
      b.step(250, 120, { y: 0, sy: 0.96 }, 'power3.in', true);
      b.label(370, 'stomp');
      b.rest(370, 530, 'sine.out');
      break;
    case 'speedster':
      b.step(0, 150, { bones: { upperArmB: -80, forearmB: -50 }, rot: -2 }, 'power2.out');
      [0, 1, 2].forEach((i) => b.step(150 + i * 200, 100, { bones: { forearmB: -80 } }, 'sine.inOut', true).step(250 + i * 200, 100, { bones: { forearmB: -30 } }, 'sine.inOut', true));
      b.rest(750, 150);
      break;
    default:
      b.step(0, 200, { sy: 0.98, bones: { torso: -8, upperArmB: -70, forearmB: -110, head: -4 } }, 'power2.out');
      [0, 1].forEach((i) => b.step(200 + i * 220, 110, { sy: 1.03, bones: { torso: -12 } }, 'power2.out', true).step(310 + i * 220, 110, { sy: 1, bones: { torso: -6 } }, 'power2.in', true));
      b.rest(640, 260);
  }
  return b.done(900);
};
