// House personas are Factory custom droids (.factory/droids/fc-<id>.md): YAML frontmatter + system-prompt body.
// Bettors price fighters on behavior, so each definition is pinned by hash in agents/house/personas.lock.json
// and the runner refuses to start on a silent edit (FC-F-002 fairness).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOUSE_FIGHTERS, type HouseFighterId } from '@fc/contracts';

export const DEFAULT_REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
export const droidPath = (root: string, id: HouseFighterId) => join(root, '.factory', 'droids', `fc-${id}.md`);
export const lockPath = (root: string) => join(root, 'agents', 'house', 'personas.lock.json');

export type HouseDroid = { id: HouseFighterId; name: string; description: string; tools: string[]; body: string; sha256: string };

/** Parse the subset of Factory's droid frontmatter we author: `key: value` lines, values bare, quoted or JSON arrays. */
export function parseDroid(text: string): Omit<HouseDroid, 'id' | 'sha256'> {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) throw new Error('droid file needs YAML frontmatter');
  const fields: Record<string, unknown> = {};
  for (const line of m[1]!.split('\n')) {
    const kv = /^([A-Za-z]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const raw = kv[2]!.trim();
    fields[kv[1]!] = /^["[]/.test(raw) ? JSON.parse(raw) : raw;
  }
  const name = String(fields.name ?? '');
  const description = String(fields.description ?? '');
  const tools = Array.isArray(fields.tools) ? fields.tools.map(String) : [];
  const body = m[2]!.trim();
  // Factory's load-time rules: lowercase name, non-empty body, description under 500 chars.
  if (!/^[a-z0-9_-]+$/.test(name)) throw new Error('droid name must be lowercase letters, digits, - or _');
  if (!body) throw new Error('droid system prompt (body) cannot be empty');
  if (description.length > 500) throw new Error('droid description over 500 characters');
  if (fields.model !== 'inherit') throw new Error('house droids must use model: inherit (model ids live only in .env)');
  return { name, description, tools, body };
}

export function hashDroid(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

export function loadHouseDroid(id: HouseFighterId, root: string = DEFAULT_REPO_ROOT, lock: Record<string, string> | null = readLock(root)): HouseDroid {
  const p = droidPath(root, id);
  if (!existsSync(p)) throw new Error(`missing persona .factory/droids/fc-${id}.md`);
  const text = readFileSync(p, 'utf8');
  const parsed = parseDroid(text);
  if (parsed.name !== `fc-${id}`) throw new Error(`persona fc-${id}.md must be named fc-${id}`);
  const sha256 = hashDroid(text);
  if (lock && lock[id] !== sha256) {
    throw new Error(`persona fc-${id} changed without a lock update; personas must stay fixed across matches (run: node scripts/lock-personas.mjs, then bump the fighter version)`);
  }
  return { id, ...parsed, sha256 };
}

export function readLock(root: string = DEFAULT_REPO_ROOT): Record<string, string> | null {
  const p = lockPath(root);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>) : null;
}

export function loadHouseDroids(root: string = DEFAULT_REPO_ROOT): HouseDroid[] {
  const lock = readLock(root);
  return HOUSE_FIGHTERS.map((id) => loadHouseDroid(id, root, lock));
}
