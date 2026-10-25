// Sky Colosseum (PRD §10.6, art-bible §3/§5). Procedural Pixi; static layers drawn once, only clouds drift and
// the jumbotron redraws when its signature changes.
import { Container, Graphics, Text } from 'pixi.js';
import { useStore } from '@/data/store';
import { formatClock, gemStates, JUMBO, matchClockMs, matchLabel, PLATFORMS, STAGE_H, STAGE_W, type GemState } from './layout';

const OUTLINE = 0x14121f, GOLD = 0xf2c14e, STONE_LIT = 0x8f86a8, STONE_SHADE = 0x4a4466;
const GEM_FILL: Record<GemState, number> = { pending: 0x2a2540, solved: 0x2ec4a6, overturned: 0xe5383b };

export type Stage = {
  /** Layer order: sky, farClouds, ring, crowd, platforms, fighters, vfx, nearClouds, jumbotron. */
  world: Container; fighters: Container; vfx: Container;
  /** Screen-space letterbox bars; call after the stage scale changes. */
  layoutBars(screenW: number, screenH: number): void; bars: Graphics;
  tick(dtMs: number): void; setReducedMotion(on: boolean): void; destroy(): void;
};

function sky(): Graphics {
  const g = new Graphics();
  const top = [0x2b, 0x1b, 0x5a], bot = [0xff, 0x8a, 0x5b], N = 24, h = STAGE_H / N;
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1), c = top.map((v, k) => Math.round(v + (bot[k]! - v) * f));
    g.rect(0, i * h, STAGE_W, h + 1).fill((c[0]! << 16) | (c[1]! << 8) | c[2]!);
  }
  return g;
}
function cloudBand(color: number, alpha: number, ys: number[], scale: number, period: number): Container {
  const c = new Container(), g = new Graphics();
  for (let rep = 0; rep < 2; rep++) {
    ys.forEach((y, i) => {
      const x = rep * period + ((i * 613) % period), w = (140 + (i % 3) * 70) * scale;
      g.ellipse(x, y, w, 34 * scale).ellipse(x + w * 0.6, y - 18 * scale, w * 0.6, 30 * scale).ellipse(x - w * 0.55, y + 6 * scale, w * 0.5, 24 * scale).fill({ color, alpha });
    });
  }
  c.addChild(g);
  return c;
}
function ring(): Graphics {
  const g = new Graphics();
  g.ellipse(960, 640, 980, 190).fill(0x241845);                       // far arena silhouette
  for (let i = 0; i < 16; i++) {                                       // arches
    const x = 40 + i * 120;
    g.roundRect(x, 520, 70, 120, 35).fill(0x1b1236);
  }
  for (const px of [200, 560, 1360, 1720]) {                           // server pillars with glow
    g.rect(px - 20, 330, 40, 330).fill(0x2f2358);
    for (let k = 0; k < 6; k++) g.rect(px - 10, 350 + k * 48, 20, 6).fill({ color: 0x2ec4a6, alpha: 0.9 });
    g.circle(px, 340, 46).fill({ color: 0x2ec4a6, alpha: 0.12 });
  }
  return g;
}
function crowd(): Container {
  const g = new Graphics(), c = new Container();
  for (let i = 0; i < 64; i++) {
    const x = 20 + i * 30, y = 690 + (i % 3) * 6, tint = i % 2 ? 0x120c26 : 0x1a1236;
    g.circle(x, y, 9).fill(tint).roundRect(x - 11, y + 8, 22, 22, 6).fill(tint);
  }
  c.addChild(g);
  return c;
}
function platforms(): Graphics {
  const g = new Graphics();
  for (const p of [PLATFORMS.leftFloat, PLATFORMS.rightFloat, PLATFORMS.main]) {
    const under = p === PLATFORMS.main ? 150 : 90;
    g.poly([p.x + 20, p.y + p.h, p.x + p.w - 20, p.y + p.h, p.x + p.w / 2 + 70, p.y + p.h + under, p.x + p.w / 2 - 70, p.y + p.h + under]).fill(STONE_SHADE).stroke({ width: 4, color: OUTLINE });
    g.roundRect(p.x, p.y, p.w, p.h, 8).fill(STONE_SHADE).stroke({ width: 4, color: OUTLINE });
    g.roundRect(p.x, p.y, p.w, 16, 8).fill(STONE_LIT);
    for (const cx of [p.x + 50, p.x + p.w - 50]) {                   // hanging chains
      for (let k = 0; k < 5; k++) g.roundRect(cx - 5, p.y + p.h + k * 18, 10, 14, 4).stroke({ width: 3, color: OUTLINE }).fill(0x6b6488);
    }
  }
  return g;
}

export function createStage(): Stage {
  const world = new Container({ label: 'world' });
  const skyL = sky(), far = cloudBand(0x6c5ba8, 0.6, [130, 300, 210, 380, 90, 440, 250], 1, 1920);
  const ringL = ring(), crowdL = crowd(), platL = platforms();
  const fighters = new Container({ label: 'fighters' }), vfx = new Container({ label: 'vfx' });
  const near = cloudBand(0xf3c9b5, 0.85, [1040, 1000, 1070, 1020], 1.5, 1920);
  for (const c of [skyL, ringL, platL]) c.cacheAsTexture?.(true);
  far.cacheAsTexture?.(true); near.cacheAsTexture?.(true); crowdL.cacheAsTexture?.(true);

  // Jumbotron: static frame + dynamic gems/text. It sits in the cloud band under the main platform (JUMBO), clear
  // of every fighter, weapon swing, drop-in and head label.
  const jumbo = new Container({ label: 'jumbotron' });
  const { x: JX, y: JY, w: JW, h: JH } = JUMBO;
  const frame = new Graphics().roundRect(JX, JY, JW, JH, 18).fill(0x0d0a1c).stroke({ width: 6, color: GOLD }).roundRect(JX + 12, JY + 12, JW - 24, JH - 24, 12).stroke({ width: 3, color: OUTLINE });
  frame.cacheAsTexture?.(true);
  const gems = new Graphics();
  const mk = (size: number, fill: number, x: number, y: number, anchorX: number): Text => {
    const t = new Text({ text: '', style: { fontFamily: 'Lilita One, Impact, sans-serif', fontSize: size, fill } });
    t.anchor.set(anchorX, 0.5); t.position.set(x, y); return t;
  };
  const label = mk(30, GOLD, JX + 34, JY + 38, 0), clock = mk(64, 0xffffff, JX + JW - 32, JY + JH / 2 + 2, 1), banner = mk(24, GOLD, JX + JW / 2, JY + JH - 26, 0.5);
  label.text = 'MATCH'; banner.text = 'FIGHT CARD';
  jumbo.addChild(frame, gems, label, clock, banner);

  world.addChild(skyL, far, ringL, crowdL, platL, fighters, vfx, near, jumbo);

  let sig = '', lastClock = '', reduced = false, farX = 0, nearX = 0;
  const redraw = (): void => {
    const st0 = useStore.getState(), s = st0.watch.state;
    const num = (st0.matches[st0.watch.matchId ?? ''] ?? st0.matches[s.matchId ?? ''])?.number;
    const gs = gemStates(s), ck = formatClock(matchClockMs(s.timeLimitMs, s.startedT, s.t)), lb = num !== undefined ? `MATCH #${num}` : matchLabel(s.matchId);
    const nsig = gs.map((g) => g.state[0]).join('') + lb;
    if (nsig !== sig) {
      sig = nsig; label.text = lb; gems.clear();
      gs.forEach((g, i) => {
        const x = JX + 52 + i * 62, y = JY + 84;
        gems.poly([x, y - 26, x + 22, y, x, y + 26, x - 22, y]).fill(GEM_FILL[g.state]).stroke({ width: 3, color: g.state === 'pending' ? 0x6c5ba8 : OUTLINE });
      });
    }
    if (ck !== lastClock) { lastClock = ck; clock.text = ck; }
  };
  const unsub = useStore.subscribe((st, prev) => { if (st.watch.state !== prev.watch.state || st.matches !== prev.matches || st.watch.matchId !== prev.watch.matchId) redraw(); });
  redraw();

  const bars = new Graphics();
  return {
    world, fighters, vfx, bars,
    layoutBars(sw, sh) {
      const s = Math.min(sw / STAGE_W, sh / STAGE_H), w = STAGE_W * s, h = STAGE_H * s, ox = (sw - w) / 2, oy = (sh - h) / 2;
      bars.clear();
      if (ox > 0.5) bars.rect(0, 0, ox, sh).rect(sw - ox, 0, ox, sh);
      if (oy > 0.5) bars.rect(0, 0, sw, oy).rect(0, sh - oy, sw, oy);
      bars.fill(0x000000);
    },
    tick(dtMs) {
      if (reduced) return;
      const d = dtMs / 1000;
      farX = (farX - 6 * d) % 1920; nearX = (nearX - 30 * d) % 1920;   // 0.15 / 0.3 of nominal pan speed, wrapped
      far.x = farX; near.x = nearX;
    },
    setReducedMotion(on) { reduced = on; },
    destroy() { unsub(); },
  };
}
