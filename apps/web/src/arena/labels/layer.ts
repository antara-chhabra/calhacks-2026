// In-canvas label layer (A-08, FC-F-125). Pixi Text objects are pooled; all logic lives in ./model.
import { Container, Graphics, Text } from 'pixi.js';
import type { ArenaCue, MatchState } from '@fc/engine';
import type { FighterId } from '@fc/contracts';
import { LabelModel, damageColor, damageText } from './model';

export interface LabelLayerOpts {
  parent: Container;
  getAnchor: (id: FighterId) => { x: number; y: number } | null;   // rig head anchor, stage px
  getState: () => MatchState;
  getName: (id: FighterId) => string;
  reducedMotion?: boolean;
  /** Replay speed multiplier (lifetimes scale with it). */
  getSpeed?: () => number;
  /** Per-fighter identity colour for the name tag, 0xRRGGBB. */
  getColor?: (id: FighterId) => number | undefined;
}
export interface LabelLayer { onCue(cue: ArenaCue): void; update(dtMs: number): void; snap(): void; destroy(): void }

const FONT = 'system-ui, sans-serif';
const stroke = { color: 0x14121f, width: 5, join: 'round' as const };

class Pool<T extends Container> {
  private free: T[] = []; private used: T[] = [];
  constructor(private make: () => T, private root: Container) {}
  begin(): void { for (const o of this.used) { o.visible = false; this.free.push(o); } this.used = []; }
  take(): T { const o = this.free.pop() ?? this.root.addChild(this.make()); o.visible = true; this.used.push(o); return o; }
}

export function createLabelLayer(o: LabelLayerOpts): LabelLayer {
  const model = new LabelModel();
  const root = o.parent.addChild(new Container());
  root.label = 'labels';
  const mkText = (size: number, weight: 'bold' | '900', fill = 0xffffff): Text =>
    new Text({ text: '', style: { fontFamily: FONT, fontSize: size, fontWeight: weight, fill, stroke, align: 'center' } });
  const tags = new Pool(() => { const c = new Container(); c.addChild(mkText(30, '900'), mkText(26, '900')); return c; }, root);
  const hits = new Pool(() => mkText(40, '900'), root);
  const bubbles = new Pool(() => {
    const c = new Container(); c.addChild(new Graphics(), mkText(24, 'bold', 0x14121f)); (c.children[1] as Text).style.stroke = { color: 0xffffff, width: 0 }; return c;
  }, root);

  function render(): void {
    const s = o.getState();
    tags.begin(); hits.begin(); bubbles.begin();
    for (const id of s?.order ?? []) {
      const f = s.fighters[id]; const a = o.getAnchor(id);
      if (!f || !a) continue;
      const t = tags.take(); const [name, pct] = t.children as [Text, Text];
      name.text = o.getName(id); name.style.fill = o.getColor?.(id) ?? 0xffffff;
      pct.text = damageText(f.damagePct); pct.style.fill = damageColor(f.damagePct);
      name.anchor.set(0.5, 1); pct.anchor.set(0.5, 1);
      name.y = -32; pct.y = 0; t.position.set(a.x, a.y - 40);
      const b = model.bubbles.get(id);
      if (b) {
        const c = bubbles.take(); const [g, tx] = c.children as [Graphics, Text];
        tx.text = b.lines.join('\n'); tx.anchor.set(0.5, 1); tx.y = -14;
        const w = tx.width + 28, h = tx.height + 24;
        g.clear().roundRect(-w / 2, -h - 2, w, h, 14).fill(0xffffff).stroke({ color: 0x14121f, width: 4 })
          .poly([-10, -3, 10, -3, 0, 14]).fill(0xffffff);
        c.position.set(a.x, a.y - 120);
        c.alpha = Math.min(1, (b.ttlMs - b.ageMs) / 250);
      }
    }
    for (const h of model.hits) {
      const a = o.getAnchor(h.target); if (!a) continue;
      const tx = hits.take(); tx.text = h.text; tx.anchor.set(0.5, 0.5);
      tx.style.fill = h.kind === 'hit' ? 0x2ec4a6 : 0xc9c3dc;
      const k = h.ageMs / h.ttlMs, rise = o.reducedMotion ? 0 : 70 * k;
      const pop = o.reducedMotion || k > 0.12 ? 1 : 0.7 + 2.5 * k;
      tx.scale.set(pop); tx.alpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      tx.position.set(a.x, a.y + 70 - rise);
    }
  }
  return {
    onCue(cue) { model.onCue(cue); render(); },   // label exists synchronously on cue arrival (AC-07.3)
    update(dtMs) { model.update(dtMs, o.getSpeed?.() ?? 1); render(); },
    snap() { model.snap(); render(); },
    destroy() { root.destroy({ children: true }); },
  };
}
