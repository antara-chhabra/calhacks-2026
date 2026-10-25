import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BACK_TINT, RAMP_PLACEHOLDERS, darken, ramp, safeHex, substitutePalette, suffixIds, svgInner } from '../src/arena/palette';

const pal = { primary: '#E5383B', secondary: '#22202E', accent: '#F2C14E', skin: '#C98B6B' };

describe('palette substitution', () => {
  it('replaces the four placeholders and leaves fixed colours alone', () => {
    const svg = '<path fill="#FF00FF"/><path fill="#00FFFF"/><path fill="#FFFF00"/><path fill="#FFAA88"/><path stroke="#14121F" fill="#FFFFFF"/><path fill="#C9CEDB"/><path fill="#FF6F7D"/>';
    const out = substitutePalette(svg, pal);
    expect(out).toBe('<path fill="#E5383B"/><path fill="#22202E"/><path fill="#F2C14E"/><path fill="#C98B6B"/><path stroke="#14121F" fill="#FFFFFF"/><path fill="#C9CEDB"/><path fill="#FF6F7D"/>');
  });
  it('is case-sensitive and whole-token', () => {
    const svg = '<a fill="#ff00ff"/><b fill="#FF00FF00"/><c fill="#FF00FF"/>';
    expect(substitutePalette(svg, pal)).toBe('<a fill="#ff00ff"/><b fill="#FF00FF00"/><c fill="#E5383B"/>');
  });
  it('is a single pass: a palette colour equal to another placeholder is not re-substituted', () => {
    const out = substitutePalette('<a fill="#FF00FF"/><b fill="#00FFFF"/>', { ...pal, primary: '#00FFFF', secondary: '#FFFF00' });
    expect(out).toBe('<a fill="#00FFFF"/><b fill="#FFFF00"/>');
  });
  it('back tint multiplies only the substituted colours by 0.8', () => {
    expect(BACK_TINT).toBe(0.8);
    expect(darken('#E5383B', 0.8)).toBe('#B72D2F');   // the reference back-limb red from A-01
    expect(darken('#F2C14E', 0.8)).toBe('#C29A3E');
    const out = substitutePalette('<a fill="#FF00FF"/><b fill="#14121F"/>', pal, BACK_TINT);
    expect(out).toBe('<a fill="#B72D2F"/><b fill="#14121F"/>');
  });
  it('rejects non-hex palette values', () => {
    expect(safeHex('red"/><script>')).toBe('#808080');
    expect(safeHex('#abcdef')).toBe('#ABCDEF');
    expect(substitutePalette('<a fill="#FF00FF"/>', { ...pal, primary: '"><x' })).toBe('<a fill="#808080"/>');
  });
  it('substitutes every shipped VEX part with no placeholder left', () => {
    const dir = new URL('../public/art/fighters/vex/', import.meta.url);
    for (const f of ['torso', 'head', 'upperArm', 'forearm', 'hand', 'thigh', 'shin', 'foot', 'eyes-neutral', 'mouth-ko', 'brows-smug']) {
      const out = substitutePalette(readFileSync(new URL(`${f}.svg`, dir), 'utf8'), pal);
      expect(out, f).not.toMatch(/#(FF0[0-3]FF|0[0-3]FFFF|FFFF0[0-3]|FFAA8[89AB])(?![0-9A-Fa-f])/);
    }
  });
  it('pixel ramp tokens take shades derived from their base colour', () => {
    const r = ramp('#E5383B');
    const svg = `<a fill="${RAMP_PLACEHOLDERS.primary.light}"/><b fill="${RAMP_PLACEHOLDERS.primary.shadow}"/><c fill="${RAMP_PLACEHOLDERS.primary.deep}"/>`;
    expect(substitutePalette(svg, pal)).toBe(`<a fill="${r.light}"/><b fill="${r.shadow}"/><c fill="${r.deep}"/>`);
    expect(substitutePalette(`<a fill="${RAMP_PLACEHOLDERS.skin.shadow}"/>`, pal, BACK_TINT)).toBe(`<a fill="${darken(ramp('#C98B6B').shadow, BACK_TINT)}"/>`);
  });
  it('ramps keep light above base above shadow above deep, hue-shifted', () => {
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    for (const c of ['#E5383B', '#2EC4A6', '#8B5CF6', '#3A6FF2', '#FF8A2B', '#FFD23F', '#22202E', '#F1E3C8']) {
      const r = ramp(c);
      expect(lum(r.light), c).toBeGreaterThan(lum(r.base));
      expect(lum(r.base), c).toBeGreaterThan(lum(r.shadow));
      expect(lum(r.shadow), c).toBeGreaterThan(lum(r.deep));
    }
  });
});

describe('id suffixing', () => {
  const svg = '<svg><defs><clipPath id="c1"><path/></clipPath></defs><g clip-path="url(#c1)"/><use href="#c1"/><g fill="url(#other)"/></svg>';
  it('suffixes ids and the references to them only', () => {
    const out = suffixIds(svg, 'forearmB');
    expect(out).toContain('id="c1-forearmB"');
    expect(out).toContain('url(#c1-forearmB)');
    expect(out).toContain('href="#c1-forearmB"');
    expect(out).toContain('url(#other)');
  });
  it('two suffixes of the same part never collide', () => {
    const ids = (s: string) => [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(suffixIds(svg, 'a')).concat(ids(suffixIds(svg, 'b')))).toEqual(['c1-a', 'c1-b']);
  });
  it('svgInner strips the wrapper', () => {
    expect(svgInner('<svg a="1"><g/></svg>')).toBe('<g/>');
  });
});
