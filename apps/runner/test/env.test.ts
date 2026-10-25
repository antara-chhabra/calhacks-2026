import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv, redactedEnvSummary } from '../src/env.js';

const base = { FC_DIRECTOR_TOKEN: 'a'.repeat(32), FC_ENGINE: 'mock' };

describe('env', () => {
  it('applies defaults and coerces numbers/booleans', () => {
    const e = loadEnv({ ...base, FC_RUNNER_PORT: '9000', FC_KILL: '1', FC_KEEP_SANDBOX: 'true', FC_ENTRY_FEE_USD: '0.5', FC_STDB_TOKEN: '' });
    expect(e.FC_RUNNER_PORT).toBe(9000);
    expect(e.FC_PUBLIC_PORT).toBe(8788);
    expect(e.FC_KILL).toBe(true);
    expect(e.FC_KEEP_SANDBOX).toBe(true);
    expect(e.FC_ENTRY_FEE_USD).toBe(0.5);
    expect(e.FC_MONEY_MODE).toBe('ledger');
    expect(e.FC_STDB_URI).toBe('ws://127.0.0.1:3000');
    expect(e.FC_STDB_DB).toBe('fightcard');
    expect(e.FC_BET_WINDOW_S).toBe(90);
    expect(e.FC_MATCH_MS).toBe(120000);
    expect(e.FC_DEMO_RESERVE).toBe(6);
    expect(e.FC_STDB_TOKEN).toBeUndefined();
    expect(e.FC_MAX_CREDITS_PER_HOUR).toBeUndefined();
  });

  it('refuses live money mode', () => {
    expect(() => loadEnv({ ...base, FC_MONEY_MODE: 'live' })).toThrow('live mode blocked (Q-011/Q-012)');
    expect(() => loadEnv({ ...base, FC_MONEY_MODE: 'live' })).toThrow(EnvError);
  });

  it('requires FACTORY_API_KEY for droid but not mock', () => {
    expect(() => loadEnv({ FC_DIRECTOR_TOKEN: base.FC_DIRECTOR_TOKEN, FC_ENGINE: 'droid' })).toThrow(/FACTORY_API_KEY/);
    expect(() => loadEnv(base)).not.toThrow();
  });

  it('requires a director token', () => {
    expect(() => loadEnv({ FC_ENGINE: 'mock' })).toThrow(/FC_DIRECTOR_TOKEN/);
  });

  it('accepts only low, medium or high per fighter reasoning effort', () => {
    expect(loadEnv({ ...base, FC_EFFORT_GLITCH: 'high', FC_EFFORT_PIP: 'low' })).toMatchObject({ FC_EFFORT_GLITCH: 'high', FC_EFFORT_PIP: 'low' });
    expect(() => loadEnv({ ...base, FC_EFFORT_VEX: 'maximum' })).toThrow(/FC_EFFORT_VEX/);
  });

  it('redacts secrets and model values', () => {
    const e = loadEnv({
      ...base, FC_STDB_TOKEN: 'tok-SECRET', FACTORY_API_KEY: 'fk-SECRET', FC_MODEL_VEX: 'model-vex-xyz', FC_TIER_PRO_MODEL: 'tier-pro-xyz',
      FC_DIRECT_MODEL: 'direct-xyz', CDP_API_KEY_SECRET: 'cdp-SECRET',
    });
    const text = JSON.stringify(redactedEnvSummary(e));
    for (const bad of ['tok-SECRET', 'fk-SECRET', 'cdp-SECRET', 'model-vex-xyz', 'tier-pro-xyz', 'direct-xyz', 'a'.repeat(32), 'FC_MODEL']) expect(text).not.toContain(bad);
    expect(redactedEnvSummary(e).secretsSet).toMatchObject({ FC_STDB_TOKEN: true, FC_DIRECTOR_TOKEN: true, AGENTVERSE_API_KEY: false });
  });
});
