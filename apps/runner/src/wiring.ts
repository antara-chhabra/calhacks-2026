// Runtime graph (PRD §8.9). A plain object O4 consumes; O5/O6 swap implementations behind the interfaces.
import type { FundingAdapter } from '@fc/contracts';
import { loadEnv, type Env } from './env.js';
import { getBackend } from './fighters/registry.js';
import type { FighterBackend } from './fighters/types.js';
import { createFunding } from './funding.js';
import { createPayments, type Payments } from './payments/index.js';
import { connectStdb, type Stdb } from './stdb.js';

export type Runtime = {
  env: Env;
  stdb: Stdb;
  payments: Payments;
  funding: FundingAdapter;
  getBackend: typeof getBackend;
  /** Backend for the env's default house engine. */
  defaultBackend: FighterBackend;
};

export async function wire(env: Env = loadEnv()): Promise<Runtime> {
  const [stdb, payments] = await Promise.all([connectStdb(env), createPayments()]);
  return { env, stdb, payments, funding: createFunding(env.FC_MONEY_MODE), getBackend, defaultBackend: getBackend(env.FC_ENGINE) };
}
