// koBlast · 700 ms · launched backwards along a 30° arc (default 900 px), spinning into the reference KO pose, ko face.
// Labels: `launch` (0), `edge` (700, where the star-burst and KO text spawn). Does not return to rest.
import { builder, diff } from './dsl';
import type { Clip } from './types';

/** Reduced motion: a KO'd fighter stays at its slot, faded to this alpha. */
export const KO_FADED_ALPHA = 0.3;

export const koBlast: Clip = (d, p = {}) => {
  const b = builder(d, p);
  const dist = p.distance ?? 900, a = (30 * Math.PI) / 180;
  const ko = diff(d.poses.ko, d.base);
  if (b.reduced) {   // FC-F-128: the blast becomes a 120 ms crossfade into the KO pose, left faded at the slot (readable, no travel)
    b.label(0, 'launch').face(0, 'ko');
    b.tl.set(d.state, { weapon: d.base.weapon + ko.w }, 0);
    for (const [n, v] of Object.entries(ko.bones)) b.tl.set(d.state.bones, { [n]: (d.base.bones[n] ?? 0) + v }, 0);
    b.tl.to(d.state, { alpha: KO_FADED_ALPHA, duration: 0.12, ease: 'none' }, 0);
    b.label(120, 'edge');
    return b.done(700);
  }
  b.label(0, 'launch').face(0, 'ko').grounded(0, false);
  b.step(0, 160, { bones: ko.bones, w: ko.w }, 'power2.out');
  b.step(0, 700, { x: d.state.x - dist * Math.cos(a), y: d.state.y - dist * Math.sin(a) }, 'power1.in');
  b.step(0, 700, { rot: b.reduced ? -62 : -62 - 360 }, 'power2.out');
  b.label(700, 'edge');
  return b.done(700);
};
