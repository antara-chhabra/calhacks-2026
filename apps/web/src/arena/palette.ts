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

const TOKEN = /#(?:FF00FF|00FFFF|FFFF00|FFAA88)(?![0-9A-Fa-f])/g;

/**
 * Replace the four placeholder fills with the skin palette (single pass, so a substituted colour is never
 * re-substituted). `tint` multiplies the substituted colours (back limbs use BACK_TINT). Fixed colours
 * (outline, white, steel, tongue) are untouched. Lower-case look-alikes are not placeholders.
 */
export function substitutePalette(svg: string, palette: Palette, tint = 1): string {
  const map: Record<string, string> = {};
  (Object.keys(PLACEHOLDERS) as (keyof Palette)[]).forEach((k) => {
    const c = safeHex(palette[k]);
    map[PLACEHOLDERS[k]] = tint === 1 ? c : darken(c, tint);
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
