// `npm run claim-runner`: connect with a fresh identity, call claim_runner (ADR-014), store the token in the root .env.
import { chmodSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectRaw } from '../apps/runner/src/stdb.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
const uri = process.env.FC_STDB_URI || 'ws://127.0.0.1:3000';
const db = process.env.FC_STDB_DB || 'fightcard';

function writeToken(token: string) {
  if (!existsSync(envPath)) copyFileSync(resolve(root, '.env.example'), envPath);
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const i = lines.findIndex((l) => /^FC_STDB_TOKEN=/.test(l));
  if (i >= 0) lines[i] = `FC_STDB_TOKEN=${token}`;
  else lines.push(`FC_STDB_TOKEN=${token}`);
  writeFileSync(envPath, lines.join('\n'), { mode: 0o600 });
  chmodSync(envPath, 0o600);
}

async function main() {
  let raw;
  try {
    raw = await connectRaw({ uri, db });   // no token: fresh identity
  } catch (e) {
    if ((e as Error).message === 'bindings_missing') {
      console.error('claim-runner: bindings missing. Run `npm run gen` after O3 publishes B-01.');
    } else {
      console.error(`claim-runner: cannot connect to ${uri} (${db}): ${(e as Error).message}`);
    }
    process.exit(1);
  }
  const fn = raw.conn.reducers?.claimRunner;
  if (typeof fn !== 'function') {
    console.error('claim-runner: bindings have no claimRunner reducer; regenerate with `npm run gen`.');
    process.exit(1);
  }
  try {
    await fn.call(raw.conn.reducers);
  } catch (e) {
    console.error(`claim-runner: ${(e as Error).message}`);   // e.g. runner_already_set
    process.exit(1);
  }
  writeToken(raw.token);
  console.log(`claim-runner: claimed runner identity ${raw.identity}; FC_STDB_TOKEN written to .env (mode 600).`);
  try { raw.conn.disconnect?.(); } catch { /* ignore */ }
  process.exit(0);
}
main().catch((e) => { console.error(`claim-runner: ${(e as Error).message}`); process.exit(1); });
