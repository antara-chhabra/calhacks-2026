// Betting and ledger reducers (PRD §8.8). B-03.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb from './schema.js';

const notImplemented = (): never => { throw new SenderError('not_implemented'); };

export const credit_test_funds = spacetimedb.reducer({ name: 'credit_test_funds' },
  { identity: t.identity(), amountCents: t.u64() }, notImplemented);                                        // B-03
export const place_bet = spacetimedb.reducer({ name: 'place_bet' },
  { marketId: t.string(), outcome: t.string(), stake: t.u64() }, notImplemented);                            // B-03
