// Match runtime types (R-02a). The internal MatchRecord is what R-02b consumes for review/settle.
import type {
  Category, EngineTier, FighterId, FighterOrigin, FighterPublic, MarketSpec, MatchMode, ProblemIdx, ProblemSet, Slot, Strategy,
} from '@fc/contracts';
import type { FighterBackend, FighterRunResult } from '../fighters/types.js';
import type { Stdb } from '../stdb.js';

/** One fighter eligible for scheduling, with everything needed to run it. */
export type Candidate = {
  fighter: FighterPublic;
  origin: FighterOrigin;
  engine: FighterBackend['engine'];
  persona: string;
  strategy: Strategy;
  tier?: EngineTier;
  elo: number;
  lastMatchAt: number;            // epoch ms; 0 = never fought
  debutPending?: boolean;
  active?: boolean;               // default true
  modelId?: string | null;        // secret: never logged
  reasoningEffort?: string | null;
  endpointUrl?: string | null; submitUrl?: string | null; token?: string | null;
};

export type MatchDeps = {
  stdb: Stdb;
  backendFor: (c: Candidate) => FighterBackend;
  now?: () => number;
  /** Lines for match.intro. Default: agents/house/<id>.lines.json if present, else the catchphrase. */
  introLine?: (c: Candidate, rnd: () => number) => string | null;
  log?: (msg: string) => void;
};

export type MatchOpts = {
  candidates: Candidate[];
  category?: Category;
  mode?: MatchMode;
  isDemo?: boolean;
  timeLimitMs: number;
  bettingWindowMs: number;
  introMs: number;
  communitySlots?: number;        // FC_COMMUNITY_SLOTS, default 1
  /** Call lock_match straight away instead of waiting for auto_lock. */
  lockEarly?: boolean;
  /** Extra wait beyond the betting window before the runner locks itself. Default 1500. */
  lockGraceMs?: number;
  /** Deterministic inputs for tests; production leaves these unset (random). */
  matchId?: string; seed?: string; salt?: string; rngSeed?: string;
  /** Season rate r for Beat the Clock (FC-F-105), default 0.5. */
  beatClockRate?: number;
  /** Per-fighter past scorePct histories for the score-line market. */
  scoreHistory?: Record<FighterId, number[]>;
  sandboxRoot?: string;
  agentsDir?: string;
  /** Throttles (FC-F-043). Defaults 1500 / 4000 ms. */
  toolMinMs?: number; thinkingMinMs?: number;
  flushIntervalMs?: number;       // default 100 (10 Hz)
  abortGraceMs?: number;          // wait for aborted backends, default 1500
  /** External kill: ends the live phase immediately (treated like the bell). */
  signal?: AbortSignal;
};

export type AcceptedAnswer = { answer: string; attempt: number; points: number; atMs: number };

export type FighterOutcome = {
  fighterId: FighterId;
  state: 'done' | 'out' | 'running';             // 'running' = still working at the bell
  outReason: 'red_card' | 'timeout' | 'crash' | 'budget' | null;
  result: FighterRunResult | null;
  yellow: number; red: number; submissions: number;
};

export type MatchRecord = {
  matchId: string; category: Category; mode: MatchMode; isDemo: boolean;
  fighters: FighterId[]; slots: Slot[]; candidates: Candidate[];
  problemSet: ProblemSet; salt: string; commitHash: string;
  markets: MarketSpec[];
  timeLimitMs: number; startedAt: number; endedAt: number;
  /** Latest accepted answer per fighter per problem (input to the strict final review). */
  answers: Record<FighterId, Partial<Record<ProblemIdx, AcceptedAnswer>>>;
  outcomes: Record<FighterId, FighterOutcome>;
  endedBy: 'bell' | 'all_finished' | 'signal';
  sandboxRoot: string;
};
