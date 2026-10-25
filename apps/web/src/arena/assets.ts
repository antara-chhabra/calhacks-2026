// Fetches the manifest and part SVG text for a skin (shared by the Pixi rig and the SVG portrait). Browser only.
import type { Build, SkinSpec } from '@fc/contracts';
import { HOUSE_ROSTER } from '@fc/contracts';
import type { Manifest, NodeDef, PartDef } from './manifest';
import { partKeyFor } from './manifest';

/** VEX is the fallback fighter; his body is the `heavy` build template, his slots horned_helm / greatsword / skull. */
export const FALLBACK_SKIN_KEY = 'vex';
export const FALLBACK_BUILD: Build = 'heavy';
export const BUILDS: readonly Build[] = ['lean', 'standard', 'heavy'];
export const VEX_SKIN: SkinSpec = HOUSE_ROSTER.vex.skin;

const artBase = (): string => `${import.meta.env.BASE_URL}art/`;
const absolute = (rel: string): string => new URL(rel, new URL(artBase(), window.location.href)).href;

const textCache = new Map<string, Promise<string>>();
function fetchText(url: string): Promise<string> {
  let p = textCache.get(url);
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`arena: ${url} → ${r.status}`); return r.text(); });
    p.catch(() => textCache.delete(url));
    textCache.set(url, p);
  }
  return p;
}

/** Body template directory (relative to art/): `builds/<build>/` holds parts.json + torso/arm/leg parts; `builds/common/` holds head + expressions. */
export const buildDir = (build: Build | string): string => `builds/${build}/`;

export type ReadArt = (relPath: string) => Promise<string>;
const browserRead: ReadArt = (rel) => fetchText(absolute(rel));

/** Resolve a path written relative to `fromDir` (both relative to art/, `..` allowed) back to an art/-relative path. */
export function joinArt(fromDir: string, rel: string): string {
  const u = new URL(rel, `http://art.invalid/${fromDir}`);
  return decodeURIComponent(u.pathname.slice(1));
}

const manifestCache = new Map<string, Promise<Manifest>>();
export function loadManifest(build: Build | string = FALLBACK_BUILD, read: ReadArt = browserRead): Promise<Manifest> {
  const cacheable = read === browserRead;
  let p = cacheable ? manifestCache.get(build) : undefined;
  if (!p) {
    p = read(`${buildDir(build)}parts.json`).then((t) => JSON.parse(t) as Manifest);
    if (cacheable) { p.catch(() => manifestCache.delete(build)); manifestCache.set(build, p); }
  }
  return p;
}

export type SlotKeys = { head: string; weapon: string; emblem: string };
export type SkinParts = { manifest: Manifest; skinKey: string; slotKeys: SlotKeys; svg: Record<string, string> };

const fileKey = (f: string): string => f.replace(/^.*\//, '').replace(/\.svg$/, '');

/** Slot assets from SkinSpec ids. A head/weapon/emblem with no part in the manifest falls back to the manifest's own (VEX's). */
export function pickSlotKeys(m: Manifest, skin: SkinSpec): SlotKeys {
  const pick = (id: string, slot: 'head' | 'weapon' | 'emblem'): string => (m.parts[id] ? id : fileKey(m.slots[slot].file));
  return { head: pick(skin.head, 'head'), weapon: pick(skin.weapon, 'weapon'), emblem: pick(skin.emblem, 'emblem') };
}

/** Every part key a skin may show (all expression variants included). */
export function neededPartKeys(m: Manifest, slotKeys: SlotKeys): string[] {
  const keys = new Set<string>();
  for (const n of m.nodes as NodeDef[]) {
    if (n.partPattern) m.expressions.names.forEach((e) => { const k = partKeyFor(n, e, slotKeys); if (k) keys.add(k); });
    else { const k = partKeyFor(n, m.expressions.default, slotKeys); if (k) keys.add(k); }
  }
  return [...keys];
}

const LIBRARY_DIR = { head: 'heads', weapon: 'weapons', emblem: 'emblems' } as const;

/** PartDef for a library SVG, read from its own viewBox (pivot is the SVG origin, art-bible §7.1). Null if it is not a usable SVG. */
export function partDefFromSvg(svg: string, src: string): PartDef | null {
  const vb = /<svg[^>]*\sviewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some((v) => !Number.isFinite(v)) || vb[2]! <= 0 || vb[3]! <= 0) return null;
  const anchors: Record<string, string | number> = {};
  const sock = /data-socket="([^"]+)"/.exec(svg)?.[1]; if (sock) anchors.socket = sock;
  const tip = /data-tip="([^"]+)"/.exec(svg)?.[1]; if (tip) anchors.tip = tip;
  const len = /data-length="([^"]+)"/.exec(svg)?.[1]; if (len) anchors.length = Number(len);
  return { src, viewBox: [vb[0]!, vb[1]!, vb[2]!, vb[3]!], pivot: [0, 0], anchors };
}

/**
 * Resolve everything a skin needs, by `skin.build` (body) and the SkinSpec ids (head / weapon / emblem).
 * Body: builds/<build>/parts.json, else the heavy template. Slots: the shared library file for the id, else the
 * manifest's own VEX slot. `read` returns the text of an art/-relative path (browser: fetch; tests: fs).
 */
export async function resolveSkinParts(skin: SkinSpec, read: ReadArt): Promise<SkinParts> {
  let build: string = skin.build;
  let manifest: Manifest;
  try { manifest = await loadManifest(build, read); }
  catch { build = FALLBACK_BUILD; manifest = await loadManifest(build, read); }
  manifest = { ...manifest, parts: { ...manifest.parts } };
  const dir = buildDir(build);
  const svg: Record<string, string> = {};

  const slotKeys: SlotKeys = { head: '', weapon: '', emblem: '' };
  await Promise.all((['head', 'weapon', 'emblem'] as const).map(async (slot) => {
    const id = skin[slot];
    const rel = `${LIBRARY_DIR[slot]}/${id}.svg`;
    try {
      const text = await read(rel);
      const def = partDefFromSvg(text, `../../${rel}`);
      if (!def) throw new Error('no viewBox');
      manifest.parts[id] = def; svg[id] = text; slotKeys[slot] = id;
    } catch {
      slotKeys[slot] = fileKey(manifest.slots[slot].file);   // library file missing → VEX's
    }
  }));

  const keys = neededPartKeys(manifest, slotKeys).filter((k) => svg[k] === undefined);
  const texts = await Promise.all(keys.map((k) => read(joinArt(dir, manifest.parts[k]!.src))));
  keys.forEach((k, i) => { svg[k] = texts[i]!; });
  return { manifest, skinKey: build, slotKeys, svg };
}

export function loadSkinParts(skin: SkinSpec): Promise<SkinParts> {
  return resolveSkinParts(skin, browserRead);
}
