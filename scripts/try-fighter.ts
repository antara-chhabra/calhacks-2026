import { loadEnvFile } from 'node:process';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { HOUSE_ROSTER, type HouseFighterId, type ProblemIdx, type Strategy } from '@fc/contracts';
import { createDroidBackend } from '../apps/runner/src/fighters/droid/index.js';
import { generateProblemSet, checkLive, checkFinal } from '../apps/runner/src/problems/index.js';
import type { FighterIO, FighterRunInput } from '../apps/runner/src/fighters/types.js';

const root = fileURLToPath(new URL('../', import.meta.url));
try { loadEnvFile(join(root, '.env')); } catch { /* caller may provide env */ }
const args = process.argv.slice(2);
const ids: HouseFighterId[] = args.includes('--all') ? ['vex', 'sage', 'quill', 'brick'] : [(!args[0] || args[0].startsWith('--') ? 'vex' : args[0]) as HouseFighterId];
if (ids.some((id) => !Object.hasOwn(HOUSE_ROSTER, id))) throw new Error('Choose a house fighter or --all.');
const value = (flag: string, fallback: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] ?? fallback : fallback;
const seconds = Math.min(180, Math.max(1, Number(value('--seconds', '60')) || 60));
const seed = createHash('sha256').update(value('--seed', '42')).digest('hex').slice(0, 32);
const tier = args.includes('--community') ? value('--community', 'standard') : null;
if (tier && tier !== 'standard' && tier !== 'pro') throw new Error('Choose community tier standard or pro.');
const problems = generateProblemSet(seed).problems;
const backend = createDroidBackend();

function safe(s: string): string {
  for (const [name, value] of Object.entries(process.env)) {
    if (value && /MODEL|KEY|TOKEN|SECRET/i.test(name)) s = s.replaceAll(value, '[private]');
  }
  return s.replace(/[\u0000-\u001f\u007f]/g, ' ');
}

const results = await Promise.all(ids.map(async (id) => {
  const matchId = `try-${randomUUID()}`;
  const sandboxDir = join(root, '.arena', 'sandboxes', matchId, id);
  const persona = await readFile(join(root, 'agents', 'house', `${id}.md`), 'utf8');
  const strategy = JSON.parse(await readFile(join(root, 'agents', 'house', `${id}.strategy.json`), 'utf8')) as Strategy;
  const input: FighterRunInput = {
    matchId, fighter: tier ? { ...HOUSE_ROSTER[id], id: `f_try_${tier}` } : HOUSE_ROSTER[id], origin: tier ? 'community' : 'house', persona, strategy,
    modelId: process.env[tier ? `FC_TIER_${tier.toUpperCase()}_MODEL` : `FC_MODEL_${id.toUpperCase()}`] ?? null,
    reasoningEffort: process.env[`FC_EFFORT_${id.toUpperCase()}`] ?? null,
    problems: problems.map(({ idx, difficulty, points, integrand, statementTex }) => ({ idx, difficulty, points, integrand, statementTex })),
    timeLimitMs: seconds * 1000, deadlineAt: 0, sandboxDir, endpointUrl: null, submitUrl: null, token: null,
  };
  let denials = 0, submissions = 0, hits = 0, firstSubmissionMs: number | null = null;
  const accepted = new Map<ProblemIdx, string>();
  const attempts = new Map<ProblemIdx, number>();
  const ctrl = new AbortController();
  let deadline = Infinity;
  const io: FighterIO = {
    async submit(idx, answer) {
      if (Date.now() >= deadline || denials >= 3) return { ok: false, points: 0, message: 'Time is up. Submission not scored.' };
      const p = problems.find((p) => p.idx === idx)!;
      const attempt = (attempts.get(idx) ?? 0) + 1;
      if (attempt > 3) return { ok: false, points: 0, message: `No attempts left on P${idx}.` };
      attempts.set(idx, attempt); submissions++;
      firstSubmissionMs ??= Date.now() - (deadline - input.timeLimitMs);
      const verdict = checkLive(p, answer);
      if (verdict.ok) { hits++; accepted.set(idx, answer); }
      const message = verdict.ok ? `HIT on P${idx}: +${p.points} (live check passed). Final review happens after time.` : `MISS on P${idx}: derivative does not match the integrand. −5. Attempts left: ${3 - attempt}.`;
      console.log(safe(`${id} P${idx}: ${answer} → ${message}`));
      return { ok: verdict.ok, points: verdict.ok ? p.points : -5, message };
    },
    async say(text) { console.log(`${id}: taunt received (${text.length} chars)`); return { accepted: true }; },
    activity() { /* do not print raw SDK text */ },
    referee(d) { console.log(`${id}: referee ${d.allowed ? 'allow' : 'deny'} (${d.summary})`); if (!d.allowed && ++denials >= 3) ctrl.abort(); },
    remainingMs: () => Math.max(0, deadline - Date.now()), isOut: () => denials >= 3,
  };
  try {
    await backend.prewarm!(input);
    input.deadlineAt = deadline = Date.now() + input.timeLimitMs;
    const started = Date.now();
    const result = await backend.run(input, io, ctrl.signal);
    const survived = [...accepted].filter(([idx, answer]) => checkFinal(problems.find((p) => p.idx === idx)!, answer).ok).length;
    console.log(JSON.stringify({ fighter: tier ? `community-${tier}` : id, elapsedMs: Date.now() - started, firstSubmissionMs, submissions, hits, survived, denials, ...result }));
    return submissions > 0;
  } catch { console.error(`${id}: private session setup failed; check configuration.`); return false; }
  finally { if (process.env.FC_KEEP_SANDBOX !== '1') await rm(join(root, '.arena', 'sandboxes', matchId), { recursive: true, force: true }); }
}));
if (results.some((ok) => !ok)) process.exitCode = 1;
