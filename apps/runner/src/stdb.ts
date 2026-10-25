// SpacetimeDB client wrapper (PRD §8.8, §8.9). Compiles without generated bindings: they are loaded dynamically
// from ./module_bindings (gitignored, `npm run gen`). If they are absent or the connection fails, connectStdb()
// returns a 'down' implementation whose methods reject with Error('stdb_down').
import type {
  EngineTier, FighterId, FighterPublic, FighterStats, MarketSpec, MatchMode, ProblemMeta, Slot, Standing, Strategy, Category,
} from '@fc/contracts';
import type { Env } from './env.js';

export type FightEventRow = { matchId: string; seq: number; t: number; type: string; data: unknown };

export interface Stdb {
  status(): 'ok' | 'down';
  /** Hex identity of the connected runner, or null when down. */
  identity(): string | null;
  /** Subscribe to fight_event rows of one match (data is the parsed JSON). Returns an unsubscribe fn. */
  onEvent(matchId: string, f: (e: FightEventRow) => void): () => void;
  close(): void;
  /** Optional: matches currently in the subscribed `match` table (for orphan recovery). Omitted when unavailable. */
  listActiveMatches?(): Promise<{ id: string; status: string }[]>;

  claimRunner(): Promise<void>;
  creditTestFunds(a: { identity: string; amountCents: number }): Promise<void>;
  upsertHouseFighter(a: { fighter: FighterPublic & { strategy: Strategy; tier: EngineTier } }): Promise<void>;
  createMatch(a: {
    id: string; category: Category; mode: MatchMode; isDemo: boolean; fighterIds: FighterId[]; slots: Slot[];
    problems: ProblemMeta[]; commitHash: string; bettingWindowMs: number; timeLimitMs: number; markets: MarketSpec[];
  }): Promise<void>;
  lockMatch(a: { matchId: string }): Promise<void>;
  startMatch(a: { matchId: string }): Promise<void>;
  postEvents(a: { matchId: string; events: { type: string; data: string }[] }): Promise<void>;
  beginReview(a: { matchId: string }): Promise<void>;
  finalizeMatch(a: { matchId: string; standings: Standing[] }): Promise<void>;
  revealMatch(a: { matchId: string; problemSetJson: string; salt: string }): Promise<void>;
  settleMatch(a: {
    matchId: string; results: { marketId: string; outcome: string }[]; elo: { fighterId: FighterId; after: number }[]; stats: FighterStats[];
  }): Promise<void>;
  voidMatch(a: { matchId: string; reason: string }): Promise<void>;
  recordPurse(a: {
    matchId: string; fighterId: FighterId; kind: 'entry' | 'payout'; amountUsdc: number; txRef: string; network: string;
    coveredByHouse: boolean; to: string;
  }): Promise<void>;
  setFighterWallet(a: { fighterId: FighterId; address: string }): Promise<void>;
}

export type StdbOptions = { uri: string; db: string; token?: string; timeoutMs?: number };

/* eslint-disable @typescript-eslint/no-explicit-any */
type RawConn = { conn: any; identity: string; token: string; bindings: any };

/** Open a raw connection through the generated bindings. Throws Error('bindings_missing') if they do not exist. Never logs the token. */
export async function connectRaw(o: StdbOptions): Promise<RawConn> {
  let bindings: any;
  try {
    const spec = './module_bindings/index.js';   // variable specifier: no compile-time dependency on generated files
    bindings = await import(/* @vite-ignore */ spec);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND' || /Cannot find|Failed to load|not found/i.test(String((e as Error).message))) {
      throw new Error('bindings_missing');
    }
    throw e;
  }
  const DbConnection = bindings.DbConnection;
  if (!DbConnection?.builder) throw new Error('bindings_missing');
  return new Promise<RawConn>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect_timeout')), o.timeoutMs ?? 8000);
    try {
      const b = DbConnection.builder().withUri(o.uri).withDatabaseName(o.db);
      if (o.token) b.withToken(o.token);
      b.onConnect((conn: any, identity: any, token: string) => {
        clearTimeout(timer);
        resolve({ conn, identity: String(identity?.toHexString?.() ?? identity), token, bindings });
      });
      b.onConnectError((_ctx: unknown, err: Error) => { clearTimeout(timer); reject(err instanceof Error ? err : new Error(String(err))); });
      b.build();
    } catch (e) { clearTimeout(timer); reject(e); }
  });
}

const METHODS = {
  claimRunner: 'claimRunner', creditTestFunds: 'creditTestFunds', upsertHouseFighter: 'upsertHouseFighter', createMatch: 'createMatch',
  lockMatch: 'lockMatch', startMatch: 'startMatch', postEvents: 'postEvents', beginReview: 'beginReview',
  finalizeMatch: 'finalizeMatch', revealMatch: 'revealMatch', settleMatch: 'settleMatch', voidMatch: 'voidMatch',
  recordPurse: 'recordPurse', setFighterWallet: 'setFighterWallet',
} as const;
type ReducerName = keyof typeof METHODS;

/** u64 columns are bigint on the wire; contracts use plain integer numbers. */
const toWire = (a: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!a) return a;
  const out: Record<string, unknown> = { ...a };
  if (typeof out.amountCents === 'number') out.amountCents = BigInt(out.amountCents);
  return out;
};

function makeDown(reason: string): Stdb {
  console.warn(`[stdb] down: ${reason}`);   // once, at construction
  const down = () => Promise.reject(new Error('stdb_down'));
  return {
    status: () => 'down', identity: () => null, onEvent: () => () => {}, close: () => {},
    claimRunner: down, creditTestFunds: down, upsertHouseFighter: down, createMatch: down, lockMatch: down, startMatch: down,
    postEvents: down, beginReview: down, finalizeMatch: down, revealMatch: down, settleMatch: down, voidMatch: down,
    recordPurse: down, setFighterWallet: down,
  };
}

export async function connectStdb(env: Pick<Env, 'FC_STDB_URI' | 'FC_STDB_DB' | 'FC_STDB_TOKEN'>): Promise<Stdb> {
  let raw: RawConn;
  try {
    raw = await connectRaw({ uri: env.FC_STDB_URI, db: env.FC_STDB_DB, token: env.FC_STDB_TOKEN });
  } catch (e) {
    const msg = (e as Error).message;
    return makeDown(msg === 'bindings_missing' ? 'generated bindings missing (run `npm run gen`)' : `connection failed (${msg})`);
  }
  const { conn, identity } = raw;
  let up = true;
  const listeners = new Map<string, Set<(e: FightEventRow) => void>>();
  conn.onDisconnect?.(() => { up = false; console.warn('[stdb] disconnected'); });
  try {
    conn.subscriptionBuilder().subscribe(['SELECT * FROM fight_event']);
    conn.db.fightEvent.onInsert((_ctx: unknown, row: any) => {
      const set = listeners.get(row.matchId);
      if (!set) return;
      let data: unknown = row.data;
      try { data = JSON.parse(row.data); } catch { /* keep raw string */ }
      const ev: FightEventRow = { matchId: row.matchId, seq: Number(row.seq), t: Number(row.t), type: row.type, data };
      for (const f of [...set]) { try { f(ev); } catch (err) { console.warn(`[stdb] onEvent listener threw: ${(err as Error).message}`); } }
    });
  } catch (e) {
    console.warn(`[stdb] event subscription unavailable (${(e as Error).message})`);
  }
  let matchTable = false;
  try {
    conn.subscriptionBuilder().onError?.(() => { matchTable = false; }).subscribe(['SELECT * FROM match']);
    matchTable = typeof conn.db?.match?.iter === 'function';
  } catch { /* match table unavailable: orphan recovery is skipped */ }

  const call = (name: ReducerName) => async (args?: Record<string, unknown>) => {
    if (!up) throw new Error('stdb_down');
    const fn = conn.reducers?.[METHODS[name]];
    if (typeof fn !== 'function') throw new Error(`stdb_reducer_missing:${name}`);
    const wire = toWire(args);
    await (wire === undefined ? fn.call(conn.reducers) : fn.call(conn.reducers, wire));
  };
  const c = (n: ReducerName) => call(n) as any;
  return {
    status: () => (up ? 'ok' : 'down'),
    identity: () => (up ? identity : null),
    onEvent(matchId, f) {
      let set = listeners.get(matchId);
      if (!set) listeners.set(matchId, (set = new Set()));
      set.add(f);
      return () => { set!.delete(f); if (set!.size === 0) listeners.delete(matchId); };
    },
    close() { up = false; try { conn.disconnect?.(); } catch { /* ignore */ } },
    ...(matchTable ? {
      async listActiveMatches() {
        const out: { id: string; status: string }[] = [];
        for (const row of conn.db.match.iter()) out.push({ id: String(row.id), status: String(row.status) });
        return out;
      },
    } : {}),
    claimRunner: c('claimRunner'), creditTestFunds: c('creditTestFunds'), upsertHouseFighter: c('upsertHouseFighter'),
    createMatch: c('createMatch'), lockMatch: c('lockMatch'), startMatch: c('startMatch'), postEvents: c('postEvents'),
    beginReview: c('beginReview'), finalizeMatch: c('finalizeMatch'), revealMatch: c('revealMatch'), settleMatch: c('settleMatch'),
    voidMatch: c('voidMatch'), recordPurse: c('recordPurse'), setFighterWallet: c('setFighterWallet'),
  };
}

/** A permanently-down Stdb for tests and dry wiring. */
export function downStdb(reason = 'disabled'): Stdb { return makeDown(reason); }
