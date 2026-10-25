// K-06b: the generated SDK boundary. The rest of the UI only consumes Store.
import { Identity } from 'spacetimedb';
import { fighterPublicSchema, fighterStatsSchema, fightEnvelopeSchema, forgeSpecSchema,
  type FightEnvelope, type FighterStats, type ForgeSpec } from '@fc/contracts';
import { cardFrame, decimalOdds, deriveCues, initialMatchState, reduceMatch, type ArenaCue } from '@fc/engine';
import type { LiveAdapter } from './adapter';
import type { BetRow, FighterCardData, MarketView, MatchRow, Store } from './store';

// Bindings are gitignored: use a glob so a checkout without codegen still builds offline.
// All generated rows enter through this one structural boundary; events/public fighter data are validated below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WireRow = Record<string, any>;
type Context = { event?: { tag: string } };
export interface Table {
  iter(): Iterable<WireRow>;
  onInsert(f: (ctx: Context, row: WireRow) => void): void;
  onUpdate?(f: (ctx: Context, before: WireRow, after: WireRow) => void): void;
  onDelete?(f: (ctx: Context, row: WireRow) => void): void;
}
interface Subscription { unsubscribe(): void }
interface SubscriptionBuilder {
  onApplied(f: () => void): SubscriptionBuilder;
  onError(f: () => void): SubscriptionBuilder;
  subscribe(queries: string[]): Subscription;
}
export interface LiveConnection {
  db: Record<string, Table>;
  reducers: Record<string, (args?: WireRow) => Promise<void>>;
  subscriptionBuilder(): SubscriptionBuilder;
  disconnect(): void;
}
export interface ConnectionBuilder {
  withUri(s: string): ConnectionBuilder;
  withDatabaseName(s: string): ConnectionBuilder;
  withToken(s: string): ConnectionBuilder;
  withAutomaticReconnect(): ConnectionBuilder;
  onConnect(f: (conn: LiveConnection, identity: Identity, token: string) => void): ConnectionBuilder;
  onAutomaticReconnect(f: (conn: LiveConnection, identity: Identity, token: string) => void): ConnectionBuilder;
  onConnectError(f: (ctx: unknown, error: unknown, nextReconnectAttempt?: number) => void): ConnectionBuilder;
  onDisconnect(f: () => void): ConnectionBuilder;
  build(): LiveConnection;
}
type Bindings = { DbConnection: { builder(): ConnectionBuilder } };
type StoreApi = { getState(): Store; setState(s: Partial<Store> | ((prev: Store) => Partial<Store>)): void };
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type LiveOptions = {
  uri: string; db: string; store: StoreApi; emitCue(c: ArenaCue): void;
  loadBindings?: () => Promise<Bindings>;
  storage?: StorageLike;
};
const boardTables = ['player', 'fighter', 'fighterStats', 'fighterCategoryStats', 'match', 'market', 'pool', 'bet'];
const boardQueries = ['player', 'fighter', 'fighter_stats', 'fighter_category_stats', 'match', 'market', 'pool', 'bet'].map((t) => `SELECT * FROM ${t}`);
const idHex = (id: Identity | string | undefined | null): string | null => id == null ? null : typeof id === 'string' ? id : id.toHexString();
export const timestampMs = (t: unknown): number | null => {
  if (t == null) return null;
  if (typeof t === 'number') return t;
  const ts = t as { toMillis?: () => number | bigint; microsSinceUnixEpoch?: bigint };
  if (ts.toMillis) return Number(ts.toMillis());
  if (ts.microsSinceUnixEpoch != null) return Number(ts.microsSinceUnixEpoch / 1000n);
  throw new Error('bad_timestamp');
};
export function safeInteger(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error('amount_out_of_range');
  return n;
}
function eventFromRow(row: WireRow): FightEnvelope {
  const data: unknown = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return fightEnvelopeSchema.parse({ v: 1, matchId: row.matchId, seq: safeInteger(row.seq), t: safeInteger(row.t), type: row.type, data });
}
async function defaultBindings(): Promise<Bindings> {
  const modules = import.meta.glob('../module_bindings/index.ts');
  const load = modules['../module_bindings/index.ts'];
  if (!load) throw new Error('bindings_missing');
  return await load() as Bindings;
}

/** Separate instances can use separate stores/storage (e.g. two-browser integration tests). */
export function createLiveAdapter(o: LiveOptions): LiveAdapter {
  const { store } = o;
  const tokenKey = `fightcard.identity:${o.uri}:${o.db}`;
  let conn: LiveConnection | null = null, identity: string | null = null;
  let stopped = true, generation = 0, applied = false, watchReady = false;
  // A deep-linked route can request its match while codegen/config are still loading.
  let watchId: string | null = store.getState().watch.mode === 'live' ? store.getState().watch.matchId : null;
  let watchSub: Subscription | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined, flushQueued = false;
  let retryMs = 1000;
  const cached = (key: string): WireRow[] => [...(conn?.db[key]?.iter() ?? [])];
  const replaying = () => store.getState().watch.mode === 'replay' && store.getState().conn === 'replay';
  const readToken = () => { try { return o.storage?.getItem(tokenKey) ?? undefined; } catch { return undefined; } };
  const saveToken = (token: string) => { try { o.storage?.setItem(tokenKey, token); } catch { /* storage may be disabled */ } };
  const offline = () => { if (!replaying()) store.setState({ conn: 'offline', me: null }); };

  function publishBoard(): void {
    if (!applied || replaying() || !conn) return;
    try {
      const players = cached('player');
      const me = players.find((p) => idHex(p.identity) === identity);
      const stats = new Map<string, FighterStats>();
      for (const r of cached('fighterStats')) stats.set(r.fighterId, fighterStatsSchema.parse({ ...r, upsetUntil: timestampMs(r.upsetUntil) }));
      const categoryRows = cached('fighterCategoryStats');
      const fighters: Store['fighters'] = {};
      for (const r of cached('fighter')) {
        const s = stats.get(r.id) ?? null;
        const provisional = r.status === 'provisional';
        const f: FighterCardData = { ...fighterPublicSchema.parse(r), origin: r.origin, status: r.status,
          creatorHandle: players.find((p) => idHex(p.identity) === idHex(r.creator))?.handle ?? null,
          elo: Number(r.elo), stats: s, categoryStats: Object.fromEntries(categoryRows.filter((row) => row.fighterId === r.id).map((row) => [row.category, fighterStatsSchema.parse({ ...row, upsetUntil: timestampMs(row.upsetUntil) })])), frame: s ? cardFrame(s, provisional, Date.now()) : provisional ? 'rookie' : 'bronze',
          walletAddress: r.walletAddress ?? null, version: Number(r.version) };
        fighters[f.id] = f;
      }
      const matches: Store['matches'] = {};
      for (const r of cached('match')) {
        const m: MatchRow = { slots: Array.from(r.slots ?? []), category: r.category, id: r.id, number: Number(r.number), status: r.status, mode: r.mode, isDemo: r.isDemo,
          fighterIds: r.fighterIds, problems: r.problems, commitHash: r.commitHash,
          bettingClosesAt: timestampMs(r.bettingClosesAt)!, startedAt: timestampMs(r.startedAt), timeLimitMs: Number(r.timeLimitMs), winnerId: r.winnerId ?? null };
        matches[m.id] = m;
      }
      const pools = cached('pool'), markets: Store['markets'] = {};
      for (const r of cached('market')) {
        const outcomes = r.outcomes as string[];
        const ps: MarketView['pools'] = {};
        for (const outcome of outcomes) {
          const p = pools.find((x) => x.marketId === r.id && x.outcome === outcome);
          ps[outcome] = { staked: safeInteger(p?.staked ?? 0), seed: safeInteger(p?.seed ?? 0), bettors: safeInteger(p?.bettors ?? 0) };
        }
        markets[r.id] = { id: r.id, kind: r.kind, subject: r.subject ?? null, line: r.line ?? null, label: r.label,
          outcomes, rakeBps: Number(r.rakeBps), seeds: outcomes.map((x) => ps[x]!.seed), pools: ps,
          status: r.status, result: r.result ?? null,
          odds: decimalOdds(outcomes.map((outcome) => ({ outcome, ...ps[outcome]! })), Number(r.rakeBps)) };
      }
      const bets: BetRow[] = cached('bet').map((r) => ({ id: String(r.id), marketId: r.marketId, matchId: r.matchId,
        handle: r.handle, outcome: r.outcome, stake: safeInteger(r.stake), payout: safeInteger(r.payout), status: r.status,
        placedAt: timestampMs(r.placedAt)!, mine: idHex(r.bettor) === identity })).sort((a, b) => b.placedAt - a.placedAt);
      const ordered = Object.values(matches).sort((a, b) => b.number - a.number);
      store.setState({ fighters, matches, markets, bets: bets.filter((b, i) => b.mine || i < 100),
        openMatchId: ordered.find((m) => m.status === 'open')?.id ?? null,
        liveMatchId: ordered.find((m) => ['locked', 'live', 'review'].includes(m.status))?.id ?? null,
        me: identity ? { identity, handle: me?.handle ?? null, balanceCents: safeInteger(me?.balanceCents ?? 0), moneyMode: 'ledger' } : null,
        conn: 'live' });
    } catch { offline(); }
  }
  function queueBoard(): void {
    if (flushQueued) return;
    flushQueued = true;
    queueMicrotask(() => { flushQueued = false; publishBoard(); });
  }
  function snapWatch(): void {
    if (!watchId || replaying()) return;
    const rows = cached('fightEvent').filter((r) => r.matchId === watchId).map(eventFromRow).sort((a, b) => a.seq - b.seq);
    let state = initialMatchState();
    for (const e of rows) {
      if (e.seq !== state.lastSeq + 1) throw new Error('event_gap');
      state = reduceMatch(state, e);
    }
    store.setState((s) => ({ watch: { ...s.watch, matchId: watchId, mode: 'live', state,
      playbackRevision: s.watch.playbackRevision + 1 } }));
  }
  function subscribeWatch(): void {
    watchReady = false;
    watchSub?.unsubscribe(); watchSub = null;
    if (!conn || !watchId || replaying()) return;
    // SQL string literals escape apostrophes by doubling, regardless of match ID source.
    const id = watchId.replaceAll("'", "''"), requested = watchId;
    watchSub = conn.subscriptionBuilder().onApplied(() => {
      if (watchId !== requested || stopped) return;
      try { snapWatch(); watchReady = true; } catch { offline(); }
    }).onError(offline).subscribe([`SELECT * FROM fight_event WHERE matchId = '${id}'`]);
  }
  function receive(ctx: Context, row: WireRow): void {
    if (!watchReady || replaying() || row.matchId !== watchId || ctx.event?.tag === 'SubscribeApplied') return;
    try {
      const e = eventFromRow(row), prev = store.getState().watch.state;
      if (e.seq <= prev.lastSeq) return;
      if (e.seq !== prev.lastSeq + 1) { watchReady = false; subscribeWatch(); return; }
      const cues = deriveCues(prev, e), state = reduceMatch(prev, e);
      store.setState((s) => ({ watch: { ...s.watch, state } }));
      cues.forEach(o.emitCue);
    } catch { watchReady = false; offline(); }
  }
  async function open(): Promise<void> {
    const gen = ++generation;
    if (!replaying()) store.setState({ conn: 'connecting' });
    try {
      const bindings = await (o.loadBindings ?? defaultBindings)();
      if (stopped || gen !== generation) return;
      const b = bindings.DbConnection.builder().withUri(o.uri).withDatabaseName(o.db).withAutomaticReconnect();
      const token = readToken(); if (token) b.withToken(token);
      b.onConnect((c, who, auth) => {
        if (stopped || gen !== generation) { c.disconnect(); return; }
        conn = c; identity = idHex(who); saveToken(auth); retryMs = 1000;
        for (const key of boardTables) {
          const t = c.db[key];
          t?.onInsert(queueBoard); t?.onUpdate?.(queueBoard); t?.onDelete?.(queueBoard);
        }
        c.db.fightEvent.onInsert(receive);
        c.subscriptionBuilder().onApplied(() => { if (stopped || gen !== generation) return; applied = true; publishBoard(); }).onError(offline).subscribe(boardQueries);
        subscribeWatch();
      }).onAutomaticReconnect((c, who, auth) => {
        if (stopped || gen !== generation) return;
        conn = c; identity = idHex(who); saveToken(auth); applied = false; watchReady = false;
      }).onDisconnect(() => {
        if (stopped || gen !== generation) return;
        applied = false; watchReady = false; offline();
      }).onConnectError((_ctx, _err, nextReconnectAttempt) => {
        if (stopped || gen !== generation) return;
        offline();
        // The SDK owns established-connection retries. Only initial failures need our timer.
        if (nextReconnectAttempt == null) scheduleRetry();
      });
      conn = b.build();
    } catch { offline(); scheduleRetry(); }
  }
  function scheduleRetry(): void {
    if (stopped || retry) return;
    retry = setTimeout(() => { retry = undefined; conn?.disconnect(); void open(); }, retryMs);
    retryMs = Math.min(retryMs * 2, 30_000);
  }
  async function call(name: string, args: WireRow): Promise<void> {
    if (replaying()) throw new Error('replay_readonly');
    if (!conn || !applied || stopped) throw new Error('not_connected');
    try { await conn.reducers[name]!(args); }
    catch (e) {
      // Preserve reducer error codes for the UI; don't echo an SDK payload/args.
      const code = String((e as Error).message).match(/\b(?:not_registered|market_locked|bad_outcome|bad_stake|insufficient_funds|market_cap|self_bet_forbidden|house_cannot_bet|slow_down|bad_name|name_taken|bad_persona|too_many_fighters|bad_handle|handle_taken|already_registered|not_runner|bad_amount)\b/)?.[0];
      throw new Error(code ?? 'request_failed');
    }
    publishBoard();
  }
  return {
    connect() { if (!stopped) return; stopped = false; void open(); },
    disconnect() { stopped = true; generation++; applied = false; watchReady = false; if (retry) clearTimeout(retry); retry = undefined;
      watchSub?.unsubscribe(); watchSub = null; conn?.disconnect(); conn = null; offline(); },
    watchMatch(id) { watchId = id; if (applied) publishBoard(); subscribeWatch(); },
    register: (handle) => call('registerPlayer', { handle }),
    claimDemoFunds: () => call('claimDemoFunds', {}),
    creditTestFunds: (who, amountCents) => call('creditTestFunds', { identity: Identity.fromString(who), amountCents: BigInt(safeInteger(amountCents)) }),
    placeBet: (marketId, outcome, stake) => call('placeBet', { marketId, outcome, stake: BigInt(safeInteger(stake)) }),
    async createFighter(spec: ForgeSpec) {
      const validated = forgeSpecSchema.parse(spec);
      await call('createFighter', { spec: { ...validated, payoutAddress: validated.payoutAddress ?? undefined, endpointUrl: validated.endpointUrl ?? undefined } });
      const f = cached('fighter').find((r) => r.nameKey === validated.name.toLowerCase() && idHex(r.creator) === identity);
      if (!f) throw new Error('fighter_not_received');
      return f.id as string;
    },
  };
}
