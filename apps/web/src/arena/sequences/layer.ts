// Sequence layer (A-09, FC-F-127/128): spotlight beams + stage dim (behind the fighters), lower-third name banners, confetti and the
// winner banner (in front). Driven by Beats from the SequenceDirector; time advances only through update(dtMs) (same clock as vfx).
// Reduced motion: no confetti, no pop/slide/scale, no moving dim; short fades only. Nothing is created per frame (two Graphics redrawn).
import { Container, Graphics, Text } from 'pixi.js';
import type { FighterId } from '@fc/contracts';
import { BIG_FONT, GOLD, OUTLINE } from '../vfx/pure';
import { makeConfetti, confettiAt, beamAlpha, INTRO, OUTRO, type ConfettiPiece } from './pure';
import type { Beat } from './director';

export interface SequenceLayerOpts {
  world: Container;        // the back layer is inserted below `fighters`
  fighters: Container;
  front: Container;        // banners + confetti go on top of this container (the vfx layer)
  reduced(): boolean;
  getAnchor(id: FighterId): { x: number; y: number; height: number } | null;
  getName(id: FighterId): string;
  getColor(id: FighterId): number;
}
export interface SequenceLayer { beat(b: Beat): void; update(dtMs: number): void; clear(): void; destroy(): void }

const W = 1920, H = 1080, CX = 960;
interface Spot { id: FighterId; t: number; dur: number; strong: boolean }
interface Banner { id: FighterId; t: number }

export function createSequenceLayer(o: SequenceLayerOpts): SequenceLayer {
  const back = new Container(), front = new Container();
  back.label = 'sequences-back'; front.label = 'sequences-front';
  o.world.addChildAt(back, Math.max(0, o.world.getChildIndex(o.fighters)));
  o.front.addChildAt(front, 0);
  const lights = back.addChild(new Graphics());
  const confettiG = front.addChild(new Graphics());
  const bannerBox = front.addChild(new Container());
  const txt = (size: number, stroke: number): Text => {
    const t = new Text({ text: '', style: { fontFamily: BIG_FONT, fontSize: size, fill: 0xffffff, stroke: { color: OUTLINE, width: stroke, join: 'round' }, align: 'center' } });
    t.anchor.set(0.5); return t;
  };
  const winner = front.addChild(txt(130, 14));
  winner.visible = false;

  const banners = new Map<FighterId, Container>();
  const bannerFor = (id: FighterId): Container => {
    let c = banners.get(id);
    if (!c) { c = new Container(); c.addChild(new Graphics(), txt(54, 8)); c.visible = false; bannerBox.addChild(c); banners.set(id, c); }
    return c;
  };

  let spots: Spot[] = [], live: Banner[] = [], pieces: ConfettiPiece[] = [], confT = 0;
  let dim = { cur: 0, target: 0, rate: 0 };
  let win: { id: FighterId; t: number; settled: boolean } | null = null;

  const winnerText = (id: FighterId): string => `${o.getName(id).toUpperCase()} WINS!`;
  const setWinner = (id: FighterId, t: number, settled: boolean): void => { win = { id, t, settled }; winner.text = winnerText(id); winner.tint = GOLD; winner.visible = true; };

  function beat(b: Beat): void {
    const red = o.reduced();
    switch (b.kind) {
      case 'introLand':
        if (b.spotlight) spots.push({ id: b.fighter, t: 0, dur: INTRO.spotlightMs, strong: false });
        live = live.filter((x) => x.id !== b.fighter); live.push({ id: b.fighter, t: 0 });
        break;
      case 'victory':
        spots.push({ id: b.fighter, t: 0, dur: OUTRO.spotlightMs, strong: true });
        dim = { cur: dim.cur, target: red ? 0.3 : 0.5, rate: red ? 1 / 150 : 1 / 400 };
        pieces = b.confetti && !red ? makeConfetti(120, 7, [o.getColor(b.fighter), GOLD, 0xffffff, o.getColor(b.fighter)], false) : [];
        confT = 0;
        setWinner(b.fighter, 0, false);
        break;
      case 'podium': dim.target = 0; dim.rate = 1 / 500; break;
      case 'ended': clear(); if (b.fighter) setWinner(b.fighter, OUTRO.winnerPopMs + 400, true); break;
      case 'clear': clear(); break;
    }
  }

  function clear(): void {
    spots = []; live = []; pieces = []; win = null; dim = { cur: 0, target: 0, rate: 0 };
    lights.clear(); confettiG.clear(); winner.visible = false;
    for (const c of banners.values()) c.visible = false;
  }

  function drawBanner(b: Banner): void {
    const c = bannerFor(b.id), a = o.getAnchor(b.id);
    if (!a) { c.visible = false; return; }
    const [g, t] = c.children as [Graphics, Text], red = o.reduced();
    const name = o.getName(b.id).toUpperCase(), col = o.getColor(b.id);
    if (t.text !== name) {
      t.text = name; t.tint = 0xffffff;
      const w = t.width + 90;
      g.clear().roundRect(-w / 2, -44, w, 88, 18).fill({ color: OUTLINE, alpha: 0.88 }).stroke({ color: col, width: 6 })
        .rect(-w / 2 + 18, 30, w - 36, 6).fill(col);
    }
    const x = Math.min(Math.max(a.x, 300), W - 300), slide = red ? 0 : 40 * (1 - Math.min(1, b.t / 200));
    c.position.set(x, 975 + slide); c.visible = true;
    c.alpha = Math.min(1, b.t / 120, (INTRO.bannerMs - b.t) / 250);
  }

  function update(dtMs: number): void {
    const red = o.reduced();
    // dim
    if (dim.cur !== dim.target) {
      const step = dim.rate * dtMs;
      dim.cur = dim.cur < dim.target ? Math.min(dim.target, dim.cur + step) : Math.max(dim.target, dim.cur - step);
    }
    lights.clear();
    if (dim.cur > 0) lights.rect(0, 0, W, H).fill({ color: 0x0a0716, alpha: dim.cur });
    for (const s of spots) {
      s.t += dtMs;
      const a = o.getAnchor(s.id); if (!a) continue;
      const k = beamAlpha(s.t, s.dur, red) * (s.strong ? 1 : 0.8), top = Math.max(0, a.y - a.height - 420), spread = a.height * 0.5;
      lights.poly([a.x - 36, top, a.x + 36, top, a.x + spread, a.y, a.x - spread, a.y]).fill({ color: 0xfff3c4, alpha: 0.22 * k });
      lights.ellipse(a.x, a.y, spread * 1.05, 26).fill({ color: 0xfff3c4, alpha: 0.35 * k });
    }
    spots = spots.filter((s) => s.t < s.dur);
    // banners
    for (const b of live) { b.t += dtMs; drawBanner(b); }
    for (const b of live) if (b.t >= INTRO.bannerMs) bannerFor(b.id).visible = false;
    live = live.filter((b) => b.t < INTRO.bannerMs);
    // confetti
    confettiG.clear();
    if (pieces.length) {
      confT += dtMs;
      for (const p of pieces) {
        const s = confettiAt(p, confT); if (!s) continue;
        const c = Math.cos(s.rot) * p.size * 0.5, n = Math.sin(s.rot) * p.size * 0.5;
        confettiG.poly([s.x - c, s.y - n, s.x + n, s.y - c, s.x + c, s.y + n, s.x - n, s.y + c]).fill({ color: p.color, alpha: s.alpha });
      }
      if (confT > OUTRO.confettiMs + 700) pieces = [];
    }
    // winner banner: pops in mid-stage, then settles to a ribbon under the jumbotron (static in reduced motion / after a snap)
    if (win) {
      win.t += dtMs;
      const t = win.t, pop = red ? 1 : 1.6 - 0.6 * Math.min(1, t / 220) + (t < 220 ? 0 : 0);
      const settle = red ? (t > 600 ? 1 : 0) : Math.min(1, Math.max(0, (t - OUTRO.winnerPopMs) / 300));
      const sc = 1 + (0.5 - 1) * settle;
      winner.position.set(CX, 420 + (300 - 420) * settle);
      winner.scale.set(settle > 0 ? sc : pop);
      winner.alpha = red ? Math.min(1, t / 150) : Math.min(1, t / 100);
    }
  }

  return {
    beat, update, clear,
    destroy() { clear(); back.destroy({ children: true }); front.destroy({ children: true }); },
  };
}
