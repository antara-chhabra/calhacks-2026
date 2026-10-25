// zod schemas for every domain type and every FightEvent `data` (K-02). Types in roster/domain/events are the contract;
// the Eq assertions at the bottom fail typecheck if a schema drifts from them.
import { z } from 'zod';
import type { Archetype, Build, EmblemId, FighterPublic, HeadId, WeaponId, SkinSpec } from './roster.js';
import type {
  CardFrame, CardTier, Category, Difficulty, EngineTier, EntryRow, FighterOrigin, FighterProblem, FighterStats, ForgeSpec,
  MarketKind, MarketSpec, MatchMode, MatchStatus, Problem, ProblemIdx, ProblemMeta, ProblemSet, Slot, Standing, Strategy,
} from './domain.js';
import { RUNNER_POSTABLE } from './events.js';
import type { FightEnvelope, FightEvent, FightEventType, ToolKind } from './events.js';

/* ---------- primitives ---------- */
const lit = <const T extends readonly [string, ...string[]]>(v: T) => z.enum(v as unknown as [T[number], ...T[number][]]);
const int = z.number().int();
const nonNegInt = int.nonnegative();
const fighterIdSchema = z.string().min(1).max(32);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const interval = z.tuple([z.number(), z.number()]);

/* ---------- roster ---------- */
export const archetypeSchema = lit(['brawler', 'scholar', 'trickster', 'tank', 'speedster']) satisfies z.ZodType<Archetype>;
export const headIdSchema = lit(['horned_helm', 'topknot', 'goggles_mohawk', 'monocle_tophat', 'great_helm', 'big_helmet', 'hood', 'crown']) satisfies z.ZodType<HeadId>;
export const weaponIdSchema = lit(['greatsword', 'katana', 'sawblade', 'rapier', 'cleaver', 'wooden_sword']) satisfies z.ZodType<WeaponId>;
export const emblemIdSchema = lit(['skull', 'lotus', 'bolt', 'quill', 'shield', 'star', 'flame', 'eye']) satisfies z.ZodType<EmblemId>;
export const buildSchema = lit(['lean', 'standard', 'heavy']) satisfies z.ZodType<Build>;

export const skinSpecSchema = z.object({
  palette: z.object({ primary: hexColor, secondary: hexColor, accent: hexColor, skin: hexColor }),
  head: headIdSchema, weapon: weaponIdSchema, emblem: emblemIdSchema, build: buildSchema,
});

export const fighterPublicSchema = z.object({
  id: fighterIdSchema, name: z.string().min(1).max(24), title: z.string().max(32), archetype: archetypeSchema,
  skin: skinSpecSchema, catchphrase: z.string().max(60), bio: z.string().max(200), strategyBlurb: z.string().max(120),
});

/* ---------- domain ---------- */
export const categorySchema = lit(['integrals', 'code', 'web']);
export const problemIdxSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export const difficultySchema = problemIdxSchema;
export const pointsSchema = z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(40), z.literal(50)]);
export const slotSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const matchStatusSchema = lit(['scheduled', 'open', 'locked', 'live', 'review', 'settled', 'void']);
export const matchModeSchema = lit(['live', 'mock']);
export const engineTierSchema = lit(['standard', 'pro']);
export const fighterOriginSchema = lit(['house', 'community', 'byo_http', 'byo_uagent']);
export const cardTierSchema = lit(['bronze', 'silver', 'gold', 'elite']);
export const cardFrameSchema = lit(['bronze', 'silver', 'gold', 'elite', 'hot_streak', 'upset', 'rookie']);
export const marketKindSchema = lit(['winner', 'score_line', 'beat_clock', 'first_blood', 'team_winner']);

export const problemSchema = z.object({
  idx: problemIdxSchema, difficulty: difficultySchema, points: pointsSchema,
  family: z.string().min(1).max(64), statementTex: z.string().min(1).max(500), integrand: z.string().min(1).max(500),
  liveDomain: interval, finalDomains: z.array(interval).min(1).max(16), reference: z.string().min(1).max(500), trap: z.boolean(),
});
export const problemSetSchema = z.object({
  category: z.literal('integrals'), seed: z.string().regex(/^[0-9a-f]{32}$/), problems: z.array(problemSchema).length(5),
});
export const problemMetaSchema = problemSchema.pick({ idx: true, difficulty: true, points: true });
export const fighterProblemSchema = problemSchema.pick({ idx: true, difficulty: true, points: true, statementTex: true, integrand: true });

export const strategySchema = z.object({
  verify: z.boolean(), order: lit(['in_order', 'easy_first', 'hard_first', 'points_per_risk']),
  risk: lit(['cautious', 'bold']), taunts: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});

export const forgeSpecSchema = z.object({
  name: z.string().min(1).max(24), title: z.string().max(32), catchphrase: z.string().max(60), archetype: archetypeSchema,
  persona: z.string().max(600), strategy: strategySchema, tier: engineTierSchema, skin: skinSpecSchema,
  payoutAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
  endpointUrl: z.string().url().max(512).optional(),
});

export const standingSchema = z.object({
  fighterId: fighterIdSchema, rank: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  points: int, scorePct: z.number().min(0).max(1),
  hits: nonNegInt, misses: nonNegInt, overturned: nonNegInt, yellow: nonNegInt, red: nonNegInt,
  firstHitMs: nonNegInt.nullable(), lastScoreMs: nonNegInt.nullable(),
  clutchPoints: int, missesRecovered: nonNegInt,
});

export const marketSpecSchema = z.object({
  id: z.string().min(1).max(128), kind: marketKindSchema, subject: fighterIdSchema.nullable(), line: z.number().nullable(),
  label: z.string().min(1).max(120), outcomes: z.array(z.string().min(1)).min(2), seeds: z.array(nonNegInt),
  rakeBps: nonNegInt.max(10_000),
});

export const fighterStatsSchema = z.object({
  fighterId: fighterIdSchema, category: categorySchema, matches: nonNegInt, wins: nonNegInt, podiums: nonNegInt,
  avgScorePct: z.number(), spd: z.number(), acc: z.number(), clu: z.number(), dis: z.number(), grt: z.number(), con: z.number(), ovr: z.number(),
  form: z.string().regex(/^[WPL]{0,5}$/), streak: int, upsetUntil: nonNegInt.nullable(),
  eloHistory: z.array(z.number()).max(20), backersWon: nonNegInt, earningsUsdc: z.number(),
});

export const entryRowSchema = standingSchema.extend({
  matchId: z.string().min(1), slot: slotSchema, mode: matchModeSchema, isDemo: z.boolean(), voided: z.boolean(),
  timeLimitMs: nonNegInt, endedAt: nonNegInt, eloBefore: z.number(), eloAfter: z.number().nullable(), wonAtOdds: z.number().nullable(),
});

/* ---------- fight events ---------- */
const toolKindSchema = lit(['read', 'write', 'run', 'other']);
const emptyData = z.object({});

export const eventDataSchemas = {
  'match.created': z.object({
    category: categorySchema, mode: matchModeSchema, isDemo: z.boolean(), fighters: z.array(fighterIdSchema).min(2).max(4),
    slots: z.array(slotSchema).min(2).max(4), problems: z.array(problemMetaSchema).length(5), commitHash: z.string().min(1),
    bettingClosesAt: nonNegInt, timeLimitMs: nonNegInt,
  }),
  'betting.locked': z.object({ pools: z.record(z.record(nonNegInt)) }),
  'purse.entry': z.object({ fighterId: fighterIdSchema, amountUsdc: z.number().nonnegative(), txRef: z.string().nullable(), coveredByHouse: z.boolean() }),
  'match.intro': z.object({ lines: z.record(z.string().max(200)) }),
  'match.started': emptyData,
  'fighter.thinking': z.object({ fighterId: fighterIdSchema }),
  'fighter.tool': z.object({ fighterId: fighterIdSchema, tool: toolKindSchema, label: z.string().max(48) }),
  'fighter.say': z.object({ fighterId: fighterIdSchema, text: z.string().min(1).max(80), source: lit(['model', 'canned']) }),
  'fighter.submit': z.object({ fighterId: fighterIdSchema, problem: problemIdxSchema, attempt: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
  'verdict.live': z.object({
    fighterId: fighterIdSchema, problem: problemIdxSchema, ok: z.boolean(), points: int,
    reason: lit(['hit', 'mismatch', 'invalid_syntax', 'time_up', 'attempts']), replaced: z.boolean(),
  }),
  'referee.card': z.object({ fighterId: fighterIdSchema, color: lit(['yellow', 'red']), reason: z.string().max(60), penalty: z.number() }),
  'fighter.hint': z.object({ fighterId: fighterIdSchema, problem: problemIdxSchema, txRef: z.string().nullable() }),
  'fighter.done': z.object({ fighterId: fighterIdSchema }),
  'fighter.out': z.object({ fighterId: fighterIdSchema, reason: lit(['red_card', 'timeout', 'crash', 'budget']) }),
  'match.timeup': emptyData,
  'verdict.final': z.object({ fighterId: fighterIdSchema, problem: problemIdxSchema, overturned: z.boolean(), points: int.max(0) }),
  'match.result': z.object({ standings: z.array(standingSchema).min(1).max(4) }),
  'match.revealed': z.object({ problemSet: problemSetSchema, salt: z.string().min(1) }),
  'match.settled': z.object({
    results: z.array(z.object({ marketId: z.string().min(1), outcome: z.string().min(1) })),
    totalPaid: nonNegInt, elo: z.record(z.tuple([z.number(), z.number()])), ovr: z.record(z.tuple([z.number(), z.number()])),
  }),
  'purse.paid': z.object({ fighterId: fighterIdSchema, amountUsdc: z.number().nonnegative(), txHash: z.string().min(1), to: z.string().min(1) }),
  'match.void': z.object({ reason: z.string().min(1).max(200) }),
} satisfies { [K in FightEventType]: z.ZodType<Extract<FightEvent, { type: K }>['data']> };

// Re-typed with the explicit mapped annotation the contract asks for.
export const eventDataSchemasTyped: { [K in FightEventType]: z.ZodType<Extract<FightEvent, { type: K }>['data']> } = eventDataSchemas;

const eventObject = <K extends FightEventType>(type: K) =>
  z.object({ type: z.literal(type), data: eventDataSchemas[type] });

type Member = z.ZodObject<{ type: z.ZodTypeAny } & z.ZodRawShape>;
const types = Object.keys(eventDataSchemas) as FightEventType[];
const eventMembers = types.map((t) => eventObject(t)) as unknown as [Member, Member, ...Member[]];
const envelopeShape = { v: z.literal(1), matchId: z.string().min(1), seq: int.min(1), t: nonNegInt };

export const fightEventSchema = z.discriminatedUnion('type', eventMembers) as unknown as z.ZodType<FightEvent>;
export const fightEnvelopeSchema = z.discriminatedUnion(
  'type',
  eventMembers.map((m) => m.extend(envelopeShape)) as unknown as [Member, Member, ...Member[]],
) as unknown as z.ZodType<FightEnvelope>;

/** ADR-015: parse a runner-posted event; rejects non-runner types, bad JSON and bad data. */
export function parseRunnerPostable(type: string, dataJson: string):
  { ok: true; event: FightEvent } | { ok: false; error: string } {
  if (!(RUNNER_POSTABLE as string[]).includes(type)) return { ok: false, error: `type not runner-postable: ${type}` };
  let raw: unknown;
  try { raw = JSON.parse(dataJson); } catch { return { ok: false, error: 'data is not valid JSON' }; }
  const r = fightEventSchema.safeParse({ type, data: raw });
  return r.success ? { ok: true, event: r.data } : { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
}

/* ---------- drift guards: schema output must equal the contract type both ways ---------- */
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertEq = <_T extends true>(): void => {};
type I<S extends z.ZodTypeAny> = z.infer<S>;
assertEq<Eq<I<typeof skinSpecSchema>, SkinSpec>>();
assertEq<Eq<I<typeof fighterPublicSchema>, FighterPublic>>();
assertEq<Eq<I<typeof categorySchema>, Category>>();
assertEq<Eq<I<typeof problemIdxSchema>, ProblemIdx>>();
assertEq<Eq<I<typeof difficultySchema>, Difficulty>>();
assertEq<Eq<I<typeof slotSchema>, Slot>>();
assertEq<Eq<I<typeof matchStatusSchema>, MatchStatus>>();
assertEq<Eq<I<typeof matchModeSchema>, MatchMode>>();
assertEq<Eq<I<typeof engineTierSchema>, EngineTier>>();
assertEq<Eq<I<typeof fighterOriginSchema>, FighterOrigin>>();
assertEq<Eq<I<typeof cardTierSchema>, CardTier>>();
assertEq<Eq<I<typeof cardFrameSchema>, CardFrame>>();
assertEq<Eq<I<typeof marketKindSchema>, MarketKind>>();
assertEq<Eq<I<typeof problemSchema>, Problem>>();
assertEq<Eq<I<typeof problemSetSchema>, ProblemSet>>();
assertEq<Eq<I<typeof problemMetaSchema>, ProblemMeta>>();
assertEq<Eq<I<typeof fighterProblemSchema>, FighterProblem>>();
assertEq<Eq<I<typeof strategySchema>, Strategy>>();
assertEq<Eq<I<typeof forgeSpecSchema>, ForgeSpec>>();
assertEq<Eq<I<typeof standingSchema>, Standing>>();
assertEq<Eq<I<typeof marketSpecSchema>, MarketSpec>>();
assertEq<Eq<I<typeof fighterStatsSchema>, FighterStats>>();
assertEq<Eq<I<typeof entryRowSchema>, EntryRow>>();
assertEq<Eq<I<typeof toolKindSchema>, ToolKind>>();
type DataEq = { [K in FightEventType]: Eq<I<(typeof eventDataSchemas)[K]>, Extract<FightEvent, { type: K }>['data']> };
assertEq<DataEq[FightEventType]>();
