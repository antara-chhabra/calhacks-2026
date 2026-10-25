// Pixi v8 skeleton builder: SkinSpec + manifest → flat, z-sorted set of sprite holders driven by worldTransforms().
// Bones are logical (the manifest tree); rendering is flat because the art-bible z-order interleaves branches
// (e.g. the front arm draws over the head), which nested Containers cannot do.
import { Container, ImageSource, Sprite, Texture } from 'pixi.js';
import type { SkinSpec } from '@fc/contracts';
import { loadSkinParts, type SkinParts } from './assets';
import { BACK_TINT, substitutePalette } from './palette';
import { anchorFor, partKeyFor, resolvePose, worldTransforms, type NodeDef, type PoseDef, type PoseName } from './manifest';

export const RASTER_SCALE = 2;   // PRD §10.7: parts are rasterised at 2x

const texCache = new Map<string, Promise<Texture>>();

/** Rasterise SVG text to a Texture at 2x. The texture's logical size equals the part's viewBox size. */
export function rasterize(svgText: string, vb: [number, number, number, number], key: string): Promise<Texture> {
  let p = texCache.get(key);
  if (!p) {
    p = new Promise<Texture>((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vb[2] * RASTER_SCALE); canvas.height = Math.ceil(vb[3] * RASTER_SCALE);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(new Texture({ source: new ImageSource({ resource: canvas, resolution: RASTER_SCALE }) }));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`arena: cannot rasterise ${key}`)); };
      img.width = vb[2] * RASTER_SCALE; img.height = vb[3] * RASTER_SCALE;
      img.src = url;
    });
    p.catch(() => texCache.delete(key));
    texCache.set(key, p);
  }
  return p;
}

type Holder = { def: NodeDef; box: Container; sprite: Sprite | null };

export class Rig {
  /** Add to the stage at the fighter's feet midpoint. Facing left = scale.x -1 (setFacing). */
  readonly root = new Container({ label: 'rig' });
  private readonly holders: Holder[] = [];
  private readonly tex = new Map<string, Texture>();   // partKey|tint → texture
  private pose: PoseDef;
  private face: string;

  constructor(readonly parts: SkinParts, readonly skin: SkinSpec, textures: Map<string, Texture>) {
    this.root.sortableChildren = true;
    this.tex = textures;
    this.pose = resolvePose(parts.manifest, 'idle');
    this.face = this.pose.face;
    for (const def of parts.manifest.nodes) {
      const box = new Container({ label: def.id });
      box.zIndex = def.z ?? 0;
      let sprite: Sprite | null = null;
      if (def.part) { sprite = new Sprite(); box.addChild(sprite); }
      this.root.addChild(box);
      this.holders.push({ def, box, sprite });
    }
    this.apply();
  }

  /** Apply a pose (reference name or an animated PoseDef) and its expression. */
  setPose(pose: PoseName | PoseDef): void {
    this.pose = typeof pose === 'string' ? resolvePose(this.parts.manifest, pose) : pose;
    this.face = this.pose.face;
    this.apply();
  }
  setExpression(name: string): void { this.face = name; this.apply(); }
  setFacing(dir: 1 | -1): void { this.root.scale.x = dir; }

  private apply(): void {
    const m = this.parts.manifest;
    const xfs = worldTransforms(m, this.pose);
    for (const h of this.holders) {
      const xf = xfs[h.def.id]!;
      h.box.position.set(xf.x, xf.y);
      h.box.rotation = (xf.rot * Math.PI) / 180;
      if (!h.sprite) continue;
      const key = partKeyFor(h.def, this.face, this.parts.slotKeys)!;
      const t = this.tex.get(`${key}|${h.def.tint ?? ''}`);
      if (t && h.sprite.texture !== t) {
        h.sprite.texture = t;
        const [ax, ay] = anchorFor(m.parts[key]!.viewBox);
        h.sprite.anchor.set(ax, ay);
      }
    }
  }

  destroy(): void { this.root.destroy({ children: true }); }   // textures are shared via texCache, not destroyed
}

/** Build a rig for a skin: load SVG text, substitute the palette, rasterise at 2x, assemble the tree. */
export async function buildRig(skin: SkinSpec): Promise<Rig> {
  const parts = await loadSkinParts(skin);
  const m = parts.manifest;
  const palKey = JSON.stringify(skin.palette);
  const textures = new Map<string, Texture>();
  const jobs: Promise<void>[] = [];
  for (const def of m.nodes) {
    if (!def.part) continue;
    const faces = def.partPattern ? m.expressions.names : [m.expressions.default];
    for (const face of faces) {
      const key = partKeyFor(def, face, parts.slotKeys)!;
      const slot = `${key}|${def.tint ?? ''}`;
      if (textures.has(slot) || jobs.length > 1000) continue;
      textures.set(slot, null as unknown as Texture);   // reserve so duplicates are skipped
      jobs.push(rasterize(substitutePalette(parts.svg[key]!, skin.palette, def.tint === 'back' ? BACK_TINT : 1), m.parts[key]!.viewBox, `${parts.skinKey}|${key}|${def.tint ?? ''}|${palKey}`)
        .then((t) => { textures.set(slot, t); }));
    }
  }
  await Promise.all(jobs);
  return new Rig(parts, skin, textures);
}
