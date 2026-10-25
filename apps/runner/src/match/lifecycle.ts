// Full match lifecycle: runMatchUntilReview (R-02a) + review + result + reveal + settle (R-02b).
import { randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FightEnvelope, FighterId, Standing } from '@fc/contracts';
import { canonicalJson, checkInvariants, resolveMarkets, type MatchState } from '@fc/engine';
import { computeStandings, finalVerdicts, postFinalVerdicts, reduceLog } from './review.js';
import { runMatchUntilReview } from './run.js';
import { buildSettlement, type HistoryProvider } from './settle.js';
import type { MatchDeps, MatchOpts, MatchRecord } from './types.js';

export type RunMatchDeps = MatchDeps & {
  /** Prior entries + stats per fighter (for stats / Elo K-factor). Default: empty history. */
  history?: HistoryProvider;
  /** Keep the sandbox dirs (default: env FC_KEEP_SANDBOX=1). */
  keepSandbox?: boolean;
  /** How long to wait for module-emitted events to echo back through the subscription. Default 5000. */
  echoTimeoutMs?: number;
};

export type MatchSummary = {
  matchId: string; status: 'settled'; mode: MatchRecord['mode']; isDemo: boolean;
  standings: Standing[]; results: { marketId: string; outcome: string }[]; elo: { fighterId: FighterId; after: number }[];
  overturned: number; endedBy: MatchRecord['endedBy']; invariantViolations: string[];
  /** Fighter runs and Factory credits this match consumed (season budget guard, FC-F-260/261). */
  usage: { sessions: number; factoryCredits: number };
};

function usageOf(rec: MatchRecord): { sessions: number; factoryCredits: number } {
  const outs = Object.values(rec.outcomes);
  return { sessions: outs.length, factoryCredits: outs.reduce((a, o) => a + (o.result?.usage?.factoryCredits ?? 0), 0) };
}

const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });

export async function runMatch(deps: RunMatchDeps, opts: MatchOpts): Promise<MatchSummary> {
  const { stdb } = deps;
  const log = deps.log ?? ((m: string) => console.warn(`[match] ${m}`));
  const matchId = opts.matchId ?? `m_${randomBytes(5).toString('hex')}`;
  const sandbox = join(opts.sandboxRoot ?? tmpdir(), `fc-${matchId}`);

  // Collect the event log the runner sees (module events echo back through the subscription).
  const log_: FightEnvelope[] = [];
  const seen = new Set<number>();
  const off = stdb.onEvent(matchId, (e) => {
    if (seen.has(e.seq)) return;
    seen.add(e.seq);
    log_.push({ v: 1, matchId: e.matchId, seq: e.seq, t: e.t, type: e.type, data: e.data } as FightEnvelope);
  });
  const waitFor = async (pred: () => boolean, what: string) => {
    const end = Date.now() + (deps.echoTimeoutMs ?? 5000);
    while (!pred()) { if (Date.now() > end) throw new Error(`timeout_waiting_for:${what}`); await sleep(5); }
  };
  const has = (t: string) => log_.some((e) => e.type === t);

  try {
    const rec = await runMatchUntilReview(deps, { ...opts, matchId });   // voids itself on failure before review
    try {
      // 1. review: final checks
      await waitFor(() => has('match.timeup'), 'match.timeup');
      const verdicts = finalVerdicts(rec);
      await postFinalVerdicts(stdb, matchId, verdicts);
      await waitFor(() => log_.filter((e) => e.type === 'verdict.final').length >= verdicts.length, 'verdict.final');

      // 2. result
      const total = rec.problemSet.problems.reduce((a, p) => a + p.points, 0);
      const standings = computeStandings(reduceLog(log_), log_, rec.timeLimitMs, total);
      await stdb.finalizeMatch({ matchId, standings });
      await waitFor(() => has('match.result'), 'match.result');

      // 3. reveal
      await stdb.revealMatch({ matchId, problemSetJson: canonicalJson(rec.problemSet), salt: rec.salt });
      await waitFor(() => has('match.revealed'), 'match.revealed');

      // 4. settle
      const state: MatchState = reduceLog(log_);
      const results = resolveMarkets(state, rec.markets);
      const { elo, stats } = await buildSettlement(rec, standings, deps.history, (deps.now ?? Date.now)());
      await stdb.settleMatch({ matchId, results, elo, stats });
      await waitFor(() => has('match.settled'), 'match.settled');

      return { matchId, status: 'settled', mode: rec.mode, isDemo: rec.isDemo, standings, results, elo,
        overturned: verdicts.filter((v) => v.overturned).length, endedBy: rec.endedBy, invariantViolations: checkInvariants(log_).violations,
        usage: usageOf(rec) };
    } catch (e) {
      log(`${matchId}: review/settle failed: ${(e as Error).message}`);
      try { await stdb.voidMatch({ matchId, reason: 'runner_error' }); } catch { /* already void / module down */ }
      throw e;
    }
  } finally {
    off();
    if (!(deps.keepSandbox ?? process.env.FC_KEEP_SANDBOX === '1')) { try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ } }
  }
}
