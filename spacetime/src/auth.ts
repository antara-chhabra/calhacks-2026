// Shared guards for reducers (PRD §8.8, ADR-014). Use these instead of re-implementing runner checks.
import { SenderError } from 'spacetimedb/server';
import type { InferSchema, ReducerCtx } from 'spacetimedb/server';
import type spacetimedb from './schema.js';

/** The reducer context typed by this module's schema. */
export type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

/** The config row (id 0). init inserts it; claim_runner may insert it if init never ran. */
export function getConfig(ctx: Ctx) {
  const cfg = ctx.db.config.id.find(0);
  if (!cfg) throw new SenderError('no_config');
  return cfg;
}

export function isRunner(ctx: Ctx): boolean {
  const cfg = ctx.db.config.id.find(0);
  return !!cfg?.runner && cfg.runner.isEqual(ctx.sender);
}

/** Every runner-only reducer starts with this. */
export function requireRunner(ctx: Ctx): void {
  if (!isRunner(ctx)) throw new SenderError('not_runner');
}

/** Every player reducer starts with this; returns the player row. */
export function requirePlayer(ctx: Ctx) {
  const p = ctx.db.player.identity.find(ctx.sender);
  if (!p) throw new SenderError('not_registered');
  return p;
}
