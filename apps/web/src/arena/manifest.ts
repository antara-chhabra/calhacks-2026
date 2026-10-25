// Rig manifest types + transform math (PRD §10.7, art-bible §7.1). Pure: shared by the Pixi rig and the SVG portrait.
export type PartDef = { src: string; viewBox: [number, number, number, number]; pivot: [number, number]; anchors?: Record<string, string | number> };
export type NodeDef = { id: string; part?: string; parent: string | null; pos: [number, number]; z?: number; tint?: 'back'; partPattern?: string };
export type PoseDef = {
  root: { x: number; y: number; rot: number }; face: string; grounded: boolean; weaponWorld: number;
  rot: Record<string, number>; vb?: [number, number, number, number];
};
export type Manifest = {
  schema: number; skinKey: string; build: string; stageHeight: number;
  expressions: { names: string[]; parts: string[]; default: string };
  parts: Record<string, PartDef>;
  nodes: NodeDef[];
  slots: Record<'weapon' | 'head' | 'emblem', { node: string; file: string }>;
  poses: Record<'idle' | 'attack' | 'ko', PoseDef>;
};
export type PoseName = 'idle' | 'attack' | 'ko' | 'victory';

/** Poses built on top of the manifest's three references. Victory = idle with the sword thrust overhead, smug. */
export function resolvePose(m: Manifest, name: PoseName): PoseDef {
  if (name !== 'victory') return m.poses[name];
  const idle = m.poses.idle;
  return { ...idle, face: 'smug', weaponWorld: 8, rot: { ...idle.rot, upperArmF: -160, forearmF: -6, upperArmB: 30, forearmB: 6, torso: 0, head: 2 } };
}

/** Part key for a node: slot nodes resolve through the skin's chosen head/weapon/emblem asset. */
export function partKeyFor(node: NodeDef, face: string, slotKeys: { head: string; weapon: string; emblem: string }): string | null {
  if (!node.part) return null;
  if (node.partPattern) return node.partPattern.replace('{expression}', face).replace(/\.svg$/, '');
  if (node.part === 'helm') return slotKeys.head;
  if (node.part === 'weapon') return slotKeys.weapon;
  if (node.part === 'emblem') return slotKeys.emblem;
  return node.part;
}

export type Xf = { x: number; y: number; rot: number };   // world position of the pivot, world rotation (deg, clockwise)
const rad = (d: number) => (d * Math.PI) / 180;

/**
 * World transform of every node. Local transform = translate(pos) then rotate(rot) in the parent's space;
 * the root takes pose.root; grounded poses are then shifted so the lowest sole touches y=0. The weapon's rotation is the wanted *world* angle (pose.weaponWorld), not a local one.
 * Nodes are listed parent-before-child in the manifest, but we do not rely on it.
 */
export function worldTransforms(m: Manifest, pose: PoseDef): Record<string, Xf> {
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const out: Record<string, Xf> = {};
  const solve = (id: string): Xf => {
    const hit = out[id];
    if (hit) return hit;
    const n = byId.get(id)!;
    let xf: Xf;
    if (n.parent === null) xf = { x: pose.root.x + n.pos[0], y: pose.root.y + n.pos[1], rot: pose.root.rot };
    else {
      const p = solve(n.parent);
      const c = Math.cos(rad(p.rot)), s = Math.sin(rad(p.rot));
      const rot = n.part === 'weapon' ? pose.weaponWorld : p.rot + (pose.rot[id] ?? 0);
      xf = { x: p.x + n.pos[0] * c - n.pos[1] * s, y: p.y + n.pos[0] * s + n.pos[1] * c, rot };
    }
    return (out[id] = xf);
  };
  m.nodes.forEach((n) => solve(n.id));
  if (pose.grounded) {
    // Grounding: the lowest sole point (foot local y = anchors.sole, x -24..46) rests on y=0 (matches the A-01 composites).
    const sole = Number(m.parts.foot?.anchors?.sole ?? 22);
    let low = -Infinity;
    for (const n of m.nodes) {
      if (n.part !== 'foot') continue;
      const f = out[n.id]!, c = Math.cos(rad(f.rot)), s = Math.sin(rad(f.rot));
      for (const lx of [-24, 46]) low = Math.max(low, f.y + lx * s + sole * c);
    }
    if (Number.isFinite(low) && low !== 0) for (const k of Object.keys(out)) out[k] = { ...out[k]!, y: out[k]!.y - low };
  }
  return out;
}

/** SVG matrix(a b c d e f) for a world transform (rotation clockwise on screen, y down). Mirror with a parent scale(-1 1). */
export function matrixAttr(xf: Xf): string {
  const c = Math.cos(rad(xf.rot)), s = Math.sin(rad(xf.rot));
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return `matrix(${r(c)} ${r(s)} ${r(-s)} ${r(c)} ${r(xf.x)} ${r(xf.y)})`;
}

/** Sprite anchor in 0..1 so the part's pivot (SVG origin) sits at the node position. */
export function anchorFor(vb: [number, number, number, number]): [number, number] {
  return [-vb[0] / vb[2], -vb[1] / vb[3]];
}

/** Axis-aligned bounds of the posed rig (union of each part's transformed viewBox). */
export function poseBounds(m: Manifest, pose: PoseDef, slotKeys: { head: string; weapon: string; emblem: string }, skip: (id: string) => boolean = () => false): [number, number, number, number] {
  const xfs = worldTransforms(m, pose);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of m.nodes) {
    if (skip(n.id)) continue;
    const key = partKeyFor(n, pose.face, slotKeys);
    const part = key ? m.parts[key] : undefined;
    if (!part) continue;
    const xf = xfs[n.id]!;
    const c = Math.cos(rad(xf.rot)), s = Math.sin(rad(xf.rot));
    const [vx, vy, vw, vh] = part.viewBox;
    for (const [px, py] of [[vx, vy], [vx + vw, vy], [vx, vy + vh], [vx + vw, vy + vh]] as const) {
      const wx = xf.x + px * c - py * s, wy = xf.y + px * s + py * c;
      x0 = Math.min(x0, wx); y0 = Math.min(y0, wy); x1 = Math.max(x1, wx); y1 = Math.max(y1, wy);
    }
  }
  return [x0, y0, x1 - x0, y1 - y0];
}
