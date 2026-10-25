// Pure helpers for the match lifecycle reducers (PRD §8.5, §8.5.1, §8.8). No SpacetimeDB imports so vitest can run them.

export type MatchStatus = 'open' | 'locked' | 'live' | 'review' | 'settled' | 'void';

/** Runner-postable event types (mirror of RUNNER_POSTABLE in @fc/contracts; a test pins the two together). */
export const RUNNER_POSTABLE_TYPES: readonly string[] = [
  'match.intro', 'fighter.thinking', 'fighter.tool', 'fighter.say', 'fighter.submit', 'verdict.live',
  'referee.card', 'fighter.hint', 'fighter.done', 'fighter.out', 'verdict.final',
];

export const MAX_POSTED_EVENTS = 64;
export const MIN_SEED_CENTS = 50n;

const FORWARD: Record<string, MatchStatus | undefined> = { open: 'locked', locked: 'live', live: 'review', review: 'settled' };

/** FC-F-001: legal transitions are the forward chain plus void from any status before settled. */
export function canTransition(from: string, to: MatchStatus): boolean {
  if (to === 'void') return from === 'open' || from === 'locked' || from === 'live' || from === 'review';
  return FORWARD[from] === to;
}

/** §8.5.1: match.intro only while locked (it precedes match.started); verdict.final only in review; the rest while live. */
export function eventAllowedIn(status: string, type: string): boolean {
  if (!RUNNER_POSTABLE_TYPES.includes(type)) return false;
  if (type === 'match.intro') return status === 'locked';
  return type === 'verdict.final' ? status === 'review' : status === 'live';
}

export type PostCheck = { ok: true } | { ok: false; code: 'bad_event' | 'bad_status'; detail: string };

/**
 * Validates one posted event. Type allowlist and JSON syntax are checked here; full zod validation of `data`
 * (parseRunnerPostable, ADR-015) is applied by the runner before posting and by every client on receive
 * (the module bundle does not import workspace packages, see docs/requests/O3.md).
 */
export function checkPostedEvent(status: string, type: string, data: string): PostCheck {
  if (!RUNNER_POSTABLE_TYPES.includes(type)) return { ok: false, code: 'bad_event', detail: `type not runner-postable: ${type}` };
  if (!eventAllowedIn(status, type)) return { ok: false, code: 'bad_status', detail: `${type} not allowed while ${status}` };
  let parsed: unknown;
  try { parsed = JSON.parse(data); } catch { return { ok: false, code: 'bad_event', detail: 'data is not valid JSON' }; }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, code: 'bad_event', detail: 'data must be a JSON object' };
  }
  return { ok: true };
}

export function checkPostedBatch(status: string, events: { type: string; data: string }[]): PostCheck {
  if (events.length > MAX_POSTED_EVENTS) return { ok: false, code: 'bad_event', detail: `more than ${MAX_POSTED_EVENTS} events` };
  for (const e of events) {
    const r = checkPostedEvent(status, e.type, e.data);
    if (!r.ok) return r;
  }
  return { ok: true };
}

/** MarketSpec.seeds are already cents (§8.2; the runner applies the §11.8 totals ×100 via seedSplit); floor at 50¢. */
export function seedToCents(seed: bigint): bigint {
  return seed < MIN_SEED_CENTS ? MIN_SEED_CENTS : seed;
}

export type CreateArgs = {
  category?: string; id: string; fighterIds: string[]; slots: number[]; problems: unknown[]; bettingWindowMs: number; timeLimitMs: number;
  markets: { id: string; outcomes: string[]; seeds: bigint[] }[];
};

/** Returns an error code or null. */
export function validateCreateMatch(a: CreateArgs): 'bad_match' | 'bad_market' | null {
  if (!a.id || (a.category !== undefined && !['integrals', 'code', 'speed-math', 'logic', 'chess', 'trivia', 'web', 'squads'].includes(a.category))) return 'bad_match';
  if (a.category === 'squads' && a.fighterIds.length !== 4) return 'bad_match';
  const n = a.fighterIds.length;
  if (n < 2 || n > 4 || a.slots.length !== n || new Set(a.fighterIds).size !== n || new Set(a.slots).size !== n) return 'bad_match';
  if (a.problems.length !== 5 || a.bettingWindowMs <= 0 || a.timeLimitMs <= 0) return 'bad_match';
  const ids = new Set<string>();
  for (const m of a.markets) {
    if (!m.id || ids.has(m.id) || m.outcomes.length < 2 || new Set(m.outcomes).size !== m.outcomes.length || m.seeds.length !== m.outcomes.length) return 'bad_market';
    ids.add(m.id);
  }
  return null;
}

export const poolId = (marketId: string, outcome: string): string => `${marketId}#${outcome}`;
export const entryId = (matchId: string, fighterId: string): string => `${matchId}:${fighterId}`;

/** betting.locked data: { marketId: { outcome: staked } } in cents (seeds excluded). */
export function poolsSnapshot(rows: { marketId: string; outcome: string; staked: bigint }[]): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.marketId] ??= {})[r.outcome] = Number(r.staked);
  return out;
}

export type StandingIn = {
  fighterId: string; rank: number; points: number; scorePct: number; hits: number; misses: number; overturned: number;
  yellow: number; red: number; firstHitMs: number | undefined | null; lastScoreMs: number | undefined | null;
  clutchPoints: number; missesRecovered: number;
};

/** Standings must cover each entered fighter exactly once, with ranks in 1..N. */
export function validateStandings(entryFighterIds: string[], standings: StandingIn[]): 'bad_standings' | null {
  if (standings.length !== entryFighterIds.length) return 'bad_standings';
  const seen = new Set<string>();
  for (const s of standings) {
    if (!entryFighterIds.includes(s.fighterId) || seen.has(s.fighterId)) return 'bad_standings';
    seen.add(s.fighterId);
    if (!Number.isInteger(s.rank) || s.rank < 1 || s.rank > entryFighterIds.length) return 'bad_standings';
  }
  return null;
}

/** The winner is the unique rank-1 fighter; a tie for first yields no winner. */
export function winnerOf(standings: StandingIn[]): string | undefined {
  const top = standings.filter((s) => s.rank === 1);
  return top.length === 1 ? top[0]!.fighterId : undefined;
}

/** SpacetimeDB options arrive as undefined; the event contract uses null. */
export function standingToEvent(s: StandingIn) {
  return { ...s, firstHitMs: s.firstHitMs ?? null, lastScoreMs: s.lastScoreMs ?? null };
}
