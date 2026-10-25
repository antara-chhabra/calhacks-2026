// Fetches the manifest and part SVG text for a skin (shared by the Pixi rig and the SVG portrait). Browser only.
import type { SkinSpec } from '@fc/contracts';
import { HOUSE_ROSTER } from '@fc/contracts';
import type { Manifest, NodeDef } from './manifest';
import { partKeyFor } from './manifest';

/** Only VEX's template exists (A-01). Every other skin uses VEX's heavy parts until A-03 draws the rest. */
export const FALLBACK_SKIN_KEY = 'vex';
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

const manifestCache = new Map<string, Promise<Manifest>>();
export function loadManifest(skinKey: string = FALLBACK_SKIN_KEY): Promise<Manifest> {
  let p = manifestCache.get(skinKey);
  if (!p) {
    p = fetchText(absolute(`fighters/${skinKey}/parts.json`)).then((t) => JSON.parse(t) as Manifest);
    p.catch(() => manifestCache.delete(skinKey));
    manifestCache.set(skinKey, p);
  }
  return p;
}

export type SlotKeys = { head: string; weapon: string; emblem: string };
export type SkinParts = { manifest: Manifest; skinKey: string; slotKeys: SlotKeys; svg: Record<string, string> };

const fileKey = (f: string): string => f.replace(/^.*\//, '').replace(/\.svg$/, '');

/** Slot assets from SkinSpec ids. A head/weapon/emblem with no drawn part falls back to the manifest's own (VEX's). */
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

export async function loadSkinParts(skin: SkinSpec): Promise<SkinParts> {
  const skinKey = FALLBACK_SKIN_KEY;   // build/skin templates other than VEX's do not exist yet
  const manifest = await loadManifest(skinKey);
  const slotKeys = pickSlotKeys(manifest, skin);
  const keys = neededPartKeys(manifest, slotKeys);
  const dir = absolute(`fighters/${skinKey}/`);
  const texts = await Promise.all(keys.map((k) => fetchText(new URL(manifest.parts[k]!.src, dir).href)));
  const svg: Record<string, string> = {};
  keys.forEach((k, i) => { svg[k] = texts[i]!; });
  return { manifest, skinKey, slotKeys, svg };
}
