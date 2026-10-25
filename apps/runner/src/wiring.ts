// Runtime graph (PRD §8.9). A plain object O4 consumes; O5/O6 swap implementations behind the interfaces.
import { randomBytes } from 'node:crypto';
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { FighterProblem, FundingAdapter, Problem } from '@fc/contracts';
import { createCandidateSource, type CandidateSource } from './candidates.js';
import { Director, DirectorError, type DirectorHealth } from './control/director.js';
import { loadEnv, type Env } from './env.js';
import { createMockBackend } from './fighters/mock.js';
import { getBackend } from './fighters/registry.js';
import type { FighterBackend } from './fighters/types.js';
import { createFunding } from './funding.js';
import { runMatch, type MatchSummary, type RunMatchDeps } from './match/lifecycle.js';
import type { Candidate, MatchOpts } from './match/types.js';
import { generateProblemSet } from './problems/index.js';
import { createPayments, type Payments } from './payments/index.js';
import { createSeasonLoop, type SeasonLoop } from './season/index.js';
import { connectStdb, type Stdb } from './stdb.js';

export type WireOverrides = {
  stdb?: Stdb;
  payments?: Payments;
  /** Mock engine only: divide fighter waits by this (tests). */
  mockTimeScale?: number;
  /** Per-match option overrides (tests). */
  matchOpts?: Partial<Omit<MatchOpts, 'candidates'>>;
  agentsRoot?: string;
  seasonGapMs?: number;
  log?: (m: string) => void;
};

export type Runtime = {
  env: Env;
  stdb: Stdb;
  payments: Payments;
  funding: FundingAdapter;
  getBackend: typeof getBackend;
  /** Backend for the env's default house engine. */
  defaultBackend: FighterBackend;
  director: Director;
  season: SeasonLoop;
  candidates: CandidateSource;
  /** Stop the season loop and abort any running match; resolves when quiet. */
  shutdown(): Promise<void>;
};

function onPath(bin: string): boolean {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    try { accessSync(join(dir, bin), constants.X_OK); return true; } catch { /* next */ }
  }
  return false;
}

/** Every value that must never reach a log line. */
export function secretValues(env: Env): string[] {
  const e = env as unknown as Record<string, unknown>;
  const keys = Object.keys(e).filter((k) => /^FC_MODEL_|^FC_TIER_|^FC_DIRECT_(MODEL|API_KEY)$|TOKEN$|API_KEY|SECRET|HMAC|^ELEVENLABS_VOICE/.test(k));
  return keys.map((k) => e[k]).filter((v): v is string => typeof v === 'string' && v.length >= 4);
}

const EVENT_STATUS: Record<string, string> = {
  'match.created': 'betting', 'betting.locked': 'locked', 'match.started': 'live', 'match.timeup': 'review', 'match.settled': 'settled',
};

export async function wire(env: Env = loadEnv(), o: WireOverrides = {}): Promise<Runtime> {
  const [stdb, payments] = await Promise.all([o.stdb ? Promise.resolve(o.stdb) : connectStdb(env), o.payments ?? createPayments()]);
  const log = o.log ?? ((m: string) => console.warn(`[runner] ${m}`));
  const candidates = createCandidateSource(env, { agentsRoot: o.agentsRoot });

  // Reference answers for the mock engine: the backend only sees FighterProblem, so keep the problem sets of live matches.
  const liveSets = new Map<string, Problem[]>();
  const answerFor = (p: FighterProblem): string | null => {
    for (const ps of liveSets.values()) {
      const m = ps.find((q) => q.idx === p.idx && q.integrand === p.integrand);
      if (m) return m.reference;
    }
    return null;
  };
  const mockBackend = createMockBackend({ answerFor, timeScale: o.mockTimeScale });
  const backendFor = (c: Candidate): FighterBackend => (c.engine === 'mock' ? mockBackend : getBackend(c.engine));

  const deps: RunMatchDeps = { stdb, backendFor, log: (m) => log(m) };
  const baseOpts: Omit<MatchOpts, 'candidates'> = {
    timeLimitMs: env.FC_MATCH_MS, bettingWindowMs: env.FC_BET_WINDOW_S * 1000, introMs: env.FC_INTRO_MS,
    communitySlots: env.FC_COMMUNITY_SLOTS, ...o.matchOpts,
  };

  let director!: Director;
  const aborts = new Map<string, AbortController>();
  let busy = false;   // one match at a time across director + season loop

  /** Start one match. Returns as soon as the id exists; `done` settles with the summary. */
  function startOne(opts: Omit<MatchOpts, 'candidates'> & { candidates: Candidate[] }, track: boolean): { matchId: string; done: Promise<MatchSummary> } {
    if (busy) throw new DirectorError(409, 'match_active', 'A match is already active');
    busy = true;
    const matchId = opts.matchId ?? `m_${randomBytes(5).toString('hex')}`;
    const seed = opts.seed ?? randomBytes(16).toString('hex');
    liveSets.set(matchId, generateProblemSet(seed).problems);
    const ctl = new AbortController();
    aborts.set(matchId, ctl);
    const off = track ? stdb.onEvent(matchId, (e) => { const s = EVENT_STATUS[e.type]; if (s) director.setMatchStatus(matchId, s); }) : () => {};
    const done = runMatch(deps, { ...opts, matchId, seed, signal: ctl.signal }).then((s) => {
      candidates.played(s.standings.map((x) => x.fighterId), s.elo);
      return s;
    }).finally(() => { off(); liveSets.delete(matchId); aborts.delete(matchId); busy = false; });
    return { matchId, done };
  }

  const season: SeasonLoop = createSeasonLoop({
    runMatch: (opts) => startOne(opts, false).done,
    candidates: async () => (director.currentMatch() || busy ? [] : candidates.list()),
    matchOpts: { ...baseOpts },
    betWindowS: env.FC_SEASON_BET_WINDOW_S,
    maxSessionsPerHour: env.FC_MAX_SESSIONS_PER_HOUR,
    maxCreditsPerHour: env.FC_MAX_CREDITS_PER_HOUR ?? null,
    demoReserve: env.FC_DEMO_RESERVE,
    killed: () => env.FC_KILL,
    creditsOf: (s) => s.usage.factoryCredits,
    sessionsOf: (s) => s.usage.sessions,
    gapMs: o.seasonGapMs,
    log: (m) => log(m),
    onPlayed: (s) => { if (s) director.noteMatchPlayed(); },
    onPause: (r) => director.pauseSeason(r),
  });

  director = new Director({
    mode: env.FC_MODE, engine: env.FC_ENGINE,
    async runMatch(opts) {
      const all = await candidates.list();
      const pool = opts.fighters ? all.filter((c) => opts.fighters!.includes(c.fighter.id)) : all;
      if (pool.length < 4) throw new DirectorError(400, 'not_enough_fighters', 'Need at least 4 eligible fighters');
      const { matchId, done } = startOne({ ...baseOpts, candidates: pool, ...(opts.betWindowS ? { bettingWindowMs: opts.betWindowS * 1000 } : {}) }, true);
      return { matchId, done };
    },
    lockMatch: (id) => stdb.lockMatch({ matchId: id }),
    voidMatch: async (id, reason) => { aborts.get(id)?.abort(); await stdb.voidMatch({ matchId: id, reason }); },
    onSeason: (on) => { if (on) season.start(); else void season.stop(); },
    creditsHour: () => season.creditsHour(),
    stdbStatus: () => stdb.status(),
    droidStatus: () => (env.FC_ENGINE === 'mock' ? 'mock' : onPath('droid') ? 'ok' : 'down'),
    paymentsStatus: () => (payments.enabled ? 'ok' : 'off'),
    secrets: () => secretValues(env),
    seasonOn: false,
  });
  // Health merges the loop's own status (played/credits/pause reason) over the director's counters.
  const baseHealth = director.health.bind(director);
  director.health = (): DirectorHealth => {
    const h = baseHealth(); const st = season.status();
    return { ...h, season: { on: st.on || h.season.on, played: Math.max(st.played, h.season.played), creditsHour: st.creditsHour, pausedReason: st.pausedReason ?? h.season.pausedReason } };
  };

  return {
    env, stdb, payments, funding: createFunding(env.FC_MONEY_MODE), getBackend, defaultBackend: getBackend(env.FC_ENGINE),
    director, season, candidates,
    async shutdown() {
      const stopping = season.stop();               // loop exits after its current match
      for (const c of aborts.values()) c.abort();   // ring the bell now; the match still reviews/settles
      await stopping;
    },
  };
}
