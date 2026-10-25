// Opt-in real SDK check: FC_LIVE_TEST=1 FC_STDB_DB=fightcard-o3, with a claimed runner token in root .env.
// Two independent adapters/stores/token jars exercise the same path as two browsers.
import { expect, it } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { HOUSE_ROSTER } from '@fc/contracts';
import { initialMatchState, type ArenaCue } from '@fc/engine';
import { connectStdb } from '../../runner/src/stdb';
import { runMatch, type Candidate } from '../../runner/src/match';
import { createMockBackend } from '../../runner/src/fighters/mock';
import { generateProblemSet } from '../../runner/src/problems';
import { createLiveAdapter } from '../src/data/live';
import { useStore, type Store } from '../src/data/store';

it.skipIf(process.env.FC_LIVE_TEST !== '1')('two independent live clients see bets, cues, fairness reveal and real ledger settlement', async () => {
  const uri = process.env.FC_STDB_URI || 'ws://127.0.0.1:3000', db = process.env.FC_STDB_DB || 'fightcard-o3';
  if (!/^wss?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(uri)) throw new Error('local test only');
  const runner = await connectStdb({ FC_STDB_URI: uri, FC_STDB_DB: db, FC_STDB_TOKEN: process.env.FC_STDB_TOKEN });
  expect(runner.status()).toBe('ok');
  const seed = '0123456789abcdef0123456789abcdef', ids = ['vex', 'sage', 'quill', 'brick'] as const;
  const strategy = { verify: false, order: 'in_order', risk: 'cautious', taunts: 1 } as const;
  const stamp = Date.now().toString(36), matchId = `web_${stamp}`;
  const candidates: Candidate[] = ids.map((id) => ({ fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: 'test', strategy, elo: 1000, lastMatchAt: 0 }));
  for (const id of ids) await runner.upsertHouseFighter({ fighter: { ...HOUSE_ROSTER[id], strategy, tier: 'standard' } });
  const clients = [0, 1].map(() => {
    const store = createStore<Store>()(() => ({ ...useStore.getState(), conn: 'offline', me: null, fighters: {}, matches: {}, markets: {}, bets: [],
      watch: { ...useStore.getState().watch, mode: 'live', matchId: null, state: initialMatchState(), playbackRevision: 0 } }));
    const tokens = new Map<string, string>(), cues: ArenaCue[] = [];
    const adapter = createLiveAdapter({ uri, db, store, emitCue: (c) => cues.push(c),
      storage: { getItem: (k) => tokens.get(k) ?? null, setItem: (k, v) => { tokens.set(k, v); } } });
    adapter.connect(); return { store, adapter, cues };
  });
  let running: ReturnType<typeof runMatch> | undefined;
  let previousStats: unknown;
  try {
    for (const [i, c] of clients.entries()) {
      await expect.poll(() => c.store.getState().conn, { timeout: 8000 }).toBe('live');
      await c.adapter.register(`w${i}_${stamp}`);
      await runner.creditTestFunds({ identity: c.store.getState().me!.identity, amountCents: 10000 });
      await expect.poll(() => c.store.getState().me?.balanceCents).toBe(10000);
      await expect(c.adapter.creditTestFunds(c.store.getState().me!.identity, 1)).rejects.toThrow('not_runner');
    }
    previousStats = clients[0]!.store.getState().fighters.vex!.stats;
    const refs = generateProblemSet(seed).problems;
    const backend = createMockBackend({ timeScale: 100, answerFor: (p) => refs.find((r) => r.idx === p.idx)?.reference ?? null });
    running = runMatch({ stdb: runner, backendFor: () => backend, log: () => {} }, {
      matchId, seed, candidates, mode: 'mock', bettingWindowMs: 4000, introMs: 100, timeLimitMs: 1500,
      abortGraceMs: 300, toolMinMs: 0, thinkingMinMs: 0, flushIntervalMs: 30,
    });
    // Attach rejection handling immediately while betting is exercised.
    void running.catch(() => {});
    for (const c of clients) {
      await expect.poll(() => c.store.getState().matches[matchId]?.status).toBe('open');
      c.adapter.watchMatch(matchId);
      await expect.poll(() => c.store.getState().watch.state.lastSeq).toBe(1);
      expect(c.cues).toHaveLength(0);
    }
    const market = `${matchId}:winner`;
    await clients[0]!.adapter.placeBet(market, 'vex', 500);
    await clients[1]!.adapter.placeBet(market, 'sage', 700);
    for (const c of clients) {
      await expect.poll(() => c.store.getState().markets[market]?.pools.vex?.staked).toBe(500);
      await expect.poll(() => c.store.getState().markets[market]?.pools.sage?.staked).toBe(700);
    }
    expect(clients[0]!.store.getState().markets[market]!.odds).toEqual(clients[1]!.store.getState().markets[market]!.odds);
    await running;
    for (const c of clients) {
      await expect.poll(() => c.store.getState().watch.state.status).toBe('settled');
      const state = c.store.getState();
      expect(state.watch.state.reveal).not.toBeNull();
      const mine = state.bets.find((b) => b.mine && b.marketId === market)!;
      expect(mine).toBeDefined();
      expect(mine.status).not.toBe('open');
      expect(state.me!.balanceCents).toBe(10000 - mine.stake + mine.payout);
      expect(c.cues.some((cue) => cue.kind === 'victory')).toBe(true);
      expect(state.fighters.vex!.stats).toEqual(previousStats);
    }
    const forged = await clients[0]!.adapter.createFighter({ name: `T${stamp}`, title: 'Test Fighter', catchphrase: 'Ready.',
      archetype: 'scholar', persona: 'A careful fighter who checks each answer.', strategy, tier: 'standard', skin: HOUSE_ROSTER.sage.skin });
    expect(forged).toMatch(/^f_/);
    await expect.poll(() => clients[1]!.store.getState().fighters[forged]?.name).toBe(`T${stamp}`);
  } finally {
    await running?.catch(() => {});
    clients.forEach((c) => c.adapter.disconnect()); runner.close();
  }
}, 30000);
