// Static SVG composition of a posed rig (used by FighterPortrait; no Pixi, no DOM).
import type { SkinSpec } from '@fc/contracts';
import { BACK_TINT, substitutePalette, suffixIds, svgInner } from './palette';
import { matrixAttr, partKeyFor, poseBounds, resolvePose, worldTransforms, type Manifest, type PoseName } from './manifest';
import type { SlotKeys } from './assets';

export type PortraitPose = 'hero' | 'victory' | 'ko' | 'idle';
const HERO_NODES = new Set(['torso', 'head', 'helm', 'eyes', 'mouth', 'brows', 'upperArmF', 'upperArmB', 'emblem']);

export function composePortrait(opts: {
  manifest: Manifest; svg: Record<string, string>; slotKeys: SlotKeys; skin: SkinSpec; pose: PortraitPose; idPrefix: string; flip?: boolean;
}): { viewBox: string; inner: string } {
  const { manifest: m, svg, slotKeys, skin, pose: name, idPrefix } = opts;
  const poseName: PoseName = name === 'hero' ? 'idle' : name;
  const pose = { ...resolvePose(m, poseName) };
  if (name === 'hero') pose.face = 'focus';
  const xfs = worldTransforms(m, pose);
  const skip = name === 'hero' ? (id: string) => !HERO_NODES.has(id) : () => false;
  const [bx, by, bw, bh] = poseBounds(m, pose, slotKeys, skip);
  const side = Math.max(bw, bh) * 1.06;
  const vb = [bx + bw / 2 - side / 2, by + bh / 2 - side / 2, side, side].map((v) => Math.round(v * 10) / 10);
  const out: string[] = [];
  for (const n of [...m.nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
    if (skip(n.id)) continue;
    const key = partKeyFor(n, pose.face, slotKeys);
    const raw = key ? svg[key] : undefined;
    if (!raw) continue;
    const body = suffixIds(substitutePalette(raw, skin.palette, n.tint === 'back' ? BACK_TINT : 1), `${idPrefix}-${n.id}`);
    out.push(`<g transform="${matrixAttr(xfs[n.id]!)}">${svgInner(body)}</g>`);
  }
  if (opts.flip) return { viewBox: [-(vb[0]! + side), vb[1], side, side].join(' '), inner: `<g transform="scale(-1 1)">${out.join('')}</g>` };
  return { viewBox: vb.join(' '), inner: out.join('') };
}
