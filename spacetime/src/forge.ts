// Forge and house-fighter reducers (PRD §8.8). B-05.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema.js';
import { ForgeSpec, HouseFighterInput } from './types.js';

const notImplemented = (): never => { throw new SenderError('not_implemented'); };

export const create_fighter = spacetimedb.reducer({ name: 'create_fighter' }, { spec: ForgeSpec }, notImplemented);   // B-05
export const retire_fighter = spacetimedb.reducer({ name: 'retire_fighter' }, { fighterId: t.string() }, notImplemented); // B-05
export const set_payout_address = spacetimedb.reducer({ name: 'set_payout_address' },
  { fighterId: t.string(), address: t.string() }, notImplemented);                                            // B-05
export const upsert_house_fighter = spacetimedb.reducer({ name: 'upsert_house_fighter' },
  { fighter: HouseFighterInput }, notImplemented);                                                            // B-02
