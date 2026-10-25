// Lifecycle I (R-02a): create → lock → prewarm/intro → start → run fighters → timeup → review.
// R-02b continues from the returned MatchRecord (final checks, standings, reveal, settle).
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { problemSetSchema, type FighterId, type FighterProblem, type Problem, type ProblemIdx, type ProblemMeta } from '@fc/contracts';
import { commitHash } from '@fc/engine';
import type { FighterRunInput } from '../fighters/types.js';
import { generateProblemSet } from '../problems/index.js';
import { loadWebSnapshot } from '../problems/web.js';
import { createRng } from '../problems/rng.js';
import { registerByoSession, unregisterByoSession } from '../http/byo.js';
import { EventBatcher } from './batcher.js';
import { createFighterIO, finish, newRt, type FighterRt, type MatchCtx } from './io.js';
import { buildMarkets } from './markets.js';
import { cleanText } from './sanitize.js';
import { pickFighters } from './scheduler.js';
import type { Candidate, FighterOutcome, MatchDeps, MatchOpts, MatchRecord } from './types.js';

const hex = (n: number) => randomBytes(n).toString('hex');
const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, Math.max(0, ms)); });
const DEFAULT_AGENTS_DIR = fileURLToPath(new URL('../../../../agents/house/', import.meta.url));

/** Intro line from agents/house/<id>.lines.json (array, or { intro: [...] } / { lines: { intro: [...] } }); else the catchphrase. */
export function defaultIntroLine(agentsDir: string) {
  return (c: Candidate, rnd: () => number): string | null => {
    const file = join(agentsDir, `${c.fighter.id}.lines.json`);
    try {
      if (existsSync(file)) {
        const j = JSON.parse(readFileSync(file, 'utf8')) as unknown;
        const cand = Array.isArray(j) ? j : (j as { intro?: unknown; lines?: { intro?: unknown } })?.intro ?? (j as { lines?: { intro?: unknown } })?.lines?.intro;
        const arr = (Array.isArray(cand) ? cand : []).filter((x): x is string => typeof x === 'string' && x.trim() !== '');
        if (arr.length) return arr[Math.floor(rnd() * arr.length)]!;
      }
    } catch { /* fall through to catchphrase */ }
    return c.fighter.catchphrase || null;
  };
}

export async function runMatchUntilReview(deps: MatchDeps, opts: MatchOpts): Promise<MatchRecord> {
  const { stdb } = deps;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((m: string) => console.warn(`[match] ${m}`));
  const category = opts.category ?? 'integrals';
  const mode = opts.mode ?? 'live';
  const isDemo = opts.isDemo ?? false;

  // --- schedule + create ---------------------------------------------------
  const rng = createRng(opts.rngSeed ?? hex(16));
  const { picked, slots } = pickFighters(opts.candidates, () => rng.next(), opts.communitySlots ?? 1);
  const matchId = opts.matchId ?? `m_${hex(5)}`;
  const seed = opts.seed ?? hex(16);
  const salt = opts.salt ?? hex(16);
  const snapshot = category === 'web' ? await (deps.webSnapshot ?? loadWebSnapshot)() : undefined;
  const problemSet = problemSetSchema.parse(generateProblemSet(seed, category, snapshot));
  deps.onProblemSet?.(matchId, problemSet);
  const commit = await commitHash(problemSet, salt);
  const markets = buildMarkets(matchId, picked, { beatClockRate: opts.beatClockRate, scoreHistory: opts.scoreHistory, category, slots });
  const fighterIds = picked.map((c) => c.fighter.id);
  const problemMeta: ProblemMeta[] = problemSet.problems.map((p) => ({ idx: p.idx, difficulty: p.difficulty, points: p.points }));
  const sandboxRoot = join(opts.sandboxRoot ?? fileURLToPath(new URL('../../../../.arena/sandboxes/', import.meta.url)), matchId);

  const lockSeen = new Promise<void>((res) => {
    const off = stdb.onEvent(matchId, (e) => { if (e.type === 'betting.locked') { off(); res(); } });
  });
  const batcher = new EventBatcher((events) => stdb.postEvents({ matchId, events }), {
    intervalMs: opts.flushIntervalMs ?? 100,
    onError: (e, n) => log(`${matchId}: postEvents failed (${n} events dropped): ${(e as Error).message}`),
  });
  const rts = new Map<FighterId, FighterRt>();
  let live = false;
  const runs: Promise<void>[] = [];

  try {
    await stdb.createMatch({ id: matchId, category, mode, isDemo, fighterIds, slots, problems: problemMeta, commitHash: commit,
      bettingWindowMs: opts.bettingWindowMs, timeLimitMs: opts.timeLimitMs, markets });
    opts.onCreated?.();

    // --- wait for lock (module auto_lock, or lock it ourselves) ------------
    if (opts.lockEarly) await stdb.lockMatch({ matchId });
    else {
      const timedOut = await Promise.race([lockSeen.then(() => false), sleep(opts.bettingWindowMs + (opts.lockGraceMs ?? 1500)).then(() => true)]);
      if (timedOut) { try { await stdb.lockMatch({ matchId }); } catch (e) { log(`${matchId}: lock_match: ${(e as Error).message}`); } }
    }
    await Promise.race([lockSeen, sleep(3000)]);

    // --- prewarm + intro ---------------------------------------------------
    const fprobs: FighterProblem[] = problemSet.problems.map((p) => ({ idx: p.idx, difficulty: p.difficulty, points: p.points, statementTex: p.statementTex, integrand: p.integrand, category,
      ...(p.evaluation ? { prompt: p.evaluation.prompt, answerFormat: p.evaluation.format } : { answerFormat: 'expression' as const }) }));
    const mkInput = (c: Candidate, startedAt: number): FighterRunInput => {
      const dir = join(sandboxRoot, c.fighter.id);
      return {
        matchId, category, fighter: c.fighter, origin: c.origin, persona: c.persona, strategy: c.strategy,
        modelId: c.modelId ?? null, reasoningEffort: c.reasoningEffort ?? null,
        problems: fprobs, timeLimitMs: opts.timeLimitMs, deadlineAt: startedAt + opts.timeLimitMs, sandboxDir: dir,
        endpointUrl: c.endpointUrl ?? null, submitUrl: c.submitUrl ?? null, token: c.token ?? null,
      };
    };
    for (const c of picked) mkdirSync(join(sandboxRoot, c.fighter.id), { recursive: true });
    const prewarm = Promise.allSettled(picked.map(async (c) => { await deps.backendFor(c).prewarm?.(mkInput(c, now())); }))
      .then((rs) => { rs.forEach((r, i) => { if (r.status === 'rejected') log(`${matchId}: prewarm failed for ${picked[i]!.fighter.id}`); }); });

    const pickLine = deps.introLine ?? defaultIntroLine(opts.agentsDir ?? DEFAULT_AGENTS_DIR);
    const lines: Record<FighterId, string> = {};
    for (const c of picked) {
      const l = cleanText(pickLine(c, () => rng.next()) ?? '', 80);
      if (l) lines[c.fighter.id] = l;
    }
    batcher.push({ type: 'match.intro', data: { lines } });
    await batcher.flush();
    await Promise.all([prewarm, sleep(opts.introMs)]);

    // --- start -------------------------------------------------------------
    await stdb.startMatch({ matchId });
    const startedAt = now();
    const deadlineAt = startedAt + opts.timeLimitMs;
    live = true;
    batcher.start();
    const ctx: MatchCtx = {
      problems: new Map<ProblemIdx, Problem>(problemSet.problems.map((p) => [p.idx, p])),
      batcher, now, startedAt, deadlineAt, isLive: () => live,
      toolMinMs: opts.toolMinMs ?? 1500, thinkingMinMs: opts.thinkingMinMs ?? 4000,
    };
    const results = new Map<FighterId, FighterOutcome['result']>();
    for (const c of picked) {
      const rt = newRt(c.fighter.id, c.strategy.taunts);
      rts.set(c.fighter.id, rt);
      const io = createFighterIO(rt, ctx);
      if (c.origin === 'byo_http' && c.token) registerByoSession(matchId, c.fighter.id, c.token, io);
      runs.push((async () => {
        try {
          const r = await deps.backendFor(c).run(mkInput(c, startedAt), io, rt.ctrl.signal);
          results.set(c.fighter.id, r);
          if (!live) return;
          if (r.ok) finish(rt, ctx, { done: true });
          else finish(rt, ctx, { out: r.error?.code === 'red_card' || r.error?.code === 'budget' || r.error?.code === 'timeout' ? r.error.code : 'crash' });
        } catch (e) {
          results.set(c.fighter.id, { ok: false, turns: 0, usage: null, error: { code: 'crash', message: cleanText((e as Error).message ?? 'crash', 120) } });
          if (live) finish(rt, ctx, { out: 'crash' });
        }
      })());
    }

    // --- bell: deadline, everyone finished, or external kill ---------------
    const allSettled = Promise.all(runs).then(() => 'all_finished' as const);
    const bell = sleep(deadlineAt - now()).then(() => 'bell' as const);
    const killed = new Promise<'signal'>((res) => {
      if (opts.signal?.aborted) res('signal');
      else opts.signal?.addEventListener('abort', () => res('signal'), { once: true });
    });
    const endedBy = await Promise.race([allSettled, bell, killed]);
    unregisterByoSession(matchId);
    live = false;                                   // the bell has rung: IO goes inert, nothing new reaches the log
    for (const rt of rts.values()) if (rt.state === 'running') rt.ctrl.abort();
    await Promise.race([allSettled, sleep(opts.abortGraceMs ?? 1500)]);
    await batcher.stop();
    const endedAt = now();

    // --- timeup → review ---------------------------------------------------
    await stdb.beginReview({ matchId });

    const answers: MatchRecord['answers'] = {};
    const outcomes: MatchRecord['outcomes'] = {};
    for (const [id, rt] of rts) {
      answers[id] = rt.accepted;
      outcomes[id] = { fighterId: id, state: rt.state === 'running' ? 'running' : rt.state, outReason: rt.outReason, result: results.get(id) ?? null,
        yellow: rt.yellow, red: rt.red, submissions: rt.submissions };
    }
    return { matchId, category, mode, isDemo, fighters: fighterIds, slots, candidates: picked, problemSet, salt, commitHash: commit, markets,
      timeLimitMs: opts.timeLimitMs, startedAt, endedAt, answers, outcomes, endedBy, sandboxRoot };
  } catch (e) {
    live = false;
    unregisterByoSession(matchId);
    for (const rt of rts.values()) rt.ctrl.abort();
    await batcher.stop().catch(() => undefined);
    try { await stdb.voidMatch({ matchId, reason: 'runner_error' }); } catch { /* module may be down or already void */ }
    throw e;
  }
}
