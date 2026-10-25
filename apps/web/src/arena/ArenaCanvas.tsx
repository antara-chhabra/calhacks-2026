import { createElement, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Application } from 'pixi.js';
import { HOUSE_ROSTER, type FighterId, type SkinSpec } from '@fc/contracts';
import { useStore } from '@/data/store';
import { VEX_SKIN } from './assets';
import { buildRig, type Rig } from './rig';
import { createStage, SLOTS, STAGE_H as SH, STAGE_W as SW } from './stage';

/** Logical stage (PRD §10.6). A-04 owns the real backdrop; A-02 only places rigs in the four slots. */
export const STAGE_W = SW, STAGE_H = SH;
export { SLOTS };

const skinOf = (id: FighterId): SkinSpec => useStore.getState().fighters[id]?.skin ?? (HOUSE_ROSTER as Record<string, { skin: SkinSpec }>)[id]?.skin ?? VEX_SKIN;

export function ArenaCanvas(props: { reducedMotion: boolean }): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    const app = new Application();
    const stage = createStage();
    const world = stage.world;
    const rigs = new Map<string, { sig: string; rig: Rig }>();   // by fighter id
    let token = 0;

    const fit = (): void => {
      const s = Math.min(app.screen.width / STAGE_W, app.screen.height / STAGE_H);
      world.scale.set(s);
      world.position.set((app.screen.width - STAGE_W * s) / 2, (app.screen.height - STAGE_H * s) / 2);
      stage.layoutBars(app.screen.width, app.screen.height);
    };

    const sync = async (snap: boolean): Promise<void> => {
      const mine = ++token;
      const order = useStore.getState().watch.state?.order ?? [];
      const slots = order.slice(0, 4);
      const built = await Promise.all(slots.map(async (id) => {
        const skin = skinOf(id);
        const sig = JSON.stringify(skin);
        const have = rigs.get(id);
        if (have && have.sig === sig) return { id, ...have };
        return { id, sig, rig: await buildRig(skin) };
      }));
      if (disposed || mine !== token) { built.forEach((b) => { if (rigs.get(b.id)?.rig !== b.rig) b.rig.destroy(); }); return; }
      for (const [id, r] of rigs) if (!built.some((b) => b.id === id && b.rig === r.rig)) { r.rig.destroy(); rigs.delete(id); }
      built.forEach((b, i) => {
        rigs.set(b.id, { sig: b.sig, rig: b.rig });
        const sl = SLOTS[i]!;
        b.rig.root.position.set(sl.x, sl.y);
        b.rig.setFacing(sl.facing);
        if (snap || !b.rig.root.parent) b.rig.setPose('idle');
        if (!b.rig.root.parent) stage.fighters.addChild(b.rig.root);
      });
    };

    const ready = app.init({ resizeTo: el, background: 0x000000, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
      if (disposed) return;
      el.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      app.stage.addChild(world, stage.bars);
      stage.setReducedMotion(props.reducedMotion);
      app.ticker.add((t) => { stage.tick(t.deltaMS); });
      fit();
      app.renderer.on('resize', fit);
      void sync(true);
    });

    const unsubOrder = useStore.subscribe((s, prev) => {
      if (s.watch.state?.order !== prev.watch.state?.order || s.fighters !== prev.fighters) void sync(false);
      if (s.watch.playbackRevision !== prev.watch.playbackRevision) void sync(true);   // snap rule (PRD §8.7)
    });
    const unsubCues = useStore.getState().cues$((c) => { console.debug('[arena] cue', c); });   // clips arrive in A-03+

    return () => {
      disposed = true;
      stage.destroy();
      unsubOrder(); unsubCues();
      void ready.then(() => { app.destroy(true, { children: true }); }).catch(() => undefined);
    };
  }, []);
  return createElement('div', {
    ref: host, 'data-arena': '', 'data-reduced-motion': props.reducedMotion ? '1' : '0',
    style: { width: '100%', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' },
  });
}
