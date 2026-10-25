// toolUse · 450 ms · glance up while the icon pops (icon = VFX). `tool` varies the body: read = tilt down to the page, write = quill
// flick, run = small hop.
import { builder } from './dsl';
import type { Clip, ClipParams } from './types';

export const toolUse: Clip = (d, p: ClipParams = {}) => {
  const b = builder(d, p);
  const tool = p.tool ?? 'read';
  b.label(0, 'iconPop');
  b.step(0, 150, { w: -6, bones: { head: tool === 'read' ? 8 : -9, torso: -4, upperArmF: tool === 'write' ? -20 : 0 }, y: tool === 'run' ? -8 : 0 }, 'back.out(2)');
  if (tool === 'write') b.step(150, 80, { bones: { forearmF: -14 } }, 'sine.inOut', true).step(230, 70, { bones: { forearmF: 0 } }, 'sine.inOut', true);
  b.rest(300, 150);
  return b.done(450);
};
