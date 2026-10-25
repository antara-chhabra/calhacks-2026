// VFX layer (A-07, FC-F-124, PRD §10.5, art-bible §5 #10-13/§6). Driven by CueHooks; every display object comes from a bounded pool
// (nothing is created per hit once warm). Time advances only through tick(dtMs), which the host feeds as wall dt × speed while playing,
// so pause/speed behave like the cue player. Reduced motion: no shake, no hit-stop, no white flash, no stage desaturation, no scale/spin,
// shorter pops; the VAR becomes a static strike-through plus labels (art-bible §6).
import { ColorMatrixFilter, Container, Graphics, Text } from 'pixi.js';
import type { ArenaCue } from '@fc/engine';
import type { FighterId } from '@fc/contracts';
import type { CueHooks } from '../cues';
import {
  arcMs, arcRadius, BAD, BIG_FONT, clamp01, countdownStep, easeOutBack, easeOutCubic, FLASH_MS, GOLD, HIT_STOP_MS, lerp, OK, OUTLINE,
  PARTICLE_CAP, Pool, popFor, popMs, popRise, shakeFor, shakeOffset, sparkCount, sparkMs, VAR_T, varDesat, type PopSpec, type Power, type ShakeKind, type ShakeSpec,
} from './pure';

export interface VfxFighter { x: number; y: number; facing: 1 | -1; color: number; height: number; root: Container }
export interface VfxDeps {
  /** The stage world (desaturated, except `vfx`, during a VAR). */
  world: Container;
  vfx: Container;
  fighter(id: FighterId): VfxFighter | undefined;
  reduced(): boolean;
  /** Freeze these fighters' clips (CuePlayer.hitStop). */
  hitStop(ms: number, ids: readonly FighterId[]): void;
  /** Screen-shake offset in stage px; (0,0) at rest. */
  shake(dx: number, dy: number): void;
}
export interface Vfx {
  hooks: Required<Pick<CueHooks, 'onCue' | 'onImpact'>>;
  tick(dtMs: number): void;
  /** Catch-up (snap / seek): end every effect now. */
  clear(): void;
  destroy(): void;
  /** Pool occupancy, for tests/inspection. */
  stats(): Record<string, { created: number; idle: number }>;
}

const W = 1920, H = 1080, CX = 960;
const BANNER_Y = 430;

interface Fx { delay: number; t: number; dur: number; started: boolean; start?(): void; upd(p: number, t: number): void; end?(): void }

const crescent = (): Graphics => {
  const g = new Graphics(), a = 1.15, ca = Math.cos(a), pts: number[] = [];
  for (let i = 0; i <= 12; i++) { const t = -a + (2 * a * i) / 12; pts.push(Math.cos(t), Math.sin(t)); }
  for (let i = 12; i >= 0; i--) { const t = -a + (2 * a * i) / 12; pts.push(ca + (Math.cos(t) - ca) * 0.42, Math.sin(t)); }
  g.poly(pts).fill(0xffffff);
  return g;
};
const star = (points: number, inner: number): Graphics => {
  const g = new Graphics(), pts: number[] = [];
  for (let i = 0; i < points * 2; i++) { const r = i % 2 ? inner : 1, a = (Math.PI * i) / points - Math.PI / 2; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
  g.poly(pts).fill(0xffffff);
  return g;
};
const text = (size: number, stroke: number): Text => {
  const t = new Text({ text: '', style: { fontFamily: BIG_FONT, fontSize: size, fill: 0xffffff, stroke: { color: OUTLINE, width: stroke, join: 'round' }, align: 'center' } });
  t.anchor.set(0.5);
  return t;
};
const rectG = (): Graphics => new Graphics().rect(-0.5, -0.5, 1, 1).fill(0xffffff);
const circleG = (): Graphics => new Graphics().circle(0, 0, 1).fill(0xffffff);
const coinG = (): Graphics => new Graphics().circle(0, 0, 22).fill(GOLD).stroke({ width: 4, color: OUTLINE }).circle(0, 0, 14).stroke({ width: 3, color: 0xfff1b8 });
const flaskG = (): Graphics => new Graphics()
  .poly([-8, -34, 8, -34, 8, -18, 26, 14, 26, 30, -26, 30, -26, 14, -8, -18]).fill(0xdff6ff).stroke({ width: 4, color: OUTLINE })
  .poly([-20, 8, 20, 8, 22, 26, -22, 26]).fill(OK).rect(-10, -42, 20, 10).fill(0xc98b6b).stroke({ width: 3, color: OUTLINE });
/** Referee drone holding a card (children: [drone, card]); the card's fill (card.children[1]) is tinted yellow/red. */
function droneG(): Container {
  const c = new Container(), d = new Graphics();
  d.rect(-3, 14, 6, 26).fill(OUTLINE).rect(-38, -30, 76, 7).fill(0x6b6488).stroke({ width: 3, color: OUTLINE })
    .roundRect(-28, -18, 56, 34, 12).fill(0xdad6e8).stroke({ width: 4, color: OUTLINE })
    .circle(0, -2, 10).fill(0xffffff).stroke({ width: 3, color: OUTLINE }).circle(2, -2, 4).fill(OUTLINE)
    .circle(34, 4, 8).fill(GOLD).stroke({ width: 3, color: OUTLINE });
  const card = new Container(), edge = new Graphics().roundRect(-26, -36, 52, 72, 6).fill(OUTLINE), fill = new Graphics().roundRect(-21, -31, 42, 62, 4).fill(0xffffff);
  card.addChild(edge, fill); card.position.set(0, 76);
  c.addChild(d, card);
  return c;
}

export function createVfx(deps: VfxDeps): Vfx {
  const root = deps.vfx;
  const owner = new Map<Container, Pool<Container>>();
  const mk = <T extends Container>(make: () => T, cap: number): Pool<T> => {
    const p = new Pool<T>(() => { const o = make(); o.visible = false; root.addChild(o); owner.set(o, p as unknown as Pool<Container>); return o; }, cap);
    return p;
  };
  const pools = {
    arc: mk(crescent, 12), spark: mk(() => star(4, 0.3), PARTICLE_CAP - 40), burst: mk(() => star(8, 0.55), 8), rect: mk(rectG, 24),
    circle: mk(circleG, 24), coin: mk(coinG, 12), flask: mk(flaskG, 4), drone: mk(droneG, 6),
    pop: mk(() => text(46, 8), 24), mid: mk(() => text(96, 12), 8), big: mk(() => text(170, 16), 6),
  };
  const take = <T extends Container>(p: Pool<T>): T | null => {
    const o = p.acquire();
    if (!o) return null;
    o.visible = true; o.alpha = 1; o.rotation = 0; o.scale.set(1); o.position.set(0, 0); o.tint = 0xffffff;
    return o;
  };
  const give = (o: Container | null): void => { if (!o) return; o.visible = false; o.filters = null; owner.get(o)?.release(o); };

  const fxs: Fx[] = [];
  let now = 0, varFree = 0;
  const add = (f: Omit<Fx, 't' | 'started' | 'delay'> & { delay?: number }): void => { fxs.push({ delay: 0, ...f, t: 0, started: false }); };

  // ---- shake ----
  let shake: { spec: ShakeSpec; t: number } | null = null;
  const doShake = (kind: ShakeKind): void => {
    const spec = shakeFor(kind, deps.reduced());
    if (spec.amp <= 0) return;
    if (!shake || spec.amp >= shakeOffsetAmp(shake)) shake = { spec, t: 0 };
  };
  const shakeOffsetAmp = (s: { spec: ShakeSpec; t: number }): number => s.spec.amp * (1 - s.t / s.spec.ms);

  // ---- white flash on the victim ----
  const flashF = new ColorMatrixFilter();
  flashF.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  const flashing = new Map<Container, number>();
  const flash = (f: VfxFighter): void => {
    if (deps.reduced()) return;
    flashing.set(f.root, (flashing.get(f.root) ?? 0) + 1);
    f.root.filters = [flashF];
    add({ dur: FLASH_MS, upd: () => undefined, end: () => {
      const n = (flashing.get(f.root) ?? 1) - 1;
      if (n <= 0) { flashing.delete(f.root); f.root.filters = null; } else flashing.set(f.root, n);
    } });
  };

  // ---- score pop ----
  const pop = (f: VfxFighter, spec: PopSpec, delay = 0): void => {
    let t: Text | null = null;
    const dur = popMs(deps.reduced()), red = deps.reduced();
    add({ dur, delay,
      start: () => { t = take(pools.pop); if (t) { t.text = spec.text; t.tint = spec.color; t.position.set(f.x, f.y - f.height - 70); } },
      upd: (p) => {
        if (!t) return;
        t.y = f.y - f.height - 70 - popRise * easeOutCubic(p);
        t.alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
        t.scale.set(red ? 1 : lerp(0.6, 1, easeOutBack(clamp01(p / 0.25))));
      },
      end: () => { give(t); } });
  };

  // ---- slash arc + sparks ----
  const slash = (x: number, y: number, dir: 1 | -1, power: Power, color: number, second: boolean): void => {
    let g: Graphics | null = null;
    const r = arcRadius(power), reduced = deps.reduced(), dur = reduced ? 150 : arcMs(power);
    add({ dur,
      start: () => { g = take(pools.arc); if (g) { g.position.set(x, y); g.tint = color; } },
      upd: (p) => {
        if (!g) return;
        const e = easeOutCubic(p), s = r * (reduced ? 1 : lerp(0.75, 1.1, e));
        g.scale.set(dir * s, (second ? -1 : 1) * s * 0.9);
        g.rotation = reduced ? 0 : dir * (second ? -1 : 1) * lerp(-0.9, 0.5, e);
        g.alpha = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65;
      },
      end: () => { give(g); } });
  };
  const sparks = (x: number, y: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const s = take(pools.spark);
      if (!s) return;
      const a = Math.random() * Math.PI * 2, sp = 240 + Math.random() * 220, k = 7 + Math.random() * 7;
      s.position.set(x, y); s.tint = i % 2 ? GOLD : 0xffffff; s.rotation = a;
      add({ dur: sparkMs, upd: (p, t) => { s.x = x + Math.cos(a) * sp * (t / 1000); s.y = y + Math.sin(a) * sp * (t / 1000) + 140 * (t / 1000) ** 2; s.scale.set(k * (1 - p * 0.8)); s.alpha = 1 - p * p; }, end: () => { give(s); } });
    }
  };

  // ---- text banners ----
  const banner = (pool: 'mid' | 'big', str: string, color: number, y: number, dur: number, delay = 0, x = CX): void => {
    let t: Text | null = null;
    const reduced = deps.reduced();
    add({ dur, delay,
      start: () => { t = take(pools[pool]); if (t) { t.text = str; t.tint = color; t.position.set(x, y); } },
      upd: (p, ms) => {
        if (!t) return;
        t.scale.set(reduced ? 1 : lerp(1.6, 1, easeOutBack(clamp01(ms / 220))));
        t.alpha = p > 0.85 ? (1 - p) / 0.15 : 1;
      },
      end: () => { give(t); } });
  };
  const dim = (alpha: number, dur: number, delay = 0, tint = OUTLINE): void => {
    let r: Graphics | null = null;
    add({ dur, delay, start: () => { r = take(pools.rect); if (r) { r.position.set(CX, H / 2); r.scale.set(W, H); r.tint = tint; r.alpha = 0; } },
      upd: (p) => { if (r) r.alpha = alpha * Math.min(1, p * 8, (1 - p) * 8); }, end: () => { give(r); } });
  };

  // ---- KO blast ----
  const koBlast = (id: FighterId): void => {
    const reduced = deps.reduced();
    add({ dur: reduced ? 400 : 700, delay: 420,
      start: () => {
        const f = deps.fighter(id); if (!f) return;
        const dir: 1 | -1 = f.x < CX ? -1 : 1, edge = dir < 0 ? 56 : W - 56, dist = Math.abs(edge - f.x);
        const y0 = f.y - f.height / 2, y1 = Math.max(110, y0 - dist * 0.577);   // 30° arc off-stage (§10.5)
        const streak = take(pools.rect), core = take(pools.rect), b1 = take(pools.burst), b2 = take(pools.burst);
        const tx = Math.min(Math.max(edge, 220), W - 220);
        banner('big', 'KO!', GOLD, Math.min(Math.max(y1, 200), 620), 400, 0, tx);
        if (!reduced) {
          doShake('ko');
          add({ dur: 700, upd: (p, ms) => {
            const e = easeOutCubic(clamp01(ms / 260));
            if (streak) { streak.position.set((f.x + edge) / 2, (y0 + y1) / 2); streak.rotation = Math.atan2(y1 - y0, edge - f.x); streak.scale.set(dist * e, 18 * (1 - p)); streak.tint = 0xffffff; streak.alpha = 1 - p; }
            if (core) { core.position.set((f.x + edge) / 2, (y0 + y1) / 2); core.rotation = streak?.rotation ?? 0; core.scale.set(dist * e, 7 * (1 - p)); core.tint = GOLD; core.alpha = 1 - p; }
            if (b1) { b1.position.set(edge, y1); b1.scale.set(lerp(30, 300, easeOutBack(clamp01(ms / 300)))); b1.rotation = p * 0.6; b1.tint = GOLD; b1.alpha = 1 - p * p; }
            if (b2) { b2.position.set(edge, y1); b2.scale.set(lerp(15, 170, easeOutBack(clamp01(ms / 300)))); b2.rotation = -p * 0.8; b2.tint = 0xffffff; b2.alpha = 1 - p; }
          }, end: () => { give(streak); give(core); give(b1); give(b2); } });
        } else { give(streak); give(core); give(b1); give(b2); }
      }, upd: () => undefined });
  };

  // ---- referee card (drone flies in 300 ms, card pops 0.6→1.1→1.0 over 260 ms, holds 1.4 s) ----
  const card = (id: FighterId, color: 'yellow' | 'red'): void => {
    let d: Container | null = null, c: Container | null = null;
    const reduced = deps.reduced(), tint = color === 'red' ? BAD : GOLD;
    add({ dur: 300 + 260 + 1400 + 200,
      start: () => { d = take(pools.drone); c = d ? d.children[1] as Container : null; if (c) (c.children[1] as Graphics).tint = tint; },
      upd: (_p, t) => {
        const f = deps.fighter(id);
        if (!d || !f) return;
        const tx = f.x + 30, ty = Math.max(150, f.y - f.height - 120), fly = reduced ? 1 : easeOutCubic(clamp01(t / 300));
        d.position.set(lerp(f.x < CX ? -80 : W + 80, tx, fly), lerp(ty - 260, ty, fly) + Math.sin(t / 120) * (reduced ? 0 : 3));
        d.alpha = t > 1960 ? 1 - (t - 1960) / 200 : reduced ? 1 : clamp01(t / 120);
        if (c) {
          const q = t - 300;
          c.visible = q >= 0;
          c.scale.set(reduced ? 1 : q < 130 ? lerp(0.6, 1.1, easeOutCubic(clamp01(q / 130))) : lerp(1.1, 1, clamp01((q - 130) / 130)));
        }
      },
      end: () => { give(d); } });
  };

  // ---- coin / potion ----
  const coin = (id: FighterId): void => {
    for (let i = 0; i < 3; i++) {
      let c: Graphics | null = null, s: Text | null = null;
      const reduced = deps.reduced(), ox = (i - 1) * 46;
      add({ dur: reduced ? 600 : 950, delay: i * 90,
        start: () => { c = take(pools.coin); s = take(pools.pop); if (s) { s.text = '$'; s.tint = OUTLINE; s.scale.set(0.9); } },
        upd: (p) => {
          const f = deps.fighter(id);
          if (!f) return;
          const y = f.y - f.height - 40 - 90 * easeOutBack(clamp01(p * 1.4)) + (reduced ? 0 : 0), spin = reduced ? 1 : Math.abs(Math.cos(p * Math.PI * 3));
          if (c) { c.position.set(f.x + ox, y); c.scale.set(Math.max(0.12, spin), 1); c.alpha = p > 0.75 ? (1 - p) / 0.25 : 1; }
          if (s) { s.position.set(f.x + ox, y); s.scale.set(Math.max(0.12, spin) * 0.9, 0.9); s.alpha = c?.alpha ?? 1; }
        }, end: () => { give(c); give(s); } });
    }
  };
  const potion = (id: FighterId): void => {
    let fl: Graphics | null = null;
    const bub: (Graphics | null)[] = [];
    const reduced = deps.reduced();
    add({ dur: reduced ? 700 : 1200,
      start: () => { fl = take(pools.flask); for (let i = 0; i < 3; i++) { const b = take(pools.circle); if (b) b.tint = 0xdff6ff; bub.push(b); } },
      upd: (p, t) => {
        const f = deps.fighter(id);
        if (!f) return;
        const y = f.y - f.height - 70 - 40 * easeOutCubic(p);
        if (fl) { fl.position.set(f.x, y); fl.rotation = reduced ? 0 : Math.sin(t / 110) * 0.18; fl.scale.set(reduced ? 1 : lerp(0.5, 1, easeOutBack(clamp01(p * 3)))); fl.alpha = p > 0.8 ? (1 - p) / 0.2 : 1; }
        bub.forEach((b, i) => { if (b) { const q = (p * 1.6 + i / 3) % 1; b.position.set(f.x + (i - 1) * 16 + Math.sin(q * 9 + i) * 5, y - 40 - q * 50); b.scale.set(4 + i); b.alpha = (1 - q) * (fl?.alpha ?? 1); } });
      }, end: () => { give(fl); bub.forEach(give); } });
  };

  // ---- countdown / timeup / void ----
  const countdown = (): void => {
    let t: Text | null = null;
    const reduced = deps.reduced();
    add({ dur: 2400,
      start: () => { t = take(pools.big); if (t) t.position.set(CX, BANNER_Y); },
      upd: (_p, ms) => {
        const s = countdownStep(ms);
        if (!t || !s) return;
        if (t.text !== s.text) { t.text = s.text; t.tint = s.text === 'FIGHT!' ? GOLD : 0xffffff; }
        t.scale.set(reduced ? 1 : lerp(1.6, 1, easeOutBack(clamp01(s.p * 2))));
        t.alpha = s.text === 'FIGHT!' && s.p > 0.7 ? (1 - s.p) / 0.3 : 1;
      }, end: () => { give(t); } });
  };

  // ---- VAR (§10.5): freeze 150 → desaturate 200 → "VAR REVIEW" stamp 220 → ghost replay 500 → "OVERTURNED" → −pts → resaturate 300 ≈ 2.2 s ----
  const satF = new ColorMatrixFilter();
  const varOverlay = (cue: Extract<ArenaCue, { kind: 'var' }>): void => {
    const start = Math.max(now, varFree); varFree = start + VAR_T.end;
    const reduced = deps.reduced();
    let dimR: Graphics | null = null, stamp: Text | null = null, verdict: Text | null = null, ghost: Graphics | null = null, scan: Graphics | null = null, strike: Graphics | null = null;
    let targets: Container[] = [], lastSat = -1, verdictShake = false, popped = false;
    add({ dur: VAR_T.end, delay: start - now,
      start: () => {
        if (!reduced) deps.hitStop(VAR_T.freeze, [cue.fighter, cue.target]);
        dimR = take(pools.rect); stamp = take(pools.mid); verdict = take(pools.mid); ghost = take(pools.arc); scan = take(pools.rect); strike = take(pools.rect);
        if (dimR) { dimR.position.set(CX, H / 2); dimR.scale.set(W, H); dimR.tint = OUTLINE; dimR.alpha = 0; }
        if (stamp) { stamp.text = 'VAR REVIEW'; stamp.tint = GOLD; stamp.position.set(CX, BANNER_Y); stamp.visible = false; }
        if (verdict) { verdict.text = 'OVERTURNED'; verdict.tint = BAD; verdict.position.set(CX, BANNER_Y + 110); verdict.visible = false; }
        [ghost, scan, strike].forEach((o) => { if (o) o.visible = false; });
        if (!reduced) { targets = deps.world.children.filter((c) => c !== deps.vfx); targets.forEach((c) => { c.filters = [satF]; }); }
      },
      upd: (_p, t) => {
        const a = deps.fighter(cue.fighter), v = deps.fighter(cue.target);
        if (dimR) dimR.alpha = 0.32 * Math.min(1, t / VAR_T.desat) * (t > VAR_T.resat ? 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat) : 1);
        const sat = varDesat(t, reduced);
        if (!reduced && sat !== lastSat) { lastSat = sat; satF.reset(); satF.saturate(-1.05 * sat, false); }
        if (stamp && t >= VAR_T.desat) {
          const q = t - VAR_T.desat;
          stamp.visible = true; stamp.scale.set(reduced ? 1 : lerp(1.6, 1, easeOutBack(clamp01(q / 220)))); stamp.alpha = t > VAR_T.resat ? 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat) : 1;
        }
        const hx = v ? v.x - (a && v.x >= a.x ? 1 : -1) * 60 : CX, hy = v ? v.y - v.height * 0.55 : 500, dir = a && v && v.x < a.x ? -1 : 1;
        if (t >= VAR_T.stamp) {   // ghost of the original hit, reversed (500 ms), then struck through
          const q = clamp01((t - VAR_T.stamp) / (VAR_T.ghost - VAR_T.stamp));
          if (ghost) {
            ghost.visible = true; ghost.position.set(hx, hy); ghost.tint = a?.color ?? GOLD; ghost.scale.set(dir * 150, 135);
            ghost.rotation = reduced ? 0 : dir * lerp(0.5, -0.9, q); ghost.alpha = 0.55 * (t > VAR_T.resat ? 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat) : 1);
          }
          if (scan && v && !reduced && q < 1) { scan.visible = true; scan.tint = OK; scan.position.set(v.x, v.y - v.height * (1 - q)); scan.scale.set(320, 6); scan.alpha = 0.85; } else if (scan) scan.visible = false;
          if (strike && t >= VAR_T.ghost) {
            const w = reduced ? 1 : easeOutCubic(clamp01((t - VAR_T.ghost) / 150));
            strike.visible = true; strike.tint = BAD; strike.position.set(hx, hy); strike.rotation = -0.5; strike.scale.set(380 * w, 14);
            strike.alpha = t > VAR_T.resat ? 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat) : 1;
          }
        }
        if (verdict && t >= VAR_T.verdict) {
          verdict.visible = true; verdict.scale.set(reduced ? 1 : lerp(1.6, 1, easeOutBack(clamp01((t - VAR_T.verdict) / 220))));
          verdict.alpha = t > VAR_T.resat ? 1 - (t - VAR_T.resat) / (VAR_T.end - VAR_T.resat) : 1;
          if (!verdictShake) { verdictShake = true; doShake('overturn'); }
          if (!popped && a) { popped = true; const ps = popFor(cue); if (ps) pop(a, ps); }
        }
      },
      end: () => {
        targets.forEach((c) => { c.filters = null; });
        give(dimR); give(stamp); give(verdict); give(ghost); give(scan); give(strike);
      } });
  };

  // ---- hooks ----
  const hooks: Vfx['hooks'] = {
    onCue(cue) {
      const reduced = deps.reduced();
      switch (cue.kind) {
        case 'whiff': {
          const a = deps.fighter(cue.fighter), ps = popFor(cue);
          if (a && ps) pop(a, ps, reduced ? 0 : 450);
          if (a && !reduced) { const d = a.facing; add({ dur: 1, delay: 380, start: () => sparks(a.x + d * 130, a.y - 30, 5), upd: () => undefined }); }
          break;
        }
        case 'card': card(cue.fighter, cue.color); break;
        case 'coin': coin(cue.fighter); break;
        case 'potion': potion(cue.fighter); break;
        case 'countdown': countdown(); break;
        case 'timeup': dim(0.3, 2000); banner('big', 'TIME!', GOLD, BANNER_Y, 2000); break;
        case 'void': {
          dim(0.45, 3200);
          banner('big', 'MATCH VOID', BAD, BANNER_Y, 3200);
          banner('mid', cue.reason.slice(0, 60), 0xffffff, BANNER_Y + 130, 3200);
          break;
        }
        case 'ko': koBlast(cue.fighter); break;
        case 'var': if (cue.overturned) varOverlay(cue); break;
        default: break;
      }
    },
    onImpact(cue, second) {
      const v = deps.fighter(cue.target), a = deps.fighter(cue.fighter);
      if (!v) return;
      const reduced = deps.reduced(), dir: 1 | -1 = a ? (v.x >= a.x ? 1 : -1) : (v.facing === 1 ? -1 : 1);
      const cx = v.x - dir * 60, cy = v.y - v.height * 0.55;
      slash(cx, cy, dir, cue.power, a?.color ?? GOLD, second);
      sparks(v.x - dir * 20, cy, reduced ? 4 : sparkCount(cue.power));
      doShake(cue.power);
      if (!second) {
        if (!reduced) deps.hitStop(HIT_STOP_MS, [cue.fighter, cue.target]);
        flash(v);
        const ps = popFor(cue);
        if (a && ps) pop(a, ps);
      }
    },
  };

  const clear = (): void => {
    for (const f of fxs) if (f.started) f.end?.();
    fxs.length = 0;
    for (const r of flashing.keys()) r.filters = null;
    flashing.clear(); shake = null; deps.shake(0, 0); varFree = now;
  };

  return {
    hooks,
    clear,
    destroy: clear,
    stats: () => Object.fromEntries(Object.entries(pools).map(([k, p]) => [k, { created: p.created, idle: p.idle }])),
    tick(dtMs) {
      now += dtMs;
      for (let i = 0; i < fxs.length; i++) {
        const f = fxs[i]!;
        let dt = dtMs;
        if (f.delay > 0) { f.delay -= dtMs; if (f.delay > 0) continue; dt = -f.delay; f.delay = 0; }
        if (!f.started) { f.started = true; f.start?.(); }
        f.t += dt;
        f.upd(clamp01(f.t / f.dur), f.t);
        if (f.t >= f.dur) { f.end?.(); fxs.splice(i, 1); i--; }
      }
      if (shake) {
        shake.t += dtMs;
        const o = shakeOffset(shake.spec, shake.t);
        deps.shake(o.dx, o.dy);
        if (shake.t >= shake.spec.ms) shake = null;
      }
    },
  };
}
