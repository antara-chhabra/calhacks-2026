// SpacetimeDB tables (PRD §8.8). Table names snake_case; schema() keys are the camelCase accessors.
// Money is integer US cents (u64 balances/stakes, i64 ledger deltas); `amountUsdc` on purse is testnet USDC (f64).
import { schema, table, t } from 'spacetimedb/server';
import { ProblemMeta, SkinSpec, Strategy } from './types.js';

export const config = table({ name: 'config', public: false }, {
  id: t.u8().primaryKey(),                       // always 0
  runner: t.option(t.identity()),
  season: t.u32(),
  treasuryCents: t.u64(),
  matchCounter: t.u32(),
});

export const player = table({ name: 'player', public: true }, {
  identity: t.identity().primaryKey(),
  handle: t.string().unique(),
  balanceCents: t.u64(),
  createdAt: t.timestamp(),
  lastBetAt: t.option(t.timestamp()),
});

export const fighter = table({ name: 'fighter', public: true }, {
  id: t.string().primaryKey(),
  name: t.string(),
  nameKey: t.string().unique(),                  // lowercased name
  title: t.string(),
  archetype: t.string(),
  origin: t.string(),
  creator: t.option(t.identity()),
  skin: SkinSpec,
  catchphrase: t.string(),
  bio: t.string(),
  strategyBlurb: t.string(),
  version: t.u32(),
  status: t.string(),
  debutPending: t.bool(),
  elo: t.f64(),
  matches: t.u32(),
  lastMatchAt: t.option(t.timestamp()),
  walletAddress: t.option(t.string()),
  payoutAddress: t.option(t.string()),
  createdAt: t.timestamp(),
});

export const fighterSecret = table({ name: 'fighter_secret', public: false }, {
  fighterId: t.string().primaryKey(),
  persona: t.string(),
  strategy: Strategy,
  tier: t.string(),
  endpointUrl: t.option(t.string()),
  uagentAddress: t.option(t.string()),
});

export const fighterStats = table({ name: 'fighter_stats', public: true }, {
  fighterId: t.string().primaryKey(),
  category: t.string(),
  matches: t.u32(), wins: t.u32(), podiums: t.u32(),
  avgScorePct: t.f64(),
  spd: t.f64(), acc: t.f64(), clu: t.f64(), dis: t.f64(), grt: t.f64(), con: t.f64(), ovr: t.f64(),
  form: t.string(),
  streak: t.i32(),
  upsetUntil: t.option(t.timestamp()),
  eloHistory: t.array(t.f64()),
  backersWon: t.u32(),
  earningsUsdc: t.f64(),
});

// Additive per-category history; legacy fighter_stats remains the integral card for existing clients.
export const fighterCategoryStats = table({ name: 'fighter_category_stats', public: true }, {
  id: t.string().primaryKey(), // fighterId:category
  fighterId: t.string().index('btree'),
  elo: t.f64(),
  category: t.string(),
  matches: t.u32(), wins: t.u32(), podiums: t.u32(),
  avgScorePct: t.f64(),
  spd: t.f64(), acc: t.f64(), clu: t.f64(), dis: t.f64(), grt: t.f64(), con: t.f64(), ovr: t.f64(),
  form: t.string(),
  streak: t.i32(),
  upsetUntil: t.option(t.timestamp()),
  eloHistory: t.array(t.f64()),
  backersWon: t.u32(),
  earningsUsdc: t.f64(),
});

export const match = table({ name: 'match', public: true }, {
  id: t.string().primaryKey(),
  number: t.u32(),
  category: t.string(),
  status: t.string(),
  mode: t.string(),
  isDemo: t.bool(),
  fighterIds: t.array(t.string()),
  slots: t.array(t.u8()),
  problems: t.array(ProblemMeta),
  commitHash: t.string(),
  createdAt: t.timestamp(),
  bettingClosesAt: t.timestamp(),
  startedAt: t.option(t.timestamp()),
  endedAt: t.option(t.timestamp()),
  timeLimitMs: t.u32(),
  winnerId: t.option(t.string()),
  voidReason: t.option(t.string()),
  lastSeq: t.u32(),
});

export const entry = table({ name: 'entry', public: true }, {
  id: t.string().primaryKey(),                   // `${matchId}:${fighterId}`
  matchId: t.string().index('btree'),
  fighterId: t.string().index('btree'),
  slot: t.u8(),
  teamId: t.option(t.string()),
  // Standing fields (rank/score filled at finalize)
  rank: t.option(t.u8()),
  points: t.u32(), scorePct: t.f64(),
  hits: t.u32(), misses: t.u32(), overturned: t.u32(), yellow: t.u32(), red: t.u32(),
  firstHitMs: t.option(t.u32()), lastScoreMs: t.option(t.u32()),
  clutchPoints: t.u32(), missesRecovered: t.u32(),
  eloBefore: t.f64(),
  eloAfter: t.option(t.f64()),
  wonAtOdds: t.option(t.f64()),
});

export const market = table({ name: 'market', public: true }, {
  id: t.string().primaryKey(),
  matchId: t.string().index('btree'),
  kind: t.string(),
  subject: t.option(t.string()),
  line: t.option(t.f64()),
  label: t.string(),
  outcomes: t.array(t.string()),
  status: t.string(),
  result: t.option(t.string()),
  rakeBps: t.u16(),
});

export const pool = table({ name: 'pool', public: true }, {
  id: t.string().primaryKey(),                   // `${marketId}#${outcome}`
  marketId: t.string().index('btree'),
  outcome: t.string(),
  staked: t.u64(),
  seed: t.u64(),
  bettors: t.u32(),
});

export const bet = table({ name: 'bet', public: true }, {
  id: t.u64().primaryKey().autoInc(),
  marketId: t.string().index('btree'),
  matchId: t.string().index('btree'),
  bettor: t.identity().index('btree'),
  handle: t.string(),
  outcome: t.string(),
  stake: t.u64(),
  placedAt: t.timestamp(),
  status: t.string(),
  payout: t.u64(),
});

export const fightEvent = table({ name: 'fight_event', public: true }, {
  id: t.u64().primaryKey().autoInc(),
  matchId: t.string().index('btree'),
  seq: t.u32(),
  t: t.u32(),
  type: t.string(),
  data: t.string(),                              // JSON, validated by zod at both ends (ADR-015)
});

export const ledgerTx = table({ name: 'ledger_tx', public: false }, {
  id: t.u64().primaryKey().autoInc(),
  identity: t.identity().index('btree'),
  deltaCents: t.i64(),
  reason: t.string(),
  refId: t.string(),
  at: t.timestamp(),
});

export const purse = table({ name: 'purse', public: true }, {
  id: t.u64().primaryKey().autoInc(),
  matchId: t.string().index('btree'),
  fighterId: t.string().index('btree'),
  kind: t.string(),                              // 'entry' | 'payout'
  amountUsdc: t.f64(),
  txRef: t.string(),
  network: t.string(),
  coveredByHouse: t.bool(),
  at: t.timestamp(),
});

// Scheduled → auto_lock (reducer registered in reducers.ts with `onSchedule: lockTimer`).
export const lockTimer = table({ name: 'lock_timer', public: false }, {
  scheduledId: t.u64().primaryKey().autoInc(),
  scheduledAt: t.scheduleAt(),
  matchId: t.string(),
});

const spacetimedb = schema({
  config, player, fighter, fighterSecret, fighterStats, fighterCategoryStats, match, entry, market, pool, bet, fightEvent, ledgerTx, purse, lockTimer,
});
export default spacetimedb;
