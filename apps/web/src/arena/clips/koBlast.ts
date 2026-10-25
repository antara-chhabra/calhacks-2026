// koBlast · 700 ms · launched backwards along a 30° arc (default 900 px), spinning into the reference KO pose, ko face.
// Labels: `launch` (0), `edge` (700, where the star-burst and KO text spawn). Does not return to rest.
import { builder, diff } from './dsl';
import type { Clip } from './types';

export const koBlast: Clip = (d, p = {}) => {
  const b = builder(d, p);
  const dist = p.distance ?? 900, a = (30 * Math.PI) / 180;
  const ko = diff(d.poses.ko, d.base);
  b.label(0, 'launch').face(0, 'ko').grounded(0, false);
  b.step(0, 160, { bones: ko.bones, w: ko.w }, 'power2.out');
  b.step(0, 700, { x: d.state.x - dist * Math.cos(a), y: d.state.y - dist * Math.sin(a) }, 'power1.in');
  b.step(0, 700, { rot: b.reduced ? -62 : -62 - 360 }, 'power2.out');
  b.label(700, 'edge');
  return b.done(700);
};
