import { createElement, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { HOUSE_ROSTER, type FighterId, type SkinSpec } from '@fc/contracts';
import { useStore } from '@/data/store';
import { VEX_SKIN } from './assets';
import { buildRig, type Rig } from './rig';

/** Logical stage (PRD §10.6). A-04 owns the real backdrop; A-02 only places rigs in the four slots. */
export const STAGE_W = 1920, STAGE_H = 1080;
export const SLOT_X = [330, 770, 1150, 1590] as const;   // 0 left float · 1 main-left · 2 main-right · 3 right float
export const GROUND_Y = 880;

const skinOf = (id: FighterId): SkinSpec => useStore.getState().fighters[id]?.skin ?? (HOUSE_ROSTER as Record<string, { skin: SkinSpec }>)[id]?.skin ?? VEX_SKIN;

export function ArenaCanvas(props: { reducedMotion: boolean }): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    const app = new Application();
    const world = new Container({ label: 'world' });
    const rigs = new Map<string, { sig: string; rig: Rig }>();   // by fighter id
    let token = 0;

    const fit = (): void => {
      const s = Math.min(app.screen.width / STAGE_W, app.screen.height / STAGE_H);
      world.scale.set(s);
      world.position.set((app.screen.width - STAGE_W * s) / 2, (app.screen.height - STAGE_H * s) / 2);
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
        b.rig.root.position.set(SLOT_X[i]!, GROUND_Y);
        b.rig.setFacing(i < 2 ? 1 : -1);
        if (snap || !b.rig.root.parent) b.rig.setPose('idle');
        if (!b.rig.root.parent) world.addChild(b.rig.root);
      });
    };

    const ready = app.init({ resizeTo: el, background: 0x000000, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
      if (disposed) return;
      el.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      const plates = new Graphics();
      SLOT_X.forEach((x) => plates.roundRect(x - 150, GROUND_Y, 300, 28, 8).fill(0x1a1a22));
      world.addChild(plates);
      app.stage.addChild(world);
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
      unsubOrder(); unsubCues();
      void ready.then(() => { app.destroy(true, { children: true }); }).catch(() => undefined);
    };
  }, []);
  return createElement('div', {
    ref: host, 'data-arena': '', 'data-reduced-motion': props.reducedMotion ? '1' : '0',
    style: { width: '100%', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' },
  });
}
