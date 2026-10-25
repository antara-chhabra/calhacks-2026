import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BACK_TINT, darken, safeHex, substitutePalette, suffixIds, svgInner } from '../src/arena/palette';

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
      expect(out, f).not.toMatch(/#(FF00FF|00FFFF|FFFF00|FFAA88)(?![0-9A-Fa-f])/);
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
