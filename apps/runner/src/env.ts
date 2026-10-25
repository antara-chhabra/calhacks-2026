// Runner environment (PRD §8.11). Parsed once at boot; secrets and model IDs are never logged (FC-N-020, FC-N-024).
import { z } from 'zod';
import type { MoneyMode } from '@fc/contracts';

/** '' (an unfilled `KEY=` line in .env) is treated as unset. */
const blankToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess(blankToUndef, s.optional());
const str = (def: string) => z.preprocess(blankToUndef, z.string().default(def));
const num = (def: number) => z.preprocess(blankToUndef, z.coerce.number().default(def));
const port = (def: number) => z.preprocess(blankToUndef, z.coerce.number().int().min(0).max(65535).default(def));
const flag = (def: boolean) =>
  z.preprocess((v) => {
    v = blankToUndef(v);
    if (typeof v !== 'string') return v;
    const s = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'off'].includes(s)) return false;
    return v;
  }, z.boolean().default(def));

const schema = z.object({
  // Runtime
  FC_MODE: z.preprocess(blankToUndef, z.enum(['live', 'demo']).default('live')),
  FC_ENGINE: z.preprocess(blankToUndef, z.enum(['droid', 'direct', 'mock']).default('droid')),
  FC_KILL: flag(false),
  FC_MONEY_MODE: z.preprocess(blankToUndef, z.enum(['ledger', 'live']).default('ledger')),
  FC_RUNNER_PORT: port(8787),
  FC_PUBLIC_PORT: port(8788),
  FC_DIRECTOR_TOKEN: z.string({ required_error: 'FC_DIRECTOR_TOKEN is required' }).min(16, 'FC_DIRECTOR_TOKEN must be at least 16 chars (32+ recommended)'),
  FC_PUBLIC_WEB_URL: opt(z.string().url()),
  FC_PUBLIC_RUNNER_URL: opt(z.string().url()),
  // SpacetimeDB
  FC_STDB_URI: str('ws://127.0.0.1:3000'),
  FC_STDB_DB: str('fightcard'),
  FC_STDB_TOKEN: opt(z.string()),
  // Match tuning
  FC_BET_WINDOW_S: num(90),
  FC_INTRO_MS: num(6000),
  FC_MATCH_MS: num(120000),
  FC_COMMUNITY_SLOTS: num(1),
  FC_SEASON: z.preprocess(blankToUndef, z.enum(['on', 'off']).default('off')),
  FC_SEASON_BET_WINDOW_S: num(20),
  FC_KEEP_SANDBOX: flag(false),
  // Factory Droid (models are secret)
  FACTORY_API_KEY: opt(z.string()),
  FC_DROID_EXEC: str('./bin/droid-sandboxed'),
  FC_MODEL_VEX: opt(z.string()),
  FC_MODEL_SAGE: opt(z.string()),
  FC_MODEL_GLITCH: opt(z.string()),
  FC_MODEL_QUILL: opt(z.string()),
  FC_MODEL_BRICK: opt(z.string()),
  FC_MODEL_PIP: opt(z.string()),
  FC_EFFORT_VEX: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_EFFORT_SAGE: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_EFFORT_GLITCH: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_EFFORT_QUILL: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_EFFORT_BRICK: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_EFFORT_PIP: z.preprocess(blankToUndef, z.enum(['low', 'medium', 'high']).optional()),
  FC_TIER_STANDARD_MODEL: opt(z.string()),
  FC_TIER_PRO_MODEL: opt(z.string()),
  FC_MAX_SESSIONS_PER_HOUR: num(120),
  FC_MAX_CREDITS_PER_HOUR: opt(z.coerce.number()),
  FC_DEMO_RESERVE: num(6),
  // Direct fallback
  FC_DIRECT_BASE_URL: opt(z.string()),
  FC_DIRECT_API_KEY: opt(z.string()),
  FC_DIRECT_MODEL: opt(z.string()),
  // Coinbase x402 / CDP
  FC_PAYMENTS: z.preprocess(blankToUndef, z.enum(['off', 'testnet']).default('off')),
  CDP_API_KEY_ID: opt(z.string()),
  CDP_API_KEY_SECRET: opt(z.string()),
  CDP_WALLET_SECRET: opt(z.string()),
  FC_ENTRY_FEE_USD: num(0.01),
  FC_HINT_FEE_USD: num(0.02),
  FC_PURSE_TOPUP_USDC: num(0.05),
  // ElevenLabs (deferred)
  ELEVENLABS_API_KEY: opt(z.string()),
  ELEVENLABS_VOICE_VEX: opt(z.string()),
  ELEVENLABS_VOICE_SAGE: opt(z.string()),
  ELEVENLABS_VOICE_GLITCH: opt(z.string()),
  ELEVENLABS_VOICE_QUILL: opt(z.string()),
  ELEVENLABS_VOICE_BRICK: opt(z.string()),
  ELEVENLABS_VOICE_PIP: opt(z.string()),
  ELEVENLABS_VOICE_ANNOUNCER: opt(z.string()),
  // Fetch.ai (deferred)
  FC_BOOKIE_HMAC: opt(z.string()),
  AGENTVERSE_API_KEY: opt(z.string()),
}).superRefine((e, ctx) => {
  if (e.FC_ENGINE === 'droid' && e.FC_MODE === 'live' && !e.FACTORY_API_KEY) {
    ctx.addIssue({ code: 'custom', path: ['FACTORY_API_KEY'], message: 'FACTORY_API_KEY is required unless FC_ENGINE=mock' });
  }
});

export type Env = z.infer<typeof schema> & { FC_MONEY_MODE: MoneyMode };

export class EnvError extends Error {
  constructor(message: string) { super(message); this.name = 'EnvError'; }
}

/** Parse and validate. Throws EnvError with a message that names keys, never values. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  if (source.FC_MONEY_MODE?.trim().toLowerCase() === 'live') throw new EnvError('live mode blocked (Q-011/Q-012)');
  const r = schema.safeParse(source);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`);
    throw new EnvError(`invalid environment: ${lines.join('; ')}`);
  }
  return r.data as Env;
}

const SECRET_KEYS = [
  'FC_DIRECTOR_TOKEN', 'FC_STDB_TOKEN', 'FACTORY_API_KEY', 'FC_DIRECT_API_KEY', 'CDP_API_KEY_ID', 'CDP_API_KEY_SECRET',
  'CDP_WALLET_SECRET', 'ELEVENLABS_API_KEY', 'FC_BOOKIE_HMAC', 'AGENTVERSE_API_KEY',
] as const;

/** Safe to log: plain config plus a boolean "is it set" for secrets. No secret values, no FC_MODEL_* / tier / direct model values. */
export function redactedEnvSummary(env: Env): Record<string, string | number | boolean | Record<string, boolean>> {
  return {
    mode: env.FC_MODE,
    engine: env.FC_ENGINE,
    moneyMode: env.FC_MONEY_MODE,
    kill: env.FC_KILL,
    runnerPort: env.FC_RUNNER_PORT,
    publicPort: env.FC_PUBLIC_PORT,
    stdbUri: env.FC_STDB_URI,
    stdbDb: env.FC_STDB_DB,
    betWindowS: env.FC_BET_WINDOW_S,
    matchMs: env.FC_MATCH_MS,
    season: env.FC_SEASON,
    payments: env.FC_PAYMENTS,
    secretsSet: Object.fromEntries(SECRET_KEYS.map((k) => [k, Boolean(env[k])])),
  };
}
