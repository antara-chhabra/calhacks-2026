// Web data layer (PRD §8.7). HEAD-owned. G-1 stub: the types are final; the store is inert until K-06 wires the
// SpacetimeDB adapter and the replay source. O1 and O2 read this store and never import generated bindings.
import { create } from 'zustand';
import type {
  CardFrame, FighterId, FighterOrigin, FighterPublic, FighterStats, ForgeSpec, MarketSpec, MatchMode, MatchStatus, ProblemMeta,
} from '@fc/contracts';
import { initialMatchState, type ArenaCue, type MatchState } from '@fc/engine';

export type Subscribe<T> = (f: (x: T) => void) => () => void;
export type FighterCardData = FighterPublic & { origin: FighterOrigin; creatorHandle: string | null; status: 'active' | 'provisional' | 'retired';
  elo: number; stats: FighterStats | null; frame: CardFrame; walletAddress: string | null; version: number };
export type MatchRow = { id: string; number: number; status: MatchStatus; mode: MatchMode; isDemo: boolean; fighterIds: FighterId[];
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
  placeBet(marketId: string, outcome: string, stake: number): Promise<void>;   // rejects with Error(code) from §8.8
  createFighter(spec: ForgeSpec): Promise<FighterId>;
  watchMatch(matchId: string): void; openReplay(src: string, speed?: number): void;
  setSpeed(n: number): void; setPlaying(on: boolean): void;
};

const cueListeners = new Set<(c: ArenaCue) => void>();
/** HEAD-internal: the adapter calls this for each live (non-catch-up) cue. */
export function emitCue(c: ArenaCue): void { cueListeners.forEach((f) => f(c)); }

const notWired = async (): Promise<never> => { throw new Error('not_connected'); };

function safeInitialState(): MatchState {
  try { return initialMatchState(); } catch { return null as unknown as MatchState; }   // engine lands in K-03
}

export const useStore = create<Store>()((set) => ({
  conn: 'offline',
  me: null,
  fighters: {},
  matches: {}, openMatchId: null, liveMatchId: null,
  markets: {}, bets: [],
  watch: { matchId: null, state: safeInitialState(), mode: 'live', speed: 1, playing: true, playbackRevision: 0 },
  cues$: (f) => { cueListeners.add(f); return () => { cueListeners.delete(f); }; },
  register: notWired, creditTestFunds: notWired, placeBet: notWired, createFighter: notWired,
  watchMatch: (matchId) => set((s) => ({ watch: { ...s.watch, matchId, mode: 'live', playbackRevision: s.watch.playbackRevision + 1 } })),
  openReplay: (src, speed = 1) => set((s) => ({ watch: { ...s.watch, matchId: src, mode: 'replay', speed, playbackRevision: s.watch.playbackRevision + 1 } })),
  setSpeed: (n) => set((s) => ({ watch: { ...s.watch, speed: n } })),
  setPlaying: (on) => set((s) => ({ watch: { ...s.watch, playing: on } })),
}));
