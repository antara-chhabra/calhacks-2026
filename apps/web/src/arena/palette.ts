// Palette substitution + id suffixing for part SVG text (art-bible §7.1). Pure: no DOM, no Pixi.
export type Palette = { primary: string; secondary: string; accent: string; skin: string };

/** The four placeholder tokens, upper-case, matched whole-token and case-sensitively. */
export const PLACEHOLDERS: Record<keyof Palette, string> = {
  primary: '#FF00FF', secondary: '#00FFFF', accent: '#FFFF00', skin: '#FFAA88',
};
export const BACK_TINT = 0.8;

const HEX6 = /^#[0-9a-fA-F]{6}$/;
/** Validates a palette colour (also keeps hostile strings out of inlined SVG). */
export function safeHex(c: string, fallback = '#808080'): string {
  return HEX6.test(c) ? c.toUpperCase() : fallback;
}

/** Multiply an #RRGGBB colour's channels by `f` (0..1+), rounding, clamped. */
export function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Pixel-art shade placeholders (light, shadow, deep) next to each base token; see `ramp`. */
export const RAMP_PLACEHOLDERS: Record<keyof Palette, { light: string; shadow: string; deep: string }> = {
  primary: { light: '#FF01FF', shadow: '#FF02FF', deep: '#FF03FF' },
  secondary: { light: '#01FFFF', shadow: '#02FFFF', deep: '#03FFFF' },
  accent: { light: '#FFFF01', shadow: '#FFFF02', deep: '#FFFF03' },
  skin: { light: '#FFAA89', shadow: '#FFAA8A', deep: '#FFAA8B' },
};

const TOKEN = /#(?:FF0[0-3]FF|0[0-3]FFFF|FFFF0[0-3]|FFAA8[89AB])(?![0-9A-Fa-f])/g;

const hexToHsl = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, d / (1 - Math.abs(2 * l - 1)), l];
};
const hslToHex = (h: number, s: number, l: number): string => {
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
};
/** Move a hue toward `target` by at most `deg`, the short way round. */
const toward = (h: number, target: number, deg: number): number => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), deg); };

/**
 * Pixel-art ramp for one palette colour: highlights lean warm (the sunset), shadows lean violet (the arena's
 * ambient), so shading reads as light rather than as darker paint.
 */
export function ramp(hex: string): { base: string; light: string; shadow: string; deep: string } {
  const [h, s, l] = hexToHsl(hex), dark = l < 0.22;
  return {
    base: hex,
    light: hslToHex(toward(h, 48, 12), s * 0.95, l + (dark ? 0.16 : 0.13)),
    shadow: hslToHex(toward(h, 255, 14), Math.min(1, s * 1.05 + 0.04), l - (dark ? 0.07 : 0.15)),
    deep: hslToHex(toward(h, 255, 26), Math.min(1, s * 1.05 + 0.06), l - (dark ? 0.12 : 0.27)),
  };
}

/**
 * Replace the placeholder fills with the skin palette (single pass, so a substituted colour is never
 * re-substituted): the four base tokens, plus the pixel-art ramp tokens derived from them. `tint` multiplies the
 * substituted colours (back limbs use BACK_TINT). Fixed colours (outline, white, steel, tongue) are untouched.
 * Lower-case look-alikes are not placeholders.
 */
export function substitutePalette(svg: string, palette: Palette, tint = 1): string {
  const map: Record<string, string> = {};
  const put = (token: string, c: string) => { map[token] = tint === 1 ? c : darken(c, tint); };
  (Object.keys(PLACEHOLDERS) as (keyof Palette)[]).forEach((k) => {
    const c = safeHex(palette[k]), r = ramp(c), t = RAMP_PLACEHOLDERS[k];
    put(PLACEHOLDERS[k], c); put(t.light, r.light); put(t.shadow, r.shadow); put(t.deep, r.deep);
  });
  return svg.replace(TOKEN, (m) => map[m]!);
}

/** Make every `id="x"` unique (`x-suffix`) and rewrite url(#x) / href="#x" references, so parts can be inlined together. */
export function suffixIds(svg: string, suffix: string): string {
  const ids = new Set<string>();
  for (const m of svg.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]!);
  if (ids.size === 0) return svg;
  const sx = suffix.replace(/[^A-Za-z0-9_-]/g, '_');
  let out = svg.replace(/(\sid=")([^"]+)(")/g, (_m, a, id, b) => `${a}${id}-${sx}${b}`);
  out = out.replace(/url\(#([^)]+)\)/g, (m, id) => (ids.has(id) ? `url(#${id}-${sx})` : m));
  out = out.replace(/(href=")#([^"]+)(")/g, (m, a, id, b) => (ids.has(id) ? `${a}#${id}-${sx}${b}` : m));
  return out;
}

/** Inner markup of an <svg> element (no wrapper), for inlining into a composed SVG. */
export function svgInner(svg: string): string {
  const open = svg.indexOf('>', svg.indexOf('<svg'));
  const close = svg.lastIndexOf('</svg>');
  return open < 0 || close < 0 ? svg : svg.slice(open + 1, close);
}
