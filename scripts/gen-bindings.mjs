#!/usr/bin/env node
// Generate SpacetimeDB TypeScript bindings for the web app and the runner (gitignored, PRD §17.4 rule 11).
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = resolve(root, process.env.FC_STDB_MODULE_PATH || 'spacetime');
const targets = ['apps/web/src/module_bindings', 'apps/runner/src/module_bindings'];
const probe = spawnSync('spacetime', ['--version'], { stdio: 'ignore' });
if (probe.error) {
  console.error('gen: `spacetime` CLI not found. Install: curl -sSf https://install.spacetimedb.com | sh');
  process.exit(1);
}
for (const out of targets) {
  const r = spawnSync('spacetime', ['generate', '--lang', 'typescript', '--out-dir', resolve(root, out), '--module-path', modulePath, '--no-config', '-y'], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
