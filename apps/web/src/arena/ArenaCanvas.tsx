import { createElement, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import type { ArenaCue } from '@fc/engine';
import { Application, Container, Matrix, RenderTexture, Sprite } from 'pixi.js';
import { HOUSE_ROSTER, type FighterId, type SkinSpec } from '@fc/contracts';
import { useStore } from '@/data/store';
import { VEX_SKIN } from './assets';
import { buildRig, type Rig } from './rig';
import { createPoseDriver } from './clips';
import { CuePlayer, type FighterHandle } from './cues';
import { createVfx, hexToInt, type Vfx } from './vfx';
import { createLabelLayer } from './labels';
import { createSequenceLayer, SequenceDirector } from './sequences';
import { createStage, SLOTS, STAGE_H as SH, STAGE_W as SW } from './stage';

/** Logical stage (PRD §10.6). A-04 owns the real backdrop; A-02 only places rigs in the four slots. */
export const STAGE_W = SW, STAGE_H = SH;
export { SLOTS };

const skinOf = (id: FighterId): SkinSpec => useStore.getState().fighters[id]?.skin ?? (HOUSE_ROSTER as Record<string, { skin: SkinSpec }>)[id]?.skin ?? VEX_SKIN;

/** Stage px per art pixel: the fighters render at 1/4 resolution and upscale with nearest sampling, so every limb,
 *  rotated or not, lands on one shared pixel grid (matches the 4-unit pixel-art parts). */
const ART_PIXEL = 4;

/** FC-F-128: the prop or the OS setting. */
const prefersReduced = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function ArenaCanvas(props: { reducedMotion: boolean }): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = (): boolean => props.reducedMotion || prefersReduced();
    let disposed = false;
    const app = new Application();
    const stage = createStage();
    const world = stage.world;
    const rigs = new Map<string, { sig: string; rig: Rig }>();   // by fighter id
    // Rigs live in an off-stage container that is drawn into a low-res texture each frame; stage.fighters shows it.
    const pixelSrc = new Container({ label: 'fighters-pixel-src' });
    const pixelRT = RenderTexture.create({ width: STAGE_W / ART_PIXEL, height: STAGE_H / ART_PIXEL, resolution: 1, scaleMode: 'nearest', antialias: false });
    const pixelView = new Sprite(pixelRT);
    pixelView.label = 'fighters-pixel'; pixelView.scale.set(ART_PIXEL);
    stage.fighters.addChild(pixelView);
    const pixelXf = new Matrix().scale(1 / ART_PIXEL, 1 / ART_PIXEL);
    const vfxRef: { v?: Vfx } = {};   // created below (needs the player's hitStop); hooks resolve it lazily
    const player = new CuePlayer({
      speed: () => useStore.getState().watch.speed || 1,
      playing: () => useStore.getState().watch.playing,
      fighterState: (id) => useStore.getState().watch.state?.fighters[id],
      reduced,
      hooks: { onCue: (c) => { vfxRef.v?.hooks.onCue(c); labels.onCue(c); }, onImpact: (c, second) => { vfxRef.v?.hooks.onImpact(c, second); } },
    });
    let baseX = 0, baseY = 0;   // world position without shake
    const vfx = createVfx({
      world, vfx: stage.vfx, reduced,
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
    const headHeight = (id: string): number => { const b = skinOf(id).build; return b === 'heavy' ? 320 : b === 'lean' ? 285 : 300; };
    const labels = createLabelLayer({   // A-08: above the VFX, anchored over each rig's head
      parent: stage.vfx, reducedMotion: reduced(),
      getAnchor: (id) => { const r = director.isHidden(id) ? undefined : rigs.get(id)?.rig; return r ? { x: r.root.x, y: r.root.y - headHeight(id) - 24 } : null; },
      getState: () => useStore.getState().watch.state,
      getName: (id) => useStore.getState().fighters[id]?.name ?? id.toUpperCase(),
      getSpeed: () => useStore.getState().watch.speed || 1,
      getColor: (id) => hexToInt(skinOf(id).palette.primary),
    });
    // A-09 intro/outro: the director re-times intro/outro cues before they reach the player; the layer draws spotlight/banners/confetti.
    const seqLayer = createSequenceLayer({
      world, fighters: stage.fighters, front: stage.vfx, reduced,
      getAnchor: (id) => { const r = rigs.get(id)?.rig; return r ? { x: r.root.x, y: r.root.y, height: headHeight(id) } : null; },
      getName: (id) => useStore.getState().fighters[id]?.name ?? id.toUpperCase(),
      getColor: (id) => hexToInt(skinOf(id).palette.primary),
    });
    const devSeq = (what: string, kind: string): void => {   // dev evidence: window.__arenaSeqLog = [[ms since mount, 'emit|beat', kind], ...]
      if (!import.meta.env.DEV) return;
      const w = window as unknown as { __arenaSeqLog?: [number, string, string][] };
      (w.__arenaSeqLog ??= []).push([Math.round(performance.now() - t0), what, kind]);
    };
    const t0 = performance.now();
    const director = new SequenceDirector({
      reduced, emit: (c) => { devSeq('emit', c.kind); player.handle(c); }, onBeat: (b) => { devSeq('beat', b.kind); seqLayer.beat(b); },
      matchId: () => useStore.getState().watch.matchId,
    });
    const snapSequences = (): void => {   // catch-up: no intro replay; jump to the end state implied by the match state
      const w = useStore.getState().watch;
      const winner = w.state ? Object.values(w.state.fighters).find((f) => f.status === 'winner')?.id ?? null : null;
      director.snap({ winner, matchId: w.matchId });
    };
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
    let preRigs: ArenaCue[] | null = [];   // cues received before the first rig build finished

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
        if (!b.rig.root.parent) pixelSrc.addChild(b.rig.root);
      });
      for (const id of handles.keys()) if (!rigs.has(id)) handles.delete(id);
      player.setFighters(built.map((b, i) => handleFor(b.id, b.rig, i)));
      if (snap) { player.snap(); vfx.clear(); labels.snap(); snapSequences(); }   // catch-up rule (PRD §8.7): kill timelines, clear queues, state-derived pose
    };

    const ready = app.init({ resizeTo: el, background: 0x000000, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
      if (disposed) return;
      el.appendChild(app.canvas);
      app.canvas.style.display = 'block';
      app.stage.addChild(world, stage.bars);
      stage.setReducedMotion(reduced());
      app.ticker.add((t) => { 
        stage.tick(t.deltaMS); player.tick(t.deltaMS);
        const st = useStore.getState().watch;
        const gdt = st.playing ? Math.min(t.deltaMS, 100) * (st.speed || 1) : 0;   // same clock as the cue player: pause/speed apply
        director.update(gdt); seqLayer.update(gdt);
        for (const [id, r] of rigs) r.rig.root.visible = !director.isHidden(id);   // waiting for its drop-in
        vfx.tick(gdt);
        labels.update(st.playing ? t.deltaMS : 0);
        app.renderer.render({ container: pixelSrc, target: pixelRT, clear: true, clearColor: [0, 0, 0, 0], transform: pixelXf });
      });
      fit();
      app.renderer.on('resize', fit);
      void sync(true).then(() => {   // rigs are ready: replay the cues that arrived while they loaded (so a replay still gets its intro)
        if (disposed) return;
        const early = preRigs?.splice(0) ?? []; preRigs = null;
        for (const c of early) director.push(c);
      });
    });

    const unsubOrder = useStore.subscribe((s, prev) => {
      if (s.watch.state?.order !== prev.watch.state?.order || s.fighters !== prev.fighters) void sync(false);
      if (s.watch.playbackRevision !== prev.watch.playbackRevision) { snapSequences(); void sync(true); }   // snap rule (PRD §8.7)
    });
    let report: ReturnType<typeof setTimeout> | undefined;
    const unsubCues = useStore.getState().cues$((c) => {
      if (preRigs && preRigs.length < 64) preRigs.push(c); else if (!preRigs) director.push(c);
      if (import.meta.env.DEV) {   // per-kind cue counts, logged 2 s after the last cue (AC-07.1 evidence)
        (window as unknown as { __arenaCues?: unknown; __arenaPlayer?: unknown }).__arenaCues = player.stats;
        (window as unknown as { __arenaPlayer?: unknown }).__arenaPlayer = player;
        clearTimeout(report);
        report = setTimeout(() => { console.info('[arena] cue counts', player.summary()); }, 2000);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(report); director.destroy(); seqLayer.destroy(); vfx.destroy(); labels.destroy(); player.setFighters([]);
      stage.destroy();
      unsubOrder(); unsubCues();
      void ready.then(() => { app.destroy(true, { children: true }); pixelSrc.destroy({ children: true }); pixelRT.destroy(true); }).catch(() => undefined);
    };
  }, []);
  return createElement('div', {
    ref: host, 'data-arena': '', 'data-reduced-motion': props.reducedMotion || prefersReduced() ? '1' : '0',
    style: { width: '100%', aspectRatio: '16 / 9', background: '#000', overflow: 'hidden' },
  });
}
