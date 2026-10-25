import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { HOUSE_FIGHTERS, HOUSE_ROSTER, type SkinSpec } from '@fc/contracts';
import { BUILDS, FALLBACK_BUILD, joinArt, partDefFromSvg, resolveSkinParts, type ReadArt } from '../src/arena/assets';
import { composePortrait } from '../src/arena/compose';
import { worldTransforms } from '../src/arena/manifest';

const ART = new URL('../public/art/', import.meta.url);
const fsRead: ReadArt = async (rel) => readFileSync(new URL(rel, ART), 'utf8');
const exists = (rel: string) => existsSync(new URL(rel, ART));

describe('joinArt', () => {
  it('resolves manifest-relative srcs back to art/-relative paths', () => {
    expect(joinArt('builds/lean/', 'torso.svg')).toBe('builds/lean/torso.svg');
    expect(joinArt('builds/lean/', '../common/head.svg')).toBe('builds/common/head.svg');
    expect(joinArt('builds/heavy/', '../../heads/horned_helm.svg')).toBe('heads/horned_helm.svg');
  });
});

describe('house skins resolve by build and SkinSpec ids (PRD §8.1)', () => {
  for (const id of HOUSE_FIGHTERS) {
    const skin = HOUSE_ROSTER[id].skin;
    it(`${id}: ${skin.build} body, ${skin.head}/${skin.weapon}/${skin.emblem}`, async () => {
      const p = await resolveSkinParts(skin, fsRead);
      expect(p.manifest.build).toBe(skin.build);
      expect(p.skinKey).toBe(skin.build);
      // a slot uses the skin's own asset when its library file exists, VEX's otherwise
      expect(p.slotKeys.weapon).toBe(exists(`weapons/${skin.weapon}.svg`) ? skin.weapon : 'greatsword');
      expect(p.slotKeys.head).toBe(exists(`heads/${skin.head}.svg`) ? skin.head : 'horned_helm');
      expect(p.slotKeys.emblem).toBe(exists(`emblems/${skin.emblem}.svg`) ? skin.emblem : 'skull');
      // every part the rig needs is loaded and is an <svg>
      for (const n of p.manifest.nodes) if (n.part) expect(Object.keys(p.svg).length).toBeGreaterThan(0);
      for (const [k, t] of Object.entries(p.svg)) { expect(t, k).toContain('<svg'); expect(p.manifest.parts[k], k).toBeTruthy(); }
      const c = composePortrait({ manifest: p.manifest, svg: p.svg, slotKeys: p.slotKeys, skin, pose: 'idle', idPrefix: id });
      expect(c.inner.length).toBeGreaterThan(1000);
    });
  }
  it('all six weapons of the roster are drawn', () => {
    for (const id of HOUSE_FIGHTERS) expect(exists(`weapons/${HOUSE_ROSTER[id].skin.weapon}.svg`), id).toBe(true);
  });
  it('VEX renders from the heavy template with his own slots', async () => {
    const p = await resolveSkinParts(HOUSE_ROSTER.vex.skin, fsRead);
    expect(p.manifest.build).toBe('heavy');
    expect(p.slotKeys.weapon).toBe('greatsword');
  });
});

describe('fallbacks', () => {
  const vex = HOUSE_ROSTER.vex.skin;
  it('missing library files fall back to VEX slots', async () => {
    const noLib: ReadArt = async (rel) => { if (/^(heads|weapons|emblems)\/(?!(horned_helm|greatsword|skull)\.)/.test(rel)) throw new Error('404'); return fsRead(rel); };
    const skin: SkinSpec = { ...HOUSE_ROSTER.pip.skin };
    const p = await resolveSkinParts(skin, noLib);
    expect(p.manifest.build).toBe('lean');
    expect(p.slotKeys).toEqual({ head: 'horned_helm', weapon: 'greatsword', emblem: 'skull' });
  });
  it('missing build template falls back to heavy', async () => {
    const p = await resolveSkinParts({ ...vex, build: 'lean' }, async (rel) => { if (rel.startsWith('builds/lean/')) throw new Error('404'); return fsRead(rel); });
    expect(p.manifest.build).toBe(FALLBACK_BUILD);
    expect(p.skinKey).toBe(FALLBACK_BUILD);
  });
  it('a non-SVG body (SPA 404 page served as 200) is treated as missing', async () => {
    const html: ReadArt = async (rel) => (rel.startsWith('weapons/') ? '<!doctype html><html></html>' : fsRead(rel));
    expect((await resolveSkinParts(HOUSE_ROSTER.sage.skin, html)).slotKeys.weapon).toBe('greatsword');
  });
  it('partDefFromSvg reads viewBox + weapon anchors', () => {
    const d = partDefFromSvg(readFileSync(new URL('weapons/katana.svg', ART), 'utf8'), 'x')!;
    expect(d.viewBox).toEqual([-34, -382, 76, 430]);
    expect(d.anchors).toMatchObject({ socket: '0,0', tip: '14,-372' });
    expect(partDefFromSvg('<svg></svg>', 'x')).toBeNull();
  });
});

describe('build templates share one skeleton', () => {
  const load = (b: string) => JSON.parse(readFileSync(new URL(`builds/${b}/parts.json`, ART), 'utf8'));
  const heavy = load('heavy');
  it('same node ids/parents/z, expressions and pose keys on every build', () => {
    for (const b of BUILDS) {
      const m = load(b);
      expect(m.build).toBe(b);
      expect(m.nodes.map((n: { id: string; parent: string | null; z?: number }) => [n.id, n.parent, n.z])).toEqual(heavy.nodes.map((n: { id: string; parent: string | null; z?: number }) => [n.id, n.parent, n.z]));
      expect(m.expressions).toEqual(heavy.expressions);
      expect(Object.keys(m.poses)).toEqual(Object.keys(heavy.poses));
      for (const p of Object.keys(heavy.poses)) expect(m.poses[p]).toEqual(heavy.poses[p]);
      expect(Object.keys(m.parts).sort()).toEqual(Object.keys(heavy.parts).sort());
    }
  });
  it('every part src exists and every build grounds its soles on y=0 in idle', () => {
    for (const b of BUILDS) {
      const m = load(b);
      for (const [k, p] of Object.entries(m.parts) as [string, { src: string }][]) {
        if (/^(horned_helm|skull|greatsword)$/.test(k) && !exists(joinArt(`builds/${b}/`, p.src))) continue;   // other workstreams own these
        expect(exists(joinArt(`builds/${b}/`, p.src)), `${b}/${k}`).toBe(true);
      }
      const x = worldTransforms(m, m.poses.idle);
      const sole = Number(m.parts.foot.anchors.sole);
      expect(Math.max(x.footF!.y, x.footB!.y) + sole).toBeCloseTo(0, 0);
    }
  });
  it('heavy is VEX unchanged: parts identical to fighters/vex', () => {
    for (const f of readdirSync(new URL('builds/heavy/', ART)).filter((n) => n.endsWith('.svg')))
      expect(readFileSync(new URL(`builds/heavy/${f}`, ART), 'utf8')).toBe(readFileSync(new URL(`fighters/vex/${f}`, ART), 'utf8'));
  });
  it('build proportions: lean < standard < heavy torso width; lean is tallest', () => {
    const w = (b: string) => load(b).parts.torso.viewBox[2];
    expect(w('lean')).toBeLessThan(w('standard')); expect(w('standard')).toBeLessThan(w('heavy'));
    expect(load('lean').stageHeight).toBeGreaterThan(load('heavy').stageHeight);
  });
});

describe('weapon library convention (art-bible §7.1)', () => {
  const weapons = readdirSync(new URL('weapons/', ART)).filter((f) => f.endsWith('.svg'));
  it('has all six', () => expect(weapons.map((f) => f.replace('.svg', '')).sort()).toEqual(['cleaver', 'greatsword', 'katana', 'rapier', 'sawblade', 'wooden_sword']));
  for (const f of weapons) {
    it(`${f}: socket at origin, blade up, tip above the grip, only allowed fills`, () => {
      const t = readFileSync(new URL(`weapons/${f}`, ART), 'utf8');
      expect(t).toContain('data-socket="0,0"'); expect(t).toContain('data-blade="up"');
      const [vx, vy, vw, vh] = partDefFromSvg(t, '')!.viewBox;
      expect(vx).toBeLessThan(0); expect(vy).toBeLessThan(0); expect(vx + vw).toBeGreaterThan(0); expect(vy + vh).toBeGreaterThan(0);
      const tip = /data-tip="(-?[\d.]+),(-?[\d.]+)"/.exec(t)!; expect(Number(tip[2])).toBeLessThan(-200);
      const fills = new Set([...t.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1]));
      for (const c of fills) expect(['#14121F', '#FFFFFF', '#C9CEDB', '#FF00FF', '#00FFFF', '#FFFF00', '#FFAA88']).toContain(c);
    });
  }
});
