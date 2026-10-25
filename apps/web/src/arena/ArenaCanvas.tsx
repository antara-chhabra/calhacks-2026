import { createElement, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Application } from 'pixi.js';
import { HOUSE_ROSTER, type FighterId, type SkinSpec } from '@fc/contracts';
import { useStore } from '@/data/store';
import { VEX_SKIN } from './assets';
import { buildRig, type Rig } from './rig';
import { createPoseDriver } from './clips';
import { CuePlayer, type FighterHandle } from './cues';
import { createVfx, hexToInt, type Vfx } from './vfx';
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
    const vfxRef: { v?: Vfx } = {};   // created below (needs the player's hitStop); hooks resolve it lazily
    const player = new CuePlayer({
      speed: () => useStore.getState().watch.speed || 1,
      playing: () => useStore.getState().watch.playing,
      fighterState: (id) => useStore.getState().watch.state?.fighters[id],
      reduced: () => props.reducedMotion,
      hooks: { onCue: (c) => { vfxRef.v?.hooks.onCue(c); }, onImpact: (c, second) => { vfxRef.v?.hooks.onImpact(c, second); } },
    });
    let baseX = 0, baseY = 0;   // world position without shake
    const vfx = createVfx({
      world, vfx: stage.vfx, reduced: () => props.reducedMotion,
      hitStop: (ms, ids) => { player.hitStop(ms, ids); },
      shake: (dx, dy) => { world.position.set(baseX + dx * world.scale.x, baseY + dy * world.scale.x); },
      fighter: (id) => {
        const r = rigs.get(id)?.rig, h = handles.get(id);
        if (!r || !h) return undefined;
        const sk = skinOf(id);
        return { x: r.root.x, y: r.root.y, facing: h.slot.facing, color: hexToInt(sk.palette.primary), height: sk.build === 'heavy' ? 320 : sk.build === 'lean' ? 285 : 300, root: r.root };
      },
    });
    vfxRef.v = vfx;
    const handles = new Map<string, FighterHandle>();
    const handleFor = (id: string, rig: Rig, i: number): FighterHandle => {
      const old = handles.get(id), sl = SLOTS[i]!;
      if (old && old.driver && (old as FighterHandle & { rig?: Rig }).rig === rig && old.slot.x === sl.x) return old;
      const f = useStore.getState().fighters[id];
      const h: FighterHandle & { rig: Rig } = { id, rig, driver: createPoseDriver(rig), slot: { x: sl.x, y: sl.y, facing: sl.facing },
        archetype: f?.archetype ?? (HOUSE_ROSTER as Record<string, { archetype?: FighterHandle['archetype'] }>)[id]?.archetype,
        place: (x, y) => { rig.root.position.set(x, y); } };
      handles.set(id, h);
      return h;
    };
    let token = 0;

    const fit = (): void => {
      const s = Math.min(app.screen.width / STAGE_W, app.screen.height / STAGE_H);
      world.scale.set(s);
      baseX = (app.screen.width - STAGE_W * s) / 2; baseY = (app.screen.height - STAGE_H * s) / 2;
      world.position.set(baseX, baseY);
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
        if (!b.rig.root.parent) stage.fighters.addChild(b.rig.root);
      });
      for (const id of handles.keys()) if (!rigs.has(id)) handles.delete(id);
      player.setFighters(built.map((b, i) => handleFor(b.id, b.rig, i)));
      if (snap) { player.snap(); vfx.clear(); }   // catch-up rule (PRD §8.7): kill timelines, clear queues, state-derived pose
    };

    const ready = app.init({ resizeTo: el, background: 0x000000, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
      if (disposed) return;
      el.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      app.stage.addChild(world, stage.bars);
      stage.setReducedMotion(props.reducedMotion);
      app.ticker.add((t) => { 
        stage.tick(t.deltaMS); player.tick(t.deltaMS);
        const st = useStore.getState().watch;
        vfx.tick(st.playing ? Math.min(t.deltaMS, 100) * (st.speed || 1) : 0);   // same clock as the cue player: pause/speed apply
      });
      fit();
      app.renderer.on('resize', fit);
      void sync(true);
    });

    const unsubOrder = useStore.subscribe((s, prev) => {
      if (s.watch.state?.order !== prev.watch.state?.order || s.fighters !== prev.fighters) void sync(false);
      if (s.watch.playbackRevision !== prev.watch.playbackRevision) void sync(true);   // snap rule (PRD §8.7)
    });
    let report: ReturnType<typeof setTimeout> | undefined;
    const unsubCues = useStore.getState().cues$((c) => {
      player.handle(c);
      if (import.meta.env.DEV) {   // per-kind cue counts, logged 2 s after the last cue (AC-07.1 evidence)
        (window as unknown as { __arenaCues?: unknown; __arenaPlayer?: unknown }).__arenaCues = player.stats;
        (window as unknown as { __arenaPlayer?: unknown }).__arenaPlayer = player;
        clearTimeout(report);
        report = setTimeout(() => { console.info('[arena] cue counts', player.summary()); }, 2000);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(report); vfx.destroy(); player.setFighters([]);
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
