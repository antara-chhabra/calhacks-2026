// Web data layer (PRD §8.7). HEAD-owned. G-1 stub: the types are final; the store is inert until K-06 wires the
// SpacetimeDB adapter and the replay source. O1 and O2 read this store and never import generated bindings.
import { create } from 'zustand';
import type {
  Category, CardFrame, FighterId, FighterOrigin, FighterPublic, FighterStats, ForgeSpec, MarketSpec, MatchMode, MatchStatus, ProblemMeta, Slot,
} from '@fc/contracts';
import { initialMatchState, type ArenaCue, type MatchState } from '@fc/engine';
import type { LiveAdapter } from './adapter';
import { fixtureFighters, marketsAndBets, matchRow } from './board';
import { loadFixture, ReplaySource } from './replay';

export type Subscribe<T> = (f: (x: T) => void) => () => void;
export type FighterCardData = FighterPublic & { origin: FighterOrigin; creatorHandle: string | null; status: 'active' | 'provisional' | 'retired';
  elo: number; stats: FighterStats | null; categoryStats?: Partial<Record<Category, FighterStats>>; frame: CardFrame; walletAddress: string | null; version: number };
export type MatchRow = { slots?: Slot[]; category?: Category; id: string; number: number; status: MatchStatus; mode: MatchMode; isDemo: boolean; fighterIds: FighterId[];
  problems: ProblemMeta[]; commitHash: string; bettingClosesAt: number; startedAt: number | null; timeLimitMs: number; winnerId: FighterId | null };
export type MarketView = MarketSpec & { status: 'open' | 'locked' | 'settled' | 'void'; result: string | null;
  pools: Record<string, { staked: number; seed: number; bettors: number }>; odds: Record<string, number> };
export type BetRow = { id: string; marketId: string; matchId: string; handle: string; outcome: string; stake: number;
  status: 'open' | 'won' | 'lost' | 'refunded'; payout: number; placedAt: number; mine: boolean };

export type Store = {
  conn: 'connecting' | 'live' | 'offline' | 'replay';
  me: { identity: string; handle: string | null; balanceCents: number; moneyMode: 'ledger' | 'live' } | null;
  fighters: Record<FighterId, FighterCardData>;
  matches: Record<string, MatchRow>; openMatchId: string | null; liveMatchId: string | null;
  markets: Record<string, MarketView>; bets: BetRow[];               // bets: recent public + all of mine
  watch: { matchId: string | null; state: MatchState; mode: 'live' | 'replay'; speed: number; playing: boolean;
           playbackRevision: number };                                 // bumps on watch/seek/reconnect so the arena snaps
  cues$: Subscribe<ArenaCue>;                                         // cues for the watched match only
  register(handle: string): Promise<void>; creditTestFunds(identity: string, amountCents: number): Promise<void>;  // Director only, ledger mode
  claimDemoFunds(): Promise<void>;   // ledger mode: refill +$100 when the balance is under $10
  placeBet(marketId: string, outcome: string, stake: number): Promise<void>;   // rejects with Error(code) from §8.8
  createFighter(spec: ForgeSpec): Promise<FighterId>;
  watchMatch(matchId: string): void; openReplay(src: string, speed?: number): void;
  setSpeed(n: number): void; setPlaying(on: boolean): void;
};

const cueListeners = new Set<(c: ArenaCue) => void>();
/** HEAD-internal: the adapter calls this for each live (non-catch-up) cue. */
export function emitCue(c: ArenaCue): void { cueListeners.forEach((f) => f(c)); }

function safeInitialState(): MatchState {
  try { return initialMatchState(); } catch { return null as unknown as MatchState; }   // engine lands in K-03
}

let liveAdapter: LiveAdapter | null = null;
/** K-06b seam: the SpacetimeDB adapter registers here; network actions delegate to it (see adapter.ts). */
export function setLiveAdapter(a: LiveAdapter | null): void {
  liveAdapter = a;
  const watch = useStore.getState().watch;
  if (a && watch.mode === 'live' && watch.matchId) a.watchMatch(watch.matchId);
}
const viaAdapter = <A extends unknown[], R>(name: keyof LiveAdapter) => async (...args: A): Promise<R> => {
  const fn = liveAdapter?.[name] as ((...a: A) => Promise<R>) | undefined;
  if (!fn) throw new Error('not_connected');
  return fn.apply(liveAdapter, args);
};

const BOARD_EVENTS = new Set<string>(['match.created', 'betting.locked', 'match.started', 'match.timeup', 'match.result', 'match.revealed', 'match.settled', 'match.void']);
let replay: ReplaySource | null = null;
let replayToken = 0;
/** Replay controls beyond the Store type (HEAD debug panel / tests). */
export function getReplay(): ReplaySource | null { return replay; }
export function seekReplay(tMs: number): void { replay?.seek(tMs); }
export function restartReplay(): void { replay?.restart(); }
export function stopReplay(): void { replayToken++; replay?.dispose(); replay = null; }

export const useStore = create<Store>()((set, get) => {
  const publish = (src: ReplaySource, bumpRevision: boolean): void => {
    const fx = src.fixture;
    const { markets, bets } = marketsAndBets(fx, src.cursor);
    set((s) => ({
      matches: { ...s.matches, [fx.matchId]: matchRow(fx, src.state) }, markets, bets,
      watch: { ...s.watch, state: src.state, playbackRevision: s.watch.playbackRevision + (bumpRevision ? 1 : 0) },
    }));
  };
  return {
  conn: 'offline',
  me: null,
  fighters: {},
  matches: {}, openMatchId: null, liveMatchId: null,
  markets: {}, bets: [],
  watch: { matchId: null, state: safeInitialState(), mode: 'live', speed: 1, playing: true, playbackRevision: 0 },
  cues$: (f) => { cueListeners.add(f); return () => { cueListeners.delete(f); }; },
  register: viaAdapter('register'), creditTestFunds: viaAdapter('creditTestFunds'), claimDemoFunds: viaAdapter('claimDemoFunds'),
  placeBet: viaAdapter('placeBet'), createFighter: viaAdapter('createFighter'),
  watchMatch: (matchId) => {
    stopReplay();
    set((s) => ({ conn: liveAdapter ? s.conn : 'offline', watch: { ...s.watch, matchId, mode: 'live', playbackRevision: s.watch.playbackRevision + 1 } }));
    liveAdapter?.watchMatch(matchId);
  },
  openReplay: (src, speed = 1) => {
    stopReplay();
    const token = replayToken;
    set((s) => ({ conn: 'replay', openMatchId: src, watch: { ...s.watch, matchId: src, mode: 'replay', speed, playing: true,
      state: safeInitialState(), playbackRevision: s.watch.playbackRevision + 1 } }));
    loadFixture(src).then((fx) => {
      if (token !== replayToken) return;                        // superseded
      const rs = new ReplaySource(fx, {
        onLive: (_prev, _next, e, cues) => {
          if (BOARD_EVENTS.has(e.type)) publish(rs, false);
          else set((s) => ({ watch: { ...s.watch, state: rs.state } }));
          cues.forEach(emitCue);
        },
        onSnap: () => publish(rs, true),
        onPlayState: (on) => { if (get().watch.playing !== on) set((s) => ({ watch: { ...s.watch, playing: on } })); },
      }, get().watch.speed);
      replay = rs;
      set({ openMatchId: fx.matchId, watch: { ...get().watch, matchId: fx.matchId }, fighters: fixtureFighters(fx) });
      rs.start(get().watch.playing);
    }).catch(() => { if (token === replayToken) set({ conn: 'offline' }); });
  },
  setSpeed: (n) => { replay?.setSpeed(n); set((s) => ({ watch: { ...s.watch, speed: n } })); },
  setPlaying: (on) => { replay?.setPlaying(on); set((s) => ({ watch: { ...s.watch, playing: on } })); },
  };
});

// Keep startup inside the HEAD-owned data boundary: App/ui/arena need no binding imports.
// Explicit fixture URLs stay offline. Vite includes generated bindings only when codegen exists.
if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/replay/') &&
    new URLSearchParams(window.location.search).get('demo') !== '1') {
  useStore.setState({ conn: 'connecting' });
  void Promise.all([import('./live'), import('../config')]).then(([{ createLiveAdapter }, { config }]) => {
    const adapter = createLiveAdapter({ uri: config.stdbUri, db: config.stdbDb, store: useStore, emitCue,
      storage: { getItem: (key) => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) } });
    setLiveAdapter(adapter);
    adapter.connect();
    if (import.meta.hot) import.meta.hot.dispose(() => { adapter.disconnect(); setLiveAdapter(null); });
  }).catch(() => { useStore.setState({ conn: 'offline' }); });
}
