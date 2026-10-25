// Domain types (PRD §8.2).
import type { Archetype, FighterId, SkinSpec } from './roster.js';

export type Category = 'integrals' | 'code' | 'speed-math' | 'logic' | 'chess' | 'trivia' | 'web' | 'squads';
export type AnswerFormat = 'expression' | 'number' | 'json' | 'text' | 'javascript';
export type CodeEvaluation = { kind: 'code'; format: 'javascript'; prompt: string; tests: { inputJson: string; outputJson: string }[]; liveTests: number };
export type ExactEvaluation = { kind: 'exact'; format: 'number' | 'json' | 'text'; caseSensitive?: boolean; prompt: string; answers: string[] };
export type ProblemIdx = 1 | 2 | 3 | 4 | 5;
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Interval = [number, number];

export type Problem = {
  idx: ProblemIdx; difficulty: Difficulty; points: 10 | 20 | 30 | 40 | 50;
  family: string;                  // §11.4 family id, e.g. 'parts_poly_exp'
  statementTex: string;            // '\\int x e^{2x}\\,dx'
  integrand: string;               // mathjs syntax: 'x*exp(2*x)'
  liveDomain: Interval;            // 3 live sample points are drawn here
  finalDomains: Interval[];        // 48 final sample points are drawn across these
  reference: string;               // a correct antiderivative (mathjs syntax)
  trap: boolean;
  evaluation?: ExactEvaluation | CodeEvaluation;    // private until reveal; never sent to fighters
};
export type ProblemSet = { category: Category; seed: string; problems: Problem[] };   // seed: 32 hex chars
export type ProblemMeta = Pick<Problem, 'idx' | 'difficulty' | 'points'>;               // public before reveal
export type FighterProblem = Pick<Problem, 'idx' | 'difficulty' | 'points' | 'statementTex' | 'integrand'> & { category?: Category; prompt?: string; answerFormat?: AnswerFormat }; // sent to fighters at the bell

export type Slot = 0 | 1 | 2 | 3;                // 0 left float · 1 main-left · 2 main-right · 3 right float
export type MatchStatus = 'scheduled' | 'open' | 'locked' | 'live' | 'review' | 'settled' | 'void';
export type MatchMode = 'live' | 'mock';

export type Strategy = {
  verify: boolean;                                              // mathematical re-derivation only; native execution disabled
  order: 'in_order' | 'easy_first' | 'hard_first' | 'points_per_risk';
  risk: 'cautious' | 'bold';
  taunts: 0 | 1 | 2 | 3;
};
export type EngineTier = 'standard' | 'pro';
export type FighterOrigin = 'house' | 'community' | 'byo_http' | 'byo_uagent';

export type ForgeSpec = {                         // create_fighter argument (also the reducer arg object)
  name: string; title: string; catchphrase: string; archetype: Archetype;
  persona: string;                                // ≤ 600 chars, untrusted (FC-F-066)
  strategy: Strategy; tier: EngineTier; skin: SkinSpec;
  payoutAddress?: string;                         // 0x… Base Sepolia (FC-F-205)
  endpointUrl?: string;                           // BYO HTTP (FC-F-204)
};

export type Standing = {
  fighterId: FighterId; rank: 1 | 2 | 3 | 4; points: number; scorePct: number;   // 0..1
  hits: number; misses: number; overturned: number; yellow: number; red: number;
  firstHitMs: number | null; lastScoreMs: number | null;
  clutchPoints: number;          // final points from hits in the last 25% of the time limit
  missesRecovered: number;       // misses followed later by a surviving hit (GRT)
};

export type MarketKind = 'winner' | 'score_line' | 'beat_clock' | 'first_blood' | 'team_winner';
export type MarketSpec = {
  id: string;                    // `${matchId}:${kind}` or `${matchId}:${kind}:${subject}`
  kind: MarketKind; subject: FighterId | null; line: number | null;   // score_line: pct 0..1; beat_clock: ms
  label: string;                 // 'VEX ≥ 60%' · 'Anyone solves 5★ before 1:00?'
  outcomes: string[];            // winner/first_blood: fighter ids (+ 'none'); score_line: ['over','under']; beat_clock: ['yes','no']
  seeds: number[];               // cents per outcome, same order as outcomes
  rakeBps: number;               // 500
};

export type FighterStats = {
  fighterId: FighterId; category: Category; matches: number; wins: number; podiums: number;
  avgScorePct: number; spd: number; acc: number; clu: number; dis: number; grt: number; con: number; ovr: number;
  form: string;                  // last 5, newest first, e.g. 'WLWPL' (W win · P podium 2–3 · L 4th)
  streak: number;                // + consecutive wins / − consecutive non-wins
  upsetUntil: number | null;     // epoch ms
  eloHistory: number[];          // last 20, oldest first
  backersWon: number; earningsUsdc: number;
};
export type EntryRow = Standing & { matchId: string; slot: Slot; mode: MatchMode; isDemo: boolean; voided: boolean;
  timeLimitMs: number; endedAt: number; eloBefore: number; eloAfter: number | null; wonAtOdds: number | null };  // wonAtOdds: winner-market decimal odds at lock
export type CardTier = 'bronze' | 'silver' | 'gold' | 'elite';
export type CardFrame = CardTier | 'hot_streak' | 'upset' | 'rookie';
