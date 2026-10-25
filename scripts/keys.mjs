#!/usr/bin/env node
// En Garde key setup (PRD §8.11, §17.2 H-01..H-06). No dependencies.
//   node scripts/keys.mjs            fill blanks in .env interactively (Enter skips; input is hidden)
//   node scripts/keys.mjs --check    print status per service; exit 1 if a MUST key is missing
//   node scripts/keys.mjs --live     with --check: ping ElevenLabs to validate the key
import { existsSync, readFileSync, writeFileSync, chmodSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV = join(root, '.env');
const EXAMPLE = join(root, '.env.example');

// secret: hidden on entry. gen: auto-generated random hex. must: required for the gate shown.
const SERVICES = [
  { name: 'Factory Droid', gate: 'G0', must: true, id: 'H-01',
    how: 'https://app.factory.ai -> Settings -> API keys. Then: install the `droid` CLI, `python3 -m pip install sympy`, run `npx tsx scripts/list-models.ts`, and fill FC_MODEL_* (never commit them).',
    keys: [['FACTORY_API_KEY', { secret: true, must: true }],
      ...['VEX', 'SAGE', 'GLITCH', 'QUILL', 'BRICK', 'PIP'].map((n) => [`FC_MODEL_${n}`, { must: true }]),
      ['FC_TIER_STANDARD_MODEL', { must: true }], ['FC_TIER_PRO_MODEL', { must: true }]] },
  { name: 'Director + Bookie secrets (local)', gate: 'G0', must: true, id: 'auto',
    how: 'Generated locally; nothing to sign up for.',
    keys: [['FC_DIRECTOR_TOKEN', { gen: 32, must: true }], ['FC_BOOKIE_HMAC', { gen: 32 }]] },
  { name: 'SpacetimeDB', gate: 'G1', must: true, id: 'H-02',
    how: 'curl -sSf https://install.spacetimedb.com | sh ; spacetime login ; confirm Maincloud db `fightcard`. Then `npm run claim-runner` writes FC_STDB_TOKEN. For Maincloud set FC_STDB_URI and VITE_STDB_URI to wss://maincloud.spacetimedb.com.',
    keys: [['FC_STDB_TOKEN', { secret: true, must: true }]] },
  { name: 'Coinbase CDP / x402 (Base Sepolia) - deferred', gate: 'later', must: false, id: 'H-03',
    how: 'https://portal.cdp.coinbase.com -> API Keys (id + secret) and Server Wallet -> Wallet Secret. Faucet test USDC at https://portal.cdp.coinbase.com/products/faucet. Then set FC_PAYMENTS=testnet.',
    keys: [['CDP_API_KEY_ID', { secret: true }], ['CDP_API_KEY_SECRET', { secret: true }], ['CDP_WALLET_SECRET', { secret: true }]] },
  { name: 'ElevenLabs - deferred', gate: 'later', must: false, id: 'H-04',
    how: 'https://elevenlabs.io/app/settings/api-keys. Pick 7 voices at https://elevenlabs.io/app/voice-library and paste their voice IDs.',
    keys: [['ELEVENLABS_API_KEY', { secret: true }],
      ...['VEX', 'SAGE', 'GLITCH', 'QUILL', 'BRICK', 'PIP', 'ANNOUNCER'].map((n) => [`ELEVENLABS_VOICE_${n}`, {}])] },
  { name: 'Public URLs (Vercel / cloudflared)', gate: 'G3', must: false, id: 'H-05',
    how: 'cloudflared is installed: `cloudflared tunnel --url http://localhost:8788` -> FC_PUBLIC_RUNNER_URL; web tunnel/Vercel URL -> FC_PUBLIC_WEB_URL and VITE_PUBLIC_WEB_URL.',
    keys: [['FC_PUBLIC_WEB_URL', {}], ['VITE_PUBLIC_WEB_URL', {}], ['FC_PUBLIC_RUNNER_URL', {}]] },
  { name: 'Fetch.ai Agentverse - deferred', gate: 'later', must: false, id: 'H-06',
    how: 'https://agentverse.ai -> Profile -> API Keys. Skip unless Q-006 = yes.',
    keys: [['AGENTVERSE_API_KEY', { secret: true }]] },
  { name: 'Direct fallback engine (optional)', gate: 'G2', must: false, id: '-',
    how: 'Any OpenAI-compatible endpoint, used when FC_ENGINE=direct.',
    keys: [['FC_DIRECT_BASE_URL', {}], ['FC_DIRECT_API_KEY', { secret: true }], ['FC_DIRECT_MODEL', {}]] },
];

const parse = (text) => Object.fromEntries(text.split('\n').flatMap((l) => {
  const m = l.match(/^([A-Z0-9_]+)=([^#]*?)\s*(#.*)?$/); return m ? [[m[1], m[2]]] : [];
}));
const setVar = (text, k, v) => new RegExp(`^${k}=`, 'm').test(text)
  ? text.replace(new RegExp(`^${k}=[^#\\n]*?(\\s*#.*)?$`, 'm'), (_, c) => `${k}=${v}${c ? ' ' + c.trim() : ''}`)
  : text.replace(/\n?$/, `\n${k}=${v}\n`);

if (!existsSync(ENV)) { copyFileSync(EXAMPLE, ENV); console.log('created .env from .env.example'); }
chmodSync(ENV, 0o600);
let text = readFileSync(ENV, 'utf8');
const args = process.argv.slice(2);

// Local random secrets need no account: fill them on every run.
for (const s of SERVICES) for (const [k, o] of s.keys) {
  if (o.gen && !parse(text)[k]) { text = setVar(text, k, randomBytes(o.gen).toString('hex')); writeFileSync(ENV, text); console.log(`generated ${k}`); }
}

// ADR-023: H0 runs low-cost models only. Warn on anything that looks like a frontier model.
const FRONTIER = /(opus|fable|gpt-6|gpt-5\.[56]|gemini-4|gemini-3\.1-pro|kimi-k3|-max$|grok|muse|beam|astra|-pro$|-sol)/i;
function frontierWarnings() {
  const v = parse(text);
  return Object.entries(v).filter(([k, x]) => /^FC_(MODEL|TIER)_/.test(k) && FRONTIER.test(x)).map(([k, x]) => `${k}=${x}`);
}

function report() {
  const vals = parse(text); let missing = 0;
  for (const s of SERVICES) {
    const blank = s.keys.filter(([k]) => !vals[k]).map(([k]) => k);
    const mustBlank = s.keys.filter(([k, o]) => o.must && !vals[k]);
    missing += mustBlank.length;
    const mark = !blank.length ? 'OK  ' : mustBlank.length ? 'MISS' : 'skip';
    console.log(`${mark} ${s.gate} ${s.id.padEnd(4)} ${s.name}${blank.length ? `  (blank: ${blank.join(', ')})` : ''}`);
  }
  return missing;
}

async function live() {
  const k = parse(text).ELEVENLABS_API_KEY; if (!k) return;
  const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': k } }).catch(() => null);
  console.log(`ElevenLabs live check: ${r ? (r.ok ? 'valid' : `rejected (${r.status})`) : 'network error'}`);
}

if (args.includes('--check')) {
  const missing = report();
  const fw = frontierWarnings();
  if (fw.length) console.log(`\nWARN frontier-looking models (ADR-023 says low-cost only): ${fw.join(', ')}`);
  if (args.includes('--live')) await live();
  console.log(missing ? `\n${missing} MUST key(s) blank. Run: node scripts/keys.mjs` : '\nAll MUST keys set.');
  process.exit(missing ? 1 : 0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (q, secret) => new Promise((res) => {
  if (!secret) return rl.question(q, res);
  const w = rl._writeToOutput; rl._writeToOutput = (s) => { if (s.includes(q)) w.call(rl, s); };
  rl.question(q, (a) => { rl._writeToOutput = w; process.stdout.write('\n'); res(a); });
});

for (const s of SERVICES) {
  const vals = parse(text);
  const todo = s.keys.filter(([k]) => !vals[k]);
  if (!todo.length) continue;
  console.log(`\n== ${s.name}  [${s.gate}, ${s.id}${s.must ? ', MUST' : ', optional'}]\n${s.how}`);
  for (const [k, o] of todo) {
    if (o.gen) { text = setVar(text, k, randomBytes(o.gen).toString('hex')); console.log(`  ${k}: generated`); continue; }
    const v = (await ask(`  ${k} (Enter to skip): `, o.secret)).trim();
    if (v) text = setVar(text, k, v);
  }
  writeFileSync(ENV, text); chmodSync(ENV, 0o600);
}
rl.close();
console.log('\n');
report();
