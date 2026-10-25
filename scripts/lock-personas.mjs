// Pin house personas: writes agents/house/personas.lock.json with the sha256 of each .factory/droids/fc-<id>.md.
// Run only for a deliberate persona change, together with a fighter version bump.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ids = ['vex', 'sage', 'glitch', 'quill', 'brick', 'pip'];
const lock = Object.fromEntries(ids.map((id) => {
  const text = readFileSync(join(root, '.factory', 'droids', `fc-${id}.md`), 'utf8').replace(/\r\n/g, '\n');
  return [id, createHash('sha256').update(text).digest('hex')];
}));
writeFileSync(join(root, 'agents', 'house', 'personas.lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
console.log('lock-personas: wrote agents/house/personas.lock.json');
