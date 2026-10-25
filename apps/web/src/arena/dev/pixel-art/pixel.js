// Pixel-art fighter parts for the En Garde rig. 1 pixel = 4 rig units. Each part is drawn in its bone's local
// frame (pivot at 0,0; limbs hang along +y; head/helm face +x; weapons point up -y).
(function () {
  const U = 4; // rig units per pixel

  // ---------- colour ----------
  const FIXED = {
    O: '#14121F', W: '#F7F1E3', w: '#C9C1D8', G: '#EEF3FA', M: '#A9B3C8', m: '#626B86', g: '#3B4058',
    X: '#B9824A', x: '#7E522E', z: '#4E2F1C', Y: '#F7CF5A', y: '#B5802C', R: '#C2364E', r: '#6E1C30', E: '#14121F',
  };
  const hex2hsl = (h) => {
    const n = parseInt(h.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let H = 0, S = 0;
    if (d) {
      S = d / (1 - Math.abs(2 * l - 1));
      H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      H *= 60; if (H < 0) H += 360;
    }
    return [H, S, l];
  };
  const hsl2hex = (H, S, L) => {
    S = Math.max(0, Math.min(1, S)); L = Math.max(0, Math.min(1, L)); H = ((H % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((H / 60) % 2 - 1)), m = L - c / 2;
    const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  // Move hue toward a target by up to `deg` along the short way round.
  const toward = (h, target, deg) => { let d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); };
  /** 4-step ramp with hue shifting: shadows lean cool (violet, the arena's ambient), highlights lean warm (sunset). */
  function ramp(hex, tint = 1) {
    let [h, s, l] = hex2hsl(hex);
    l *= tint;
    const dark = l < 0.22;
    return {
      base: hsl2hex(h, s, l),
      light: hsl2hex(toward(h, 48, 12), s * 0.95, l + (dark ? 0.16 : 0.13)),
      shadow: hsl2hex(toward(h, 255, 14), Math.min(1, s * 1.05 + 0.04), l - (dark ? 0.07 : 0.15)),
      deep: hsl2hex(toward(h, 255, 26), Math.min(1, s * 1.05 + 0.06), l - (dark ? 0.12 : 0.27)),
    };
  }
  // Token letters per palette slot: [light, base, shadow, deep]
  const SLOTS = { primary: ['Q', 'P', 'p', 'd'], secondary: ['T', 'S', 's', 'e'], accent: ['B', 'A', 'a', 'c'], skin: ['L', 'K', 'k', 'n'] };
  function colorMap(palette, tint = 1) {
    const map = {};
    for (const [k, v] of Object.entries(FIXED)) map[k] = tint === 1 ? v : scale(v, tint);
    for (const [slot, toks] of Object.entries(SLOTS)) {
      const r = ramp(palette[slot], tint);
      [r.light, r.base, r.shadow, r.deep].forEach((c, i) => { map[toks[i]] = c; });
    }
    return map;
  }
  function scale(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    return '#' + [16, 8, 0].map((s) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0')).join('');
  }

  // ---------- painter ----------
  class Px {
    constructor() { this.p = new Map(); }
    k(x, y) { return x + ',' + y; }
    get(x, y) { return this.p.get(this.k(x, y)); }
    set(x, y, t) { if (t === null) this.p.delete(this.k(x, y)); else this.p.set(this.k(x, y), t); return this; }
    rect(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); return this; }
    hline(x0, x1, y, t) { return this.rect(Math.min(x0, x1), y, Math.max(x0, x1), y, t); }
    vline(x, y0, y1, t) { return this.rect(x, Math.min(y0, y1), x, Math.max(y0, y1), t); }
    ellipse(cx, cy, rx, ry, t) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1.0) this.set(x, y, t);
        }
      return this;
    }
    poly(pts, t) {
      const ys = pts.map((p) => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const cy = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2)
          for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) this.set(x, y, t);
      }
      return this;
    }
    line(x0, y0, x1, y1, t) {
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (;;) {
        this.set(x0, y0, t);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
      return this;
    }
    /** Tapered limb from (0,y0) to (0,y1) with half-widths r0 → r1 and rounded ends; centred on x = cx. */
    limb(cx, y0, y1, r0, r1, t) {
      for (let y = Math.floor(y0 - r0); y <= Math.ceil(y1 + r1); y++)
        for (let x = Math.floor(cx - Math.max(r0, r1)) - 1; x <= Math.ceil(cx + Math.max(r0, r1)) + 1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const f = Math.max(0, Math.min(1, (py - y0) / (y1 - y0)));
          const r = r0 + (r1 - r0) * f, qy = y0 + (y1 - y0) * f;
          if ((px - cx) ** 2 + (py - qy) ** 2 <= r * r) this.set(x, y, t);
        }
      return this;
    }
    /** Directional shading: light from the upper left. Pixels of `base` within `sw` px of the right/bottom edge of
     *  their colour family become `shadow`; pixels on the left/top edge become `light`. */
    shade(base, light, shadow, family, sw = 2, sb = 1) {
      const fam = new Set(family || [base, light, shadow]);
      const out = (x, y) => !fam.has(this.get(x, y));
      const todo = [];
      for (const [key, t] of this.p) {
        if (t !== base) continue;
        const [x, y] = key.split(',').map(Number);
        let sh = false;
        for (let i = 1; i <= sw; i++) if (out(x + i, y)) sh = true;
        for (let i = 1; i <= sb; i++) if (out(x, y + i)) sh = true;
        if (sh) todo.push([x, y, shadow]);
        else if (light && (out(x - 1, y) || out(x, y - 1))) todo.push([x, y, light]);
      }
      todo.forEach(([x, y, t]) => this.set(x, y, t));
      return this;
    }
    /** 1-px outline around the silhouette (4-neighbour, so corners stay soft). */
    outline(t = 'O') {
      const add = [];
      for (const key of this.p.keys()) {
        const [x, y] = key.split(',').map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!this.p.has(this.k(x + dx, y + dy))) add.push([x + dx, y + dy]);
      }
      add.forEach(([x, y]) => this.set(x, y, t));
      return this;
    }
    replace(from, to) { for (const [k, t] of this.p) if (t === from) this.p.set(k, to); return this; }
    bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const key of this.p.keys()) { const [x, y] = key.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { x0, y0, x1, y1 };
    }
  }

  // ---------- body parts per build ----------
  // Dimensions in pixels. Lengths come from parts.json (units / 4).
  const BUILD = {
    heavy: { ua: [5, 4.2], fa: [4.4, 3.6], th: [5.2, 4.4], sh: [4.4, 3.6], thL: 13, shL: 11.5, hand: 3.6, foot: 12,
      torso: { top: -28, sl: -16, sr: 17, wl: -12, wr: 13, hip: 3 } },
    standard: { ua: [4, 3.4], fa: [3.6, 3], th: [4.4, 3.6], sh: [3.6, 3], thL: 13.5, shL: 12, hand: 3.2, foot: 11,
      torso: { top: -27, sl: -12, sr: 13, wl: -9, wr: 10, hip: 3 } },
    lean: { ua: [3.4, 2.8], fa: [3, 2.5], th: [3.8, 3.1], sh: [3.1, 2.6], thL: 14, shL: 12.5, hand: 2.9, foot: 10,
      torso: { top: -26, sl: -10, sr: 11, wl: -7, wr: 8, hip: 3 } },
  };

  function torso(b) {
    const T = BUILD[b].torso, d = new Px();
    const { top, sl, sr, wl, wr, hip } = T;
    // Tunic: shoulders → waist, slight barrel chest.
    d.poly([[sl + 3, top], [sr - 3, top], [sr, top + 4], [sr - 1, top + 12], [wr, -4], [wl, -4], [sl + 1, top + 12], [sl, top + 4]], 'P');
    d.ellipse(sl + 3, top + 4, 3.5, 4, 'P').ellipse(sr - 3, top + 4, 3.5, 4, 'P');
    // Tunic skirt below the belt, flaring over the hips.
    d.poly([[wl, -3], [wr, -3], [wr + 2, hip + 1], [wl - 2, hip + 1]], 'P');
    d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 3, 1);
    const cx = Math.round((wl + wr) / 2) + 1;
    // Chest: lit cluster upper-left, pec shadow arcs, centre seam (article tips 1 + 7).
    d.rect(sl + 4, top + 3, cx - 2, top + 6, 'Q');
    d.hline(cx - 6, cx - 1, top + 10, 'p').set(cx - 7, top + 9, 'p').hline(cx + 2, cx + 7, top + 10, 'p').set(cx + 8, top + 9, 'p');
    d.vline(cx, top + 4, -6, 'p');
    d.line(cx - 4, -9, cx - 3, -6, 'p').line(cx + 5, -10, cx + 4, -6, 'p');   // waist creases
    // Skirt folds: alternating light and shadow strips.
    for (const [x, t] of [[cx - 5, 'p'], [cx - 3, 'Q'], [cx + 2, 'p'], [cx + 4, 'Q'], [cx + 7, 'd']]) d.vline(x, -1, hip + 1, t);
    // V collar (accent).
    d.line(cx - 4, top, cx, top + 4, 'A').line(cx + 4, top, cx, top + 4, 'A').hline(cx - 1, cx + 1, top, 'K').set(cx, top + 1, 'k');
    // Belt + buckle.
    d.hline(wl, wr, -4, 'A').hline(wl, wr, -3, 'a').rect(cx - 1, -5, cx + 1, -2, 'Y').set(cx, -4, 'y').set(cx, -3, 'y');
    return d.outline();
  }

  function upperArm(b, heavyPad) {
    const [r0, r1] = BUILD[b].ua, d = new Px();
    d.limb(0, 0, 11, r0, r1, 'S');
    d.shade('S', 'T', 's', null, 2, 1);
    // Shoulder pad (primary) over the top third.
    d.ellipse(0, 1, r0 + (heavyPad ? 1.6 : 0.9), r0 + 0.6, 'P');
    d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 2, 1);
    d.hline(-Math.floor(r0) , Math.floor(r0), Math.round(r0 + 1.4), 'd');
    return d.outline();
  }

  function forearm(b) {
    const [r0, r1] = BUILD[b].fa, d = new Px();
    d.limb(0, 0, 11.5, r0, r1, 'K');
    d.shade('K', 'L', 'k', null, 2, 1);
    // Bracer (accent) with a light rim.
    d.limb(0, 6.5, 11.5, r1 + 0.7, r1 + 0.7, 'A');
    d.shade('A', 'B', 'a', ['A', 'B', 'a'], 2, 1);
    d.hline(-Math.floor(r1), Math.floor(r1), 7, 'B');
    return d.outline();
  }

  function hand(b) {
    const r = BUILD[b].hand + 0.5, d = new Px();
    d.ellipse(0, 4.5, r + 0.4, r, 'K');
    d.shade('K', 'L', 'k', null, 1, 1);
    // Knuckle line and thumb.
    d.hline(-Math.floor(r) + 1, Math.floor(r) - 1, 3, 'k');
    d.set(Math.round(r), 5, 'k');
    return d.outline();
  }

  function thigh(b) {
    const [r0, r1] = BUILD[b].th, L = BUILD[b].thL, d = new Px();
    d.limb(0, 0, L, r0, r1, 'S');
    d.shade('S', 'T', 's', null, 2, 1);
    d.line(1, Math.round(L * 0.45), 2, Math.round(L * 0.7), 's');   // fold
    return d.outline();
  }

  function shin(b) {
    const [r0, r1] = BUILD[b].sh, L = BUILD[b].shL, d = new Px();
    d.limb(0, 0, L, r0, r1, 'S');
    // Boot shaft (primary) from mid-shin, knee pad (accent).
    d.limb(0, L * 0.45, L + 1, r1 + 0.9, r1 + 0.9, 'P');
    d.shade('S', 'T', 's', null, 2, 1);
    d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 2, 1);
    d.ellipse(0.5, 0.5, r0 - 0.4, r0 - 1, 'A');
    d.shade('A', 'B', 'a', ['A', 'B', 'a'], 1, 1);
    d.hline(-Math.floor(r1), Math.floor(r1) + 1, Math.round(L * 0.45), 'Q');
    return d.outline();
  }

  function foot(b) {
    const len = BUILD[b].foot, d = new Px();
    // Boot: heel behind the ankle, toe forward and angled down (article tip 6).
    d.poly([[-3, -2], [3, -2], [len - 2, 1], [len, 3], [len, 4], [-3, 4]], 'P');
    d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 1, 1);
    d.hline(-3, len, 4, 'c');          // sole: the outline below it sits on the ground line (sole anchor 22)
    d.set(len - 1, 3, 'p');
    return d.outline();
  }

  // ---------- head, faces ----------
  // Chibi head (~22 px), 3/4 view facing +x. Brow line y = -17; the face (x 2..11, y -18..-4) stays clear of helmets.
  function head() {
    const d = new Px();
    d.rect(-3, -5, 3, 1, 'k').rect(-3, -5, 3, -4, 'n');              // neck, dark under the chin (tip 2)
    d.ellipse(1, -13.5, 10.5, 10, 'K');
    d.poly([[-6, -10], [11, -10], [11, -6], [8, -3], [0, -3], [-6, -6]], 'K');
    d.vline(12, -13, -11, 'K');                                      // nose
    d.shade('K', 'L', 'k', ['K', 'L', 'k'], 2, 1);
    for (let y = -19; y <= -5; y++) for (let x = 2; x <= 11; x++) { const t = d.get(x, y); if (t === 'K' || t === 'k') d.set(x, y, 'L'); }
    d.set(12, -11, 'k').hline(1, 8, -3, 'k').set(9, -4, 'k').set(10, -5, 'k').set(11, -6, 'k');
    d.ellipse(-3.5, -12, 2, 2.6, 'k').set(-3, -12, 'n').set(-3, -11, 'n');   // ear
    return d.outline();
  }

  // Two eyes in 3/4 view: near eye x 3..4, far eye x 8..9.
  const FACES = {
    neutral: {
      eyes: (d) => d.rect(3, -15, 4, -13, 'W').vline(4, -14, -13, 'E').rect(8, -15, 9, -13, 'W').vline(9, -14, -13, 'E'),
      brows: (d) => d.hline(2, 5, -17, 'O').hline(8, 10, -17, 'O'),
      mouth: (d) => d.hline(6, 9, -8, 'r'),
    },
    focus: {
      eyes: (d) => d.rect(3, -14, 4, -13, 'W').vline(4, -14, -13, 'E').rect(8, -14, 9, -13, 'W').vline(9, -14, -13, 'E'),
      brows: (d) => d.set(2, -18, 'O').hline(3, 4, -17, 'O').set(5, -16, 'O').set(8, -16, 'O').hline(9, 10, -17, 'O'),
      mouth: (d) => d.rect(5, -9, 9, -8, 'W').set(7, -9, 'w').set(7, -8, 'w').hline(5, 9, -7, 'r'),
    },
    smug: {
      eyes: (d) => d.hline(3, 4, -14, 'O').set(3, -13, 'W').set(4, -13, 'E').hline(8, 9, -14, 'O').set(8, -13, 'W').set(9, -13, 'E'),
      brows: (d) => d.hline(2, 5, -17, 'O').set(8, -17, 'O').hline(9, 10, -18, 'O'),
      mouth: (d) => d.hline(5, 7, -7, 'r').set(8, -8, 'r').set(9, -9, 'r'),
    },
    hurt: {
      eyes: (d) => d.set(3, -15, 'E').set(4, -14, 'E').set(3, -13, 'E').set(9, -15, 'E').set(8, -14, 'E').set(9, -13, 'E'),
      brows: (d) => d.set(2, -16, 'O').hline(3, 4, -17, 'O').set(5, -18, 'O').set(8, -18, 'O').set(9, -17, 'O').set(10, -16, 'O'),
      mouth: (d) => d.rect(6, -9, 9, -6, 'r').hline(6, 9, -9, 'W'),
    },
    ko: {
      eyes: (d) => { for (const x0 of [3, 8]) d.set(x0, -15, 'E').set(x0 + 2, -15, 'E').set(x0 + 1, -14, 'E').set(x0, -13, 'E').set(x0 + 2, -13, 'E'); return d; },
      brows: (d) => d,
      mouth: (d) => d.rect(5, -8, 9, -5, 'r').rect(6, -6, 8, -5, 'R'),
    },
  };
  function facePart(expr, kind) { const d = new Px(); FACES[expr][kind](d); return d; }

  /** Clear helmet pixels that would cover the face: front of the head below the brow line. */
  function clearFace(d, brow = -18) {
    for (const key of [...d.p.keys()]) {
      const [x, y] = key.split(',').map(Number);
      if (x >= 1 && y > brow) d.p.delete(key);
      else if (x >= -3 && x < 1 && y > brow + 4) d.p.delete(key);
    }
    return d;
  }
  /** Thick curve (quadratic bezier) painted with discs; radius tapers r0 → r1. */
  function stroke(d, p0, p1, p2, r0, r1, t) {
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, a = (1 - u) ** 2, b = 2 * (1 - u) * u, c = u * u;
      d.ellipse(a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1], r0 + (r1 - r0) * u, r0 + (r1 - r0) * u, t);
    }
    return d;
  }

  // ---------- helms (head frame) ----------
  const HELMS = {
    horned_helm(d) {
      // Dome (primary) with a gold brow band and nose guard; big gold horns sweeping up and out.
      d.ellipse(1, -17.5, 11.8, 8.5, 'P').rect(-10, -17, -4, -8, 'P');
      clearFace(d, -18);
      d.rect(11, -18, 11, -13, 'P');
      d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 2, 1);
      d.hline(-10, 12, -18, 'A').hline(-10, 11, -19, 'a');
      d.set(-2, -23, 'Y').set(3, -24, 'Y').set(7, -22, 'Y').set(-6, -20, 'Y');
      stroke(d, [7, -23], [14, -25], [14, -34], 2.1, 0.7, 'A');
      stroke(d, [-5, -23], [-12, -25], [-12, -34], 2.1, 0.7, 'A');
      d.shade('A', 'B', 'a', ['A', 'B', 'a'], 1, 1);
      d.rect(6, -6, 9, -4, 'S').set(10, -5, 'S').set(7, -3, 'S').set(8, -3, 'S');   // goatee
    },
    topknot(d) {
      // Dark hair (accent deep) with a hairline at the brow, bun on top, cream headband with trailing tails.
      d.ellipse(1, -17, 11.3, 8, 'c').rect(-10, -17, -5, -8, 'c');
      clearFace(d, -19);
      d.ellipse(-2, -27, 4.2, 3.6, 'c');
      for (const [x, y] of [[-6, -22], [-3, -24], [1, -24], [5, -23], [-8, -17], [-8, -13], [-4, -29], [-1, -29]]) d.set(x, y, 'a');
      d.hline(-10, 11, -19, 'S').hline(-10, 10, -20, 'T');
      d.rect(-3, -25, -1, -24, 'S');
      stroke(d, [-10, -19], [-13, -18], [-16, -13], 0.9, 0.6, 'S');
      stroke(d, [-10, -19], [-12, -15], [-14, -10], 0.8, 0.5, 's');
    },
    goggles_mohawk(d) {
      // Mohawk spikes (primary), goggles on the forehead: lime strap (secondary), dark lens (accent).
      d.ellipse(0, -23, 8, 3, 'P');
      [[-7, -29], [-4, -33], [0, -35], [4, -33], [7, -29]].forEach(([x, y], i) => d.poly([[x - 2.6, -23], [x + 2.6, -23], [x + 0.8, y]], i % 2 ? 'P' : 'Q'));
      d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 1, 0);
      d.hline(-11, 11, -20, 'S').hline(-11, 11, -19, 's');
      d.ellipse(7, -21, 3.6, 3, 'g').ellipse(7, -21, 2.4, 1.9, 'A');
      d.set(6, -22, 'B').set(7, -22, 'T');
    },
    monocle_tophat(d) {
      // Top hat (accent) with a gold band (secondary) and a wide brim; grey sideburns; gold monocle on the far eye.
      d.rect(-7, -36, 8, -22, 'A');
      d.shade('A', 'B', 'a', ['A', 'B', 'a'], 2, 0);
      d.hline(-7, 8, -36, 'B');
      d.rect(-7, -25, 8, -24, 'S').hline(-7, 8, -24, 's');
      d.hline(-12, 12, -21, 'A').hline(-11, 13, -20, 'a');
      d.rect(-9, -19, -5, -10, 'w').set(-5, -10, 'M').set(-9, -10, 'M');
      for (const [x, y] of [[7, -17], [8, -17], [9, -17], [10, -16], [10, -15], [10, -14], [10, -13], [7, -11], [8, -11], [9, -11], [6, -16], [6, -15], [6, -14], [6, -13], [6, -12]]) d.set(x, y, 'Y');
      d.line(7, -10, 4, -3, 'y');
      d.hline(5, 10, -10, 'w').set(4, -9, 'w').set(11, -9, 'w').set(4, -10, 'M').set(11, -10, 'M');   // handlebar moustache
    },
    great_helm(d) {
      // Bucket helm (secondary steel) over the whole head: visor slit at eye height, mouth grille, orange crest.
      d.ellipse(1.5, -14, 11.5, 11, 'S').rect(-9, -15, 12, -3, 'S');
      d.shade('S', 'T', 's', ['S', 'T', 's'], 2, 1);
      d.rect(2, -15, 12, -13, 'O');                                       // visor slit (eyes show through)
      d.rect(5, -9, 11, -6, 'O').set(7, -8, 's').set(9, -8, 's');         // grille (mouth shows through)
      d.hline(-9, 12, -18, 'e').vline(1, -12, -3, 's');
      d.poly([[-8, -25], [5, -26], [8, -30], [-1, -32], [-11, -28]], 'P');
      d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 1, 1);
    },
    big_helmet(d) {
      // Oversized rookie helmet (primary) with a blue racing stripe and a small visor peak.
      d.ellipse(1, -20, 13, 10.5, 'P').rect(-12, -20, -6, -8, 'P');
      clearFace(d, -18);
      d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 2, 1);
      for (let x = -10; x <= 11; x++) d.set(x, -30 + Math.round(((x - 1) / 12) ** 2 * 9), 'S').set(x, -29 + Math.round(((x - 1) / 12) ** 2 * 9), 's');
      d.hline(3, 16, -18, 'A').hline(5, 16, -17, 'a');
      d.set(-6, -24, 'Q').set(-5, -26, 'Q').set(-7, -22, 'Q');
      d.ellipse(-8, -11, 1.6, 1.6, 'S');
      d.line(-6, -9, -1, -4, 'a');                                         // chin strap
      d.set(3, -11, 'k').set(5, -11, 'k').set(4, -10, 'k').set(8, -11, 'k').set(10, -11, 'k');   // freckles
    },
    crown(d) {
      // Gold crown with four points and red jewels over swept-back hair.
      d.ellipse(0, -17, 10.5, 6, 'x').rect(-10, -17, -5, -9, 'x');
      clearFace(d, -19);
      d.rect(-9, -21, 11, -18, 'Y');
      for (const x of [-8, -3, 2, 7]) d.poly([[x - 1.5, -21], [x + 2.5, -21], [x + 0.5, -27]], 'Y');
      d.shade('Y', null, 'y', ['Y', 'y'], 1, 0);
      d.hline(-9, 11, -18, 'y');
      for (const x of [-7, -2, 3, 8]) d.set(x, -20, 'R');
      d.set(-6, -15, 'z').set(-8, -12, 'z');
    },
    hood(d) {
      // Deep hood (primary) framing the face, shadowed rim, drape behind the neck.
      d.ellipse(0, -14, 12, 11.5, 'P').rect(-12, -14, -4, 2, 'P');
      clearFace(d, -19);
      for (const key of [...d.p.keys()]) { const [x, y] = key.split(',').map(Number); if (x >= -1 && y > -19 && x < 1) d.p.delete(key); }
      d.shade('P', 'Q', 'p', ['P', 'Q', 'p'], 2, 1);
      d.hline(0, 11, -19, 'd').vline(-2, -18, -6, 'd');
      d.line(-10, -10, -9, 0, 'p').line(-6, -12, -6, 1, 'p');
    },
  };
  function helm(id) { const d = new Px(); HELMS[id](d); return d.outline(); }

  // ---------- weapons (socket at 0,0, blade up) ----------
  const WEAPONS = {
    greatsword(d) {
      // 110 px long: wide blade with a fuller, broad crossguard, wrapped grip, pommel.
      d.poly([[-3, -8], [3, -8], [3, -96], [0, -101], [-3, -96]], 'M');
      d.vline(-2, -8, -96, 'G').vline(-3, -9, -95, 'G');
      d.vline(2, -8, -96, 'm');
      d.vline(0, -12, -90, 'g');                           // fuller
      d.rect(-7, -8, 7, -6, 'A').hline(-7, 7, -8, 'B').set(-8, -7, 'A').set(8, -7, 'A');
      d.rect(-1, -5, 1, 5, 'x').set(0, -4, 'X').set(0, -1, 'X').set(0, 2, 'X');
      d.rect(-2, 6, 2, 8, 'A').set(-1, 6, 'B');
    },
    katana(d) {
      // Slight curve toward +x near the tip; round tsuba; wrapped grip.
      for (let y = -8; y >= -92; y--) {
        const k = (-8 - y) / 84, off = Math.round(3.5 * k * k);
        d.set(off - 1, y, 'G').set(off, y, 'M').set(off + 1, y, y < -88 ? 'M' : 'm');
      }
      d.set(4, -93, 'G').set(3, -93, 'M');
      d.ellipse(0, -7, 3.6, 1.6, 'A').set(-2, -7, 'B');
      d.rect(-1, -5, 1, 10, 'S').set(0, -3, 's').set(0, 0, 's').set(0, 3, 's').set(0, 6, 's');
      d.rect(-1, 10, 1, 11, 'A');
    },
    rapier(d) {
      // Needle blade, gold cup guard and knuckle bow.
      d.vline(0, -8, -98, 'G').vline(1, -8, -95, 'm');
      d.ellipse(0, -6, 4.5, 2.2, 'Y').ellipse(0, -6, 2.5, 1, 'y');
      d.line(4, -5, 4, 3, 'Y').line(4, 3, 2, 5, 'Y');
      d.rect(-1, -4, 1, 4, 'x').set(0, -2, 'X').set(0, 1, 'X');
      d.ellipse(0, 6, 1.6, 1.6, 'Y');
    },
    sawblade(d) {
      // Pole with a spinning saw disc on top (primary hub, steel teeth).
      d.rect(-1, -48, 1, 8, 'g').vline(-1, -48, 8, 'm');
      d.rect(-2, 2, 2, 3, 'S').rect(-2, -2, 2, -1, 'S');
      const cy = -56;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, x = Math.round(Math.cos(a) * 11.5), y = Math.round(cy + Math.sin(a) * 11.5);
        d.ellipse(x, y, 1.6, 1.6, 'm');
      }
      d.ellipse(0, cy, 10.5, 10.5, 'M');
      d.shade('M', 'G', 'm', ['M', 'G', 'm'], 2, 1);
      d.ellipse(0, cy, 4.5, 4.5, 'P').ellipse(0, cy, 1.6, 1.6, 'A');
      d.line(-6, cy - 3, -3, cy - 7, 'G');
    },
    cleaver(d) {
      // Broad chopping blade with a hang hole; riveted wooden handle.
      d.poly([[-5, -8], [6, -8], [7, -64], [-5, -66]], 'M');
      d.vline(-5, -8, -66, 'G').vline(-4, -9, -65, 'G');
      d.vline(6, -9, -63, 'm');
      d.ellipse(1, -58, 2, 2, null);
      d.hline(-4, 5, -12, 'm');
      d.rect(-2, -7, 2, 9, 'X').vline(2, -7, 9, 'x').set(0, -4, 'Y').set(0, 2, 'Y').set(0, 7, 'Y');
    },
    wooden_sword(d) {
      // Practice sword: wooden blade with grain, rounded tip, simple guard.
      d.poly([[-2, -8], [2, -8], [2, -60], [0, -63], [-2, -60]], 'X');
      d.vline(-2, -8, -60, 'Y').vline(2, -8, -60, 'x');
      for (let y = -14; y > -58; y -= 9) d.set(0, y, 'x').set(0, y - 1, 'x');
      d.rect(-5, -7, 5, -6, 'x').hline(-5, 5, -7, 'X');
      d.rect(-1, -5, 1, 6, 'S').set(0, -3, 's').set(0, 0, 's').set(0, 3, 's');
      d.rect(-1, 7, 1, 8, 'x');
    },
  };
  function weapon(id) { const d = new Px(); WEAPONS[id](d); return d.outline(); }

  // ---------- emblems (chest, ~9 px) ----------
  const EMBLEMS = {
    skull: (d) => { d.ellipse(0, -1, 4, 3.6, 'Y').rect(-2, 2, 2, 3, 'Y'); d.rect(-2, -1, -1, 0, 'O').rect(1, -1, 2, 0, 'O').set(0, 2, 'O').set(-1, 3, 'y').set(1, 3, 'y'); },
    lotus: (d) => { d.poly([[0, -5], [2, 0], [0, 3], [-2, 0]], 'S'); d.poly([[-5, -2], [-1, 1], [-1, 3], [-4, 2]], 'T'); d.poly([[5, -2], [1, 1], [1, 3], [4, 2]], 's'); d.hline(-3, 3, 3, 'A'); },
    bolt: (d) => d.poly([[1, -5], [-3, 1], [0, 1], [-1, 5], [3, -1], [0, -1]], 'S').set(0, -2, 'T'),
    quill: (d) => { d.poly([[3, -5], [1, -2], [-2, 3], [-1, 3], [2, -1]], 'W'); d.line(-2, 3, -3, 5, 'S'); d.set(2, -4, 'w'); },
    shield: (d) => { d.poly([[-4, -4], [4, -4], [4, 0], [0, 5], [-4, 0]], 'P'); d.vline(0, -4, 4, 'A').hline(-4, 4, -1, 'A'); d.set(-3, -3, 'Q'); },
    eye: (d) => { d.ellipse(0, 0, 5, 3, 'W').ellipse(0, 0, 2.2, 2.2, 'A').rect(0, -1, 0, 0, 'O').set(-1, -1, 'W'); d.hline(-3, 3, -3, 'S'); },
    flame: (d) => { d.poly([[0, -6], [3, -2], [4, 2], [2, 5], [-2, 5], [-4, 2], [-3, -1], [-1, 0]], 'R'); d.poly([[0, -2], [2, 1], [1, 4], [-1, 4], [-2, 2]], 'Y'); },
    star: (d) => d.poly([[0, -5], [1.4, -1.6], [5, -1.4], [2.2, 1], [3.2, 5], [0, 2.8], [-3.2, 5], [-2.2, 1], [-5, -1.4], [-1.4, -1.6]], 'S').set(0, -2, 'T').set(-1, -1, 'T'),
  };
  function emblem(id) { const d = new Px(); EMBLEMS[id](d); return d.outline(); }

  // ---------- assembly ----------
  function partFor(node, face, skin) {
    const b = skin.build;
    switch (node.part) {
      case 'torso': return torso(b);
      case 'upperArm': return upperArm(b, b === 'heavy');
      case 'forearm': return forearm(b);
      case 'hand': return hand(b);
      case 'thigh': return thigh(b);
      case 'shin': return shin(b);
      case 'foot': return foot(b);
      case 'head': return head();
      case 'helm': return helm(skin.head);
      case 'weapon': return weapon(skin.weapon);
      case 'emblem': return emblem(skin.emblem);
      case 'eyes': return facePart(face, 'eyes');
      case 'brows': return facePart(face, 'brows');
      case 'mouth': return facePart(face, 'mouth');
    }
    return null;
  }

  function toCanvas(px, colors) {
    const b = px.bounds();
    const c = document.createElement('canvas');
    c.width = b.x1 - b.x0 + 1; c.height = b.y1 - b.y0 + 1;
    const g = c.getContext('2d');
    for (const [key, t] of px.p) {
      const [x, y] = key.split(',').map(Number);
      const col = colors[t];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x - b.x0, y - b.y0, 1, 1);
    }
    return { canvas: c, ox: b.x0, oy: b.y0, colors: px.p.size };
  }

  // worldTransforms(), ported from apps/web/src/arena/manifest.ts (units → px at the end).
  const rad = (d) => (d * Math.PI) / 180;
  function worldTransforms(build, pose) {
    const m = window.BUILDS[build];
    const byId = new Map(m.nodes.map((n) => [n.id, n]));
    const out = {};
    const solve = (id) => {
      if (out[id]) return out[id];
      const n = byId.get(id);
      let xf;
      if (n.parent === null) xf = { x: pose.root.x + n.pos[0], y: pose.root.y + n.pos[1], rot: pose.root.rot };
      else {
        const p = solve(n.parent), c = Math.cos(rad(p.rot)), s = Math.sin(rad(p.rot));
        const rot = n.part === 'weapon' ? pose.weaponWorld : p.rot + (pose.rot[id] ?? 0);
        xf = { x: p.x + n.pos[0] * c - n.pos[1] * s, y: p.y + n.pos[0] * s + n.pos[1] * c, rot };
      }
      return (out[id] = xf);
    };
    m.nodes.forEach((n) => solve(n.id));
    if (pose.grounded) {
      const sole = Number(m.foot.anchors?.sole ?? 22);
      let low = -Infinity;
      for (const n of m.nodes) {
        if (n.part !== 'foot') continue;
        const f = out[n.id], c = Math.cos(rad(f.rot)), s = Math.sin(rad(f.rot));
        for (const lx of [-24, 46]) low = Math.max(low, f.y + lx * s + sole * c);
      }
      if (Number.isFinite(low) && low !== 0) for (const k of Object.keys(out)) out[k] = { ...out[k], y: out[k].y - low };
    }
    return out;
  }

  const VICTORY = (idle) => ({ ...idle, face: 'smug', weaponWorld: 8, rot: { ...idle.rot, upperArmF: -160, forearmF: -6, upperArmB: 30, forearmB: 6, torso: 0, head: 2 } });
  function poseFor(build, name) {
    const ps = window.BUILDS[build].poses;
    return name === 'victory' ? VICTORY(ps.idle) : ps[name];
  }

  /** Draw a posed fighter into ctx at native pixel resolution (1 px = 4 units), feet midpoint at (fx, fy). */
  function drawFighter(ctx, skin, poseName, fx, fy, facing = 1, faceOverride) {
    const pose = poseFor(skin.build, poseName);
    const face = faceOverride || pose.face;
    const xfs = worldTransforms(skin.build, pose);
    const nodes = [...window.BUILDS[skin.build].nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    const front = colorMap(skin.palette), back = colorMap(skin.palette, 0.8);
    ctx.imageSmoothingEnabled = false;
    for (const n of nodes) {
      if (!n.part) continue;
      const px = partFor(n.part === 'eyes' || n.part === 'brows' || n.part === 'mouth' ? n : n, face, skin);
      if (!px || px.p.size === 0) continue;
      const t = toCanvas(px, n.tint === 'back' ? back : front);
      const xf = xfs[n.id], c = Math.cos(rad(xf.rot)), s = Math.sin(rad(xf.rot));
      const X = xf.x / U, Y = xf.y / U;
      ctx.setTransform(facing * c, s, -facing * s * 1, c, fx + facing * X, fy + Y);
      // mirrored: x' = facing*(x*c - y*s), y' = x*s + y*c
      if (facing === -1) ctx.setTransform(-c, s, s, c, fx - X, fy + Y);
      ctx.drawImage(t.canvas, t.ox, t.oy);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  window.PixelFighters = { drawFighter, partFor, colorMap, toCanvas, Px, BUILD, HELMS, WEAPONS, EMBLEMS, FACES, U, ramp };
})();
