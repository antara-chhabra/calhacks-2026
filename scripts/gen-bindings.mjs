#!/usr/bin/env node
// Generate SpacetimeDB TypeScript bindings for the web app and the runner (gitignored, PRD §17.4 rule 11).
import { spawnSync } from 'node:child_process';

const targets = ['apps/web/src/module_bindings', 'apps/runner/src/module_bindings'];
const probe = spawnSync('spacetime', ['--version'], { stdio: 'ignore' });
if (probe.error) {
  console.error('gen: `spacetime` CLI not found. Install: curl -sSf https://install.spacetimedb.com | sh');
  process.exit(1);
}
for (const out of targets) {
  const r = spawnSync('spacetime', ['generate', '--lang', 'typescript', '--out-dir', out, '--project-path', 'spacetime', '-y'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
