// Season loop (R-04): back-to-back real matches with a rolling 1-hour budget guard (FC-F-260/261/064/065).
import type { Candidate, MatchOpts } from '../match/types.js';
import type { MatchSummary } from '../match/lifecycle.js';

const HOUR_MS = 3_600_000;

export type SeasonStatus = {
  on: boolean; played: number; creditsHour: number; sessionsHour: number;
  pausedReason: string | null; season: number; nextMatchEta: number | null;   // epoch ms
};

export type SeasonLoopDeps = {
  /** Run one real match. Injected (production: runMatch bound to RunMatchDeps). */
  runMatch(opts: MatchOpts): Promise<MatchSummary>;
  /** Eligible fighters; fair rotation is the scheduler's job, the loop passes them through. */
  candidates(): Candidate[] | Promise<Candidate[]>;
  /** Base per-match options (timeLimitMs, introMs, ...). bettingWindowMs is set from betWindowS. */
  matchOpts: Omit<MatchOpts, 'candidates' | 'bettingWindowMs'>;
  betWindowS?: number;                 // FC_SEASON_BET_WINDOW_S, default 20
  maxSessionsPerHour?: number;         // FC_MAX_SESSIONS_PER_HOUR, default 120
  maxCreditsPerHour?: number | null;   // FC_MAX_CREDITS_PER_HOUR, default unset
  demoReserve?: number;                // FC_DEMO_RESERVE: sessions never consumed by the season loop, default 6
  /** Fighter runs a match starts. Default: standings count, else sessionsPerMatch. */
  sessionsOf?(s: MatchSummary): number;
  /** Fighter runs assumed when unknown (errors, pre-check). Default 2. */
  sessionsPerMatch?: number;
  /** MatchSummary does not expose usage; wire this to sum usage.factoryCredits of the match's outcomes. Default 0. */
  creditsOf?(s: MatchSummary): number;
  killed?(): boolean;                  // FC_KILL=1
  seasonNumber?: number;               // default 1
  gapMs?: number;                      // between matches, default 3000
  pollMs?: number;                     // re-check while paused/killed, default 5000
  backoffMs?: number; maxBackoffMs?: number;   // errors, default 5000 / 60000
  now?(): number; sleep?(ms: number): Promise<void>;
  log?(msg: string): void;
  onPlayed?(s: MatchSummary | null): void;     // e.g. director.noteMatchPlayed
  onPause?(reason: string | null): void;       // e.g. director.pauseSeason
};

export type SeasonLoop = {
  start(): void; stop(): Promise<void>; status(): SeasonStatus;
  /** True while at least FC_DEMO_RESERVE sessions remain under the hourly cap (live demos can still run). */
  reserveAvailable(): boolean;
  /** Count usage from matches the loop did not run (demo matches) against the same window. */
  recordUsage(sessions: number, credits: number): void;
  /** Credits used in the rolling hour (for Director creditsHour). */
  creditsHour(): number;
  /** Resolves when the loop has fully exited (tests). */
  idle(): Promise<void>;
};

type Entry = { at: number; sessions: number; credits: number };

export function createSeasonLoop(deps: SeasonLoopDeps): SeasonLoop {
  const now = deps.now ?? Date.now;
  const realSleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });
  const sleepFn = deps.sleep ?? realSleep;
  const log = deps.log ?? ((m: string) => console.warn(`[season] ${m}`));
  const maxS = deps.maxSessionsPerHour ?? 120;
  const maxC = deps.maxCreditsPerHour ?? null;
  const reserve = deps.demoReserve ?? 6;
  const perMatch = deps.sessionsPerMatch ?? 2;
  const gapMs = deps.gapMs ?? 3000;
  const pollMs = deps.pollMs ?? 5000;
  const maxBackoff = deps.maxBackoffMs ?? 60_000;

  let entries: Entry[] = [];
  let on = false, played = 0, pausedReason: string | null = null, eta: number | null = null;
  let running = false, matchActive = false, stopped = false, loopP: Promise<void> = Promise.resolve();
  let wake: (() => void) | null = null;

  const prune = () => { const cut = now() - HOUR_MS; entries = entries.filter((e) => e.at > cut); };
  const sessionsHour = () => { prune(); return entries.reduce((a, e) => a + e.sessions, 0); };
  const creditsHour = () => { prune(); return entries.reduce((a, e) => a + e.credits, 0); };
  const setPause = (r: string | null) => { if (r !== pausedReason) { pausedReason = r; deps.onPause?.(r); if (r) log(`paused: ${r}`); } };

  /** Interruptible sleep: stop() wakes it. */
  const nap = async (ms: number) => {
    eta = now() + ms;
    await Promise.race([sleepFn(ms), new Promise<void>((r) => { wake = r; })]);
    wake = null;
  };

  /** Ms until the budget would allow another match, or 0 if allowed now; sets reason. */
  function budgetWait(): { wait: number; reason: string } | null {
    prune();
    const used = sessionsHour();
    if (used + perMatch > maxS - reserve) {
      let freed = 0; const need = used + perMatch - (maxS - reserve);
      for (const e of entries) { freed += e.sessions; if (freed >= need) return { wait: Math.max(1, e.at + HOUR_MS - now()), reason: `session cap ${used}/${maxS} per hour (${reserve} reserved for demos)` }; }
      return { wait: pollMs, reason: `session cap ${used}/${maxS} per hour` };
    }
    if (maxC != null && creditsHour() >= maxC) {
      const first = entries.find((e) => e.credits > 0);
      return { wait: first ? Math.max(1, first.at + HOUR_MS - now()) : pollMs, reason: `credit cap ${creditsHour()}/${maxC} per hour` };
    }
    return null;
  }

  async function loop() {
    let backoff = deps.backoffMs ?? 5000;
    while (!stopped) {
      try {
        if (deps.killed?.()) { setPause('kill switch (FC_KILL=1)'); await nap(pollMs); continue; }
        const b = budgetWait();
        if (b) { setPause(b.reason); await nap(Math.min(b.wait, Math.max(pollMs, 1))); continue; }
        setPause(null); eta = null;
        const candidates = await deps.candidates();
        if (candidates.length < 2) { setPause('not enough eligible fighters'); await nap(pollMs); continue; }
        if (stopped) break;
        matchActive = true;
        let summary: MatchSummary | null = null;
        try {
          summary = await deps.runMatch({ ...deps.matchOpts, candidates, bettingWindowMs: (deps.betWindowS ?? 20) * 1000 });
        } finally { matchActive = false; }
        const sessions = deps.sessionsOf?.(summary) ?? (summary.standings.length || perMatch);
        entries.push({ at: now(), sessions, credits: Math.max(0, deps.creditsOf?.(summary) ?? 0) });
        played++; deps.onPlayed?.(summary); backoff = deps.backoffMs ?? 5000;
        log(`match ${summary.matchId} done (${played} played)`);
        if (!stopped) await nap(gapMs);
      } catch (e) {
        // A thrown match may still have burned sessions: count the estimate so a failing loop cannot run away.
        entries.push({ at: now(), sessions: perMatch, credits: 0 });
        log(`error: ${(e as Error)?.message ?? 'unknown'}; backing off ${backoff}ms`);
        if (!stopped) await nap(backoff);
        backoff = Math.min(backoff * 2, maxBackoff);
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true; on = true; stopped = false;
      loopP = loop().finally(() => { running = false; on = false; eta = null; });
    },
    async stop() { stopped = true; wake?.(); await loopP; },
    status: () => ({
      on, played, creditsHour: creditsHour(), sessionsHour: sessionsHour(), pausedReason,
      season: deps.seasonNumber ?? 1, nextMatchEta: matchActive ? null : eta,
    }),
    reserveAvailable: () => maxS - sessionsHour() >= reserve,
    recordUsage(sessions, credits) { entries.push({ at: now(), sessions, credits }); },
    creditsHour,
    idle: () => loopP,
  };
}
