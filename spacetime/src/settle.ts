// Settlement and purse reducers (PRD §8.8). B-04.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema.js';
import { EloUpdate, FighterStatsObj, MarketResult } from './types.js';

const notImplemented = (): never => { throw new SenderError('not_implemented'); };

export const settle_match = spacetimedb.reducer({ name: 'settle_match' }, {
  matchId: t.string(), results: t.array(MarketResult), elo: t.array(EloUpdate), stats: t.array(FighterStatsObj),
}, notImplemented);                                                                                           // B-04
export const record_purse = spacetimedb.reducer({ name: 'record_purse' }, {
  matchId: t.string(), fighterId: t.string(), kind: t.string(), amountUsdc: t.f64(), txRef: t.string(),
  network: t.string(), coveredByHouse: t.bool(), to: t.string(),
}, notImplemented);                                                                                           // B-04
export const set_fighter_wallet = spacetimedb.reducer({ name: 'set_fighter_wallet' },
  { fighterId: t.string(), address: t.string() }, notImplemented);                                            // B-04
