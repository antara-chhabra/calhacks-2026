import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { Identity, Timestamp } from 'spacetimedb';
import fixture from '../../../fixtures/matches/mock-basic.json';
import { initialMatchState, type ArenaCue } from '@fc/engine';
import { createLiveAdapter, safeInteger, timestampMs, type ConnectionBuilder, type LiveConnection, type Table, type WireRow } from '../src/data/live';
import { useStore, type Store } from '../src/data/store';

const who = Identity.fromString('1'.repeat(64));
class FakeTable implements Table {
  rows: WireRow[] = [];
  inserts: ((ctx: { event: { tag: string } }, r: WireRow) => void)[] = [];
  updates: (() => void)[] = [];
  iter() { return this.rows; }
  onInsert(f: typeof this.inserts[number]) { this.inserts.push(f); }
  onUpdate(f: () => void) { this.updates.push(f); }
  onDelete() {}
  insert(r: WireRow, tag = 'Reducer') { this.rows.push(r); this.inserts.forEach((f) => f({ event: { tag } }, r)); }
}
const adapters: ReturnType<typeof createLiveAdapter>[] = [];
afterEach(() => { adapters.forEach((a) => a.disconnect()); adapters.length = 0; vi.useRealTimers(); });
const row = (i: number) => ({ ...fixture.events[i]!, data: JSON.stringify(fixture.events[i]!.data) });

function setup(initialMatchId: string | null = null) {
  const store = createStore<Store>()(() => ({ ...useStore.getState(), conn: 'offline', me: null,
    watch: { ...useStore.getState().watch, matchId: initialMatchId, mode: 'live', state: initialMatchState(), playbackRevision: 0 } }));
  const db = Object.fromEntries(['player', 'fighter', 'fighterStats', 'fighterCategoryStats', 'match', 'market', 'pool', 'bet', 'fightEvent'].map((k) => [k, new FakeTable()]));
  db.player!.rows = [{ identity: who, handle: 'fan', balanceCents: 10000n }];
  db.fighter!.rows = fixture.fighters.map((f) => ({ ...f, origin: 'house', status: 'active', elo: 1000, version: 1 }));
  const reducers = { placeBet: vi.fn(async () => {}), registerPlayer: vi.fn(async () => {}), creditTestFunds: vi.fn(async () => {}), createFighter: vi.fn(async () => {}) };
  let onConnect: Parameters<ConnectionBuilder['onConnect']>[0];
  let onReconnect: Parameters<ConnectionBuilder['onAutomaticReconnect']>[0] | undefined, onDisconnect: (() => void) | undefined;
  let onError: Parameters<ConnectionBuilder['onConnectError']>[0] | undefined;
  const subscriptions: { applied(): void; query: string[]; closed: boolean }[] = [];
  const conn: LiveConnection = { db, reducers, disconnect: () => onDisconnect?.(), subscriptionBuilder() {
    let applied = () => {};
    const builder = { onApplied(f: () => void) { applied = f; return builder; }, onError() { return builder; }, subscribe(query: string[]) {
      const sub = { applied, query, closed: false }; subscriptions.push(sub); return { unsubscribe() { sub.closed = true; } };
    } }; return builder;
  } };
  const b: ConnectionBuilder = { withUri: () => b, withDatabaseName: () => b, withToken: () => b, withAutomaticReconnect: () => b,
    onConnect(f) { onConnect = f; return b; }, onAutomaticReconnect(f) { onReconnect = f; return b; },
    onConnectError(f) { onError = f; return b; }, onDisconnect(f) { onDisconnect = f; return b; }, build() { queueMicrotask(() => onConnect(conn, who, 'test-auth')); return conn; } };
  const cues: ArenaCue[] = [], storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
  const adapter = createLiveAdapter({ uri: 'ws://local', db: 'test', store, storage, emitCue: (c) => cues.push(c), loadBindings: async () => ({ DbConnection: { builder: () => b } }) });
  adapters.push(adapter);
  return { adapter, store, db, reducers, subscriptions, cues, storage, reconnect: () => onReconnect?.(conn, who, 'refreshed-auth'),
    reconnectError: () => onError?.({}, new Error('offline'), 1) };
}
async function connected(s: ReturnType<typeof setup>) {
  s.adapter.connect(); await vi.waitFor(() => expect(s.subscriptions).toHaveLength(1));
  s.subscriptions[0]!.applied();
}

describe('live SpacetimeDB adapter', () => {
  it('honors a deep-linked match selected before the lazy adapter finished loading', async () => {
    const s = setup(fixture.matchId);
    s.adapter.connect(); await vi.waitFor(() => expect(s.subscriptions).toHaveLength(2));
    s.db.fightEvent!.rows = [row(0)];
    s.subscriptions[0]!.applied(); s.subscriptions[1]!.applied();
    expect(s.store.getState().watch.state.matchId).toBe(fixture.matchId);
    expect(s.store.getState().watch.state.lastSeq).toBe(1);
    expect(s.cues).toHaveLength(0);
  });
  it('maps identities, cents and timestamps without precision loss; persists a database-scoped token', async () => {
    const s = setup(); await connected(s);
    expect(s.store.getState().me).toMatchObject({ identity: who.toHexString(), balanceCents: 10000, moneyMode: 'ledger' });
    expect(s.storage.setItem).toHaveBeenCalledWith('fightcard.identity:ws://local:test', 'test-auth');
    expect(timestampMs(new Timestamp(123456000n))).toBe(123456);
    expect(() => safeInteger(9007199254740992n)).toThrow('amount_out_of_range');
    await s.adapter.placeBet('m:winner', 'vex', 500);
    expect(s.reducers.placeBet).toHaveBeenCalledWith({ marketId: 'm:winner', outcome: 'vex', stake: 500n });
    await s.adapter.creditTestFunds(who.toHexString(), 1000);
    expect(s.reducers.creditTestFunds.mock.calls[0]![0]).toMatchObject({ amountCents: 1000n });
  });
  it('reduces catch-up silently, emits only new cues, ignores duplicates and snaps again on reconnect', async () => {
    const s = setup(); await connected(s);
    s.adapter.watchMatch(fixture.matchId);
    const cut = fixture.events.findIndex((e) => e.type === 'verdict.live');
    fixture.events.slice(0, cut).forEach((_, i) => s.db.fightEvent!.insert(row(i), 'SubscribeApplied'));
    s.subscriptions[1]!.applied();
    expect(s.store.getState().watch.state.lastSeq).toBe(cut);
    expect(s.cues).toHaveLength(0);
    s.db.fightEvent!.insert(row(cut));
    expect(s.cues.some((c) => c.kind === 'attack' || c.kind === 'whiff')).toBe(true);
    const count = s.cues.length;
    s.db.fightEvent!.insert(row(cut));
    expect(s.cues).toHaveLength(count);
    // Real SDK cache de-duplicates primary keys across subscription replay.
    s.db.fightEvent!.rows.pop();
    s.reconnect();
    const revision = s.store.getState().watch.playbackRevision;
    s.subscriptions[0]!.applied(); s.subscriptions[1]!.applied();
    expect(s.store.getState().watch.playbackRevision).toBe(revision + 1);
    expect(s.cues).toHaveLength(count);
  });
  it('requests a fresh snapshot on a sequence gap, and rejects malformed event payloads', async () => {
    const s = setup(); await connected(s); s.adapter.watchMatch(fixture.matchId);
    s.db.fightEvent!.insert(row(0), 'SubscribeApplied'); s.subscriptions[1]!.applied();
    s.db.fightEvent!.insert(row(2));
    expect(s.subscriptions).toHaveLength(3);
    expect(s.store.getState().watch.state.lastSeq).toBe(1);
    s.db.fightEvent!.rows = [row(0), row(1), row(2)]; s.subscriptions[2]!.applied();
    expect(s.store.getState().watch.state.lastSeq).toBe(3);
    s.db.fightEvent!.insert({ matchId: fixture.matchId, seq: 4, t: 0, type: 'verdict.live', data: '{}' });
    expect(s.store.getState().conn).toBe('offline');
    expect(s.cues).toHaveLength(0);
  });
  it('preserves replay state and prevents network mutations while a fixture is playing', async () => {
    const s = setup(); await connected(s);
    s.store.setState((prev) => ({ conn: 'replay', watch: { ...prev.watch, mode: 'replay' } }));
    s.db.player!.rows[0]!.balanceCents = 1n; s.db.player!.insert({ identity: Identity.zero(), handle: 'other', balanceCents: 1n });
    await Promise.resolve(); expect(s.store.getState().conn).toBe('replay');
    expect(s.store.getState().me?.balanceCents).toBe(10000);
    await expect(s.adapter.placeBet('m', 'vex', 500)).rejects.toThrow('replay_readonly');
    expect(s.reducers.placeBet).not.toHaveBeenCalled();
  });
  it('escapes match IDs in SQL and preserves reducer error codes', async () => {
    const s = setup(); await connected(s); s.adapter.watchMatch("m'quoted");
    expect(s.subscriptions[1]!.query[0]).toContain("matchId = 'm''quoted'");
    s.reducers.placeBet.mockRejectedValueOnce(new Error('SenderError: insufficient_funds'));
    await expect(s.adapter.placeBet('m', 'vex', 500)).rejects.toThrow('insufficient_funds');
  });
  it('lets the SDK retry established connections without starting a competing retry timer', async () => {
    const s = setup(); await connected(s); vi.useFakeTimers();
    s.reconnectError();
    expect(vi.getTimerCount()).toBe(0);
    s.reconnect(); s.subscriptions[0]!.applied();
    expect(s.storage.setItem).toHaveBeenLastCalledWith('fightcard.identity:ws://local:test', 'refreshed-auth');
    expect(s.store.getState().conn).toBe('live');
  });
});
