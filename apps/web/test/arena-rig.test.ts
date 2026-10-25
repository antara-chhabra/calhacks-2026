import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { anchorFor, matrixAttr, partKeyFor, poseBounds, resolvePose, worldTransforms, type Manifest } from '../src/arena/manifest';
import { pickSlotKeys, neededPartKeys } from '../src/arena/assets';
import { composePortrait } from '../src/arena/compose';

const m: Manifest = JSON.parse(readFileSync(new URL('../public/art/fighters/vex/parts.json', import.meta.url), 'utf8'));
const slotKeys = { head: 'horned_helm', weapon: 'greatsword', emblem: 'skull' };
const close = (a: number, b: number, d = 0.01) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('manifest → world transforms (matches the A-01 reference composites)', () => {
  it('idle: torso, head and the sword socket land where vex-idle.svg puts them', () => {
    const x = worldTransforms(m, m.poses.idle);
    close(x.torso!.x, 0); close(x.torso!.y, -119.603); close(x.torso!.rot, -2);
    close(x.head!.x, 4.226); close(x.head!.y, -227.816); close(x.head!.rot, -5);
    close(x.thighB!.y, -119.603); close(x.thighB!.rot, 8);
    close(x.forearmF!.x, 68.495); close(x.forearmF!.y, -163.915);
    close(x.weapon!.x, 135.833); close(x.weapon!.y, -154.452);
  });
  it('weapon rotation is the wanted world angle, regardless of ancestors', () => {
    for (const p of ['idle', 'attack', 'ko'] as const) close(worldTransforms(m, m.poses[p]).weapon!.rot, m.poses[p].weaponWorld);
  });
  it('attack: root offset moves everything; ko: root rotates around the feet midpoint', () => {
    const a = worldTransforms(m, m.poses.attack);
    close(a.torso!.x, 70); close(a.torso!.y, -106.725);
    const k = worldTransforms(m, m.poses.ko);
    close(k.torso!.x, -165.954); close(k.torso!.y, -286.337); close(k.torso!.rot, -68);
    close(k.weapon!.x, -278.421); close(k.weapon!.y, -453.414);
  });
  it('children inherit rotation (helm/eyes sit on the head transform)', () => {
    const x = worldTransforms(m, m.poses.idle);
    for (const id of ['helm', 'eyes', 'mouth', 'brows']) { close(x[id]!.x, x.head!.x); close(x[id]!.rot, x.head!.rot); }
  });
  it('matrix attr is a clockwise rotation + translation', () => {
    expect(matrixAttr({ x: 10, y: -20, rot: 90 })).toBe('matrix(0 1 -1 0 10 -20)');
    expect(matrixAttr({ x: 0, y: 0, rot: 36 })).toBe('matrix(0.809 0.588 -0.588 0.809 0 0)');
  });
  it('anchor puts the SVG origin on the node: -viewBox.xy / size', () => {
    expect(anchorFor([-90, -124, 180, 142])).toEqual([0.5, 124 / 142]);
    expect(anchorFor([-30, -6, 60, 60])).toEqual([0.5, 0.1]);
  });
});

describe('parts resolution', () => {
  it('expressions swap by pattern; slot nodes follow the skin', () => {
    const eyes = m.nodes.find((n) => n.id === 'eyes')!;
    expect(partKeyFor(eyes, 'smug', slotKeys)).toBe('eyes-smug');
    expect(partKeyFor(m.nodes.find((n) => n.id === 'weapon')!, 'neutral', slotKeys)).toBe('greatsword');
    expect(partKeyFor(m.nodes.find((n) => n.id === 'helm')!, 'neutral', slotKeys)).toBe('horned_helm');
    expect(partKeyFor(m.nodes.find((n) => n.id === 'hips')!, 'neutral', slotKeys)).toBeNull();
  });
  it('unknown head/weapon/emblem fall back to the manifest slot assets (VEX)', () => {
    const skin = { palette: { primary: '#111111', secondary: '#222222', accent: '#333333', skin: '#444444' }, head: 'crown', weapon: 'katana', emblem: 'bolt', build: 'lean' } as const;
    expect(pickSlotKeys(m, skin)).toEqual(slotKeys);
    expect(pickSlotKeys(m, { ...skin, head: 'horned_helm' }).head).toBe('horned_helm');
  });
  it('lists every expression variant', () => {
    const keys = neededPartKeys(m, slotKeys);
    for (const e of m.expressions.names) for (const p of m.expressions.parts) expect(keys).toContain(`${p}-${e}`);
    expect(keys).toEqual(expect.arrayContaining(['torso', 'head', 'greatsword', 'skull', 'horned_helm']));
  });
  it('victory pose is idle with a raised sword arm and a smug face', () => {
    const v = resolvePose(m, 'victory');
    expect(v.face).toBe('smug'); expect(v.rot.upperArmF).toBeLessThan(m.poses.idle.rot.upperArmF!);
  });
});

describe('portrait composition', () => {
  const skin = { palette: { primary: '#E5383B', secondary: '#22202E', accent: '#F2C14E', skin: '#C98B6B' }, head: 'horned_helm', weapon: 'greatsword', emblem: 'skull', build: 'heavy' } as const;
  const svg: Record<string, string> = {};
  for (const [k, p] of Object.entries(m.parts)) svg[k] = readFileSync(new URL(p.src, new URL('../public/art/fighters/vex/', import.meta.url)), 'utf8');
  it('composes all parts in z-order with palette applied, ids unique, square viewBox', () => {
    const c = composePortrait({ manifest: m, svg, slotKeys, skin, pose: 'idle', idPrefix: 'p1' });
    const vb = c.viewBox.split(' ').map(Number);
    expect(vb[2]).toBe(vb[3]);
    expect(c.inner).not.toMatch(/#FF00FF|#00FFFF|#FFFF00|#FFAA88/);
    expect(c.inner).toContain('#E5383B'); expect(c.inner).toContain('#B72D2F');   // front + back tint
    const ids = [...c.inner.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(c.inner.match(/<g transform=/g)!.length).toBe(m.nodes.filter((n) => n.part).length);
  });
  it('flip mirrors the viewBox; hero crops the sword out', () => {
    const a = composePortrait({ manifest: m, svg, slotKeys, skin, pose: 'idle', idPrefix: 'p' });
    const f = composePortrait({ manifest: m, svg, slotKeys, skin, pose: 'idle', idPrefix: 'p', flip: true });
    const [ax, , aw] = a.viewBox.split(' ').map(Number);
    expect(Number(f.viewBox.split(' ')[0])).toBeCloseTo(-(ax! + aw!), 1);
    const h = composePortrait({ manifest: m, svg, slotKeys, skin, pose: 'hero', idPrefix: 'p' });
    expect(Number(h.viewBox.split(' ')[2])).toBeLessThan(Number(a.viewBox.split(' ')[2]));
  });
  it('bounds contain the head top (320 stage height)', () => {
    const [, y] = poseBounds(m, m.poses.idle, slotKeys);
    expect(y).toBeLessThan(-320);
  });
});
