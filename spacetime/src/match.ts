// Match lifecycle reducers (PRD §8.8). B-02.
import { SenderError, t } from 'spacetimedb/server';
import spacetimedb, { lockTimer } from './schema.js';
import { MarketSpec, PostedEvent, ProblemMeta, Standing } from './types.js';

const notImplemented = (): never => { throw new SenderError('not_implemented'); };

export const create_match = spacetimedb.reducer({ name: 'create_match' }, {
  id: t.string(), category: t.string(), mode: t.string(), isDemo: t.bool(),
  fighterIds: t.array(t.string()), slots: t.array(t.u8()), problems: t.array(ProblemMeta), commitHash: t.string(),
  bettingWindowMs: t.u32(), timeLimitMs: t.u32(), markets: t.array(MarketSpec),
}, notImplemented);                                                                                           // B-02

// Scheduled → auto_lock. The scheduler passes the lock_timer row.
export const auto_lock = spacetimedb.reducer({ name: 'auto_lock', onSchedule: lockTimer },
  { timer: lockTimer.rowType }, notImplemented);                                                              // B-02
export const lock_match = spacetimedb.reducer({ name: 'lock_match' }, { matchId: t.string() }, notImplemented);   // B-02
export const start_match = spacetimedb.reducer({ name: 'start_match' }, { matchId: t.string() }, notImplemented); // B-02
export const post_events = spacetimedb.reducer({ name: 'post_events' },
  { matchId: t.string(), events: t.array(PostedEvent) }, notImplemented);                                     // B-02
export const begin_review = spacetimedb.reducer({ name: 'begin_review' }, { matchId: t.string() }, notImplemented); // B-02
export const finalize_match = spacetimedb.reducer({ name: 'finalize_match' },
  { matchId: t.string(), standings: t.array(Standing) }, notImplemented);                                     // B-02
export const reveal_match = spacetimedb.reducer({ name: 'reveal_match' },
  { matchId: t.string(), problemSetJson: t.string(), salt: t.string() }, notImplemented);                     // B-02
export const void_match = spacetimedb.reducer({ name: 'void_match' },
  { matchId: t.string(), reason: t.string() }, notImplemented);                                               // B-04
