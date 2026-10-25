// Match receipt view model (FC-F-084). Pure: no React, no store.
import type { FightEnvelope } from '@fc/contracts';
import { initialMatchState, reduceMatch, verifyReveal, canonicalJson, type MatchState } from '@fc/engine';

export const BASESCAN_TX = 'https://sepolia.basescan.org/tx/';
export const isTxHash = (s: string | null | undefined): s is string => !!s && /^0x[0-9a-fA-F]{64}$/.test(s);
export const basescanUrl = (hash: string): string => BASESCAN_TX + hash;

export function summarize(e: FightEnvelope): string {
  switch (e.type) {
    case 'match.created': return `${e.data.mode} match · ${e.data.fighters.join(', ')}`;
    case 'betting.locked': return 'Betting locked';
    case 'purse.entry': return `${e.data.fighterId} entry ${e.data.amountUsdc} USDC${e.data.coveredByHouse ? ' (house)' : ''}`;
    case 'match.intro': return 'Intros';
    case 'match.started': return 'Bell';
    case 'fighter.thinking': return `${e.data.fighterId} thinking`;
    case 'fighter.tool': return `${e.data.fighterId} ${e.data.tool}: ${e.data.label}`;
    case 'fighter.say': return `${e.data.fighterId}: ${e.data.text}`;
    case 'fighter.submit': return `${e.data.fighterId} submits P${e.data.problem} (attempt ${e.data.attempt})`;
    case 'verdict.live': return `${e.data.fighterId} P${e.data.problem} ${e.data.ok ? 'HIT' : 'MISS'} ${e.data.points >= 0 ? '+' : ''}${e.data.points} (${e.data.reason})`;
    case 'referee.card': return `${e.data.color.toUpperCase()} card ${e.data.fighterId}: ${e.data.reason} (${e.data.penalty})`;
    case 'fighter.hint': return `${e.data.fighterId} bought hint P${e.data.problem}`;
    case 'fighter.done': return `${e.data.fighterId} done`;
    case 'fighter.out': return `${e.data.fighterId} out (${e.data.reason})`;
    case 'match.timeup': return 'Time up';
    case 'verdict.final': return `${e.data.fighterId} P${e.data.problem} ${e.data.overturned ? 'OVERTURNED' : 'upheld'} ${e.data.points}`;
    case 'match.result': return `Result: ${[...e.data.standings].sort((a, b) => a.rank - b.rank).map((s) => `${s.rank}. ${s.fighterId} ${s.points}`).join(' · ')}`;
    case 'match.revealed': return 'Problem set revealed';
    case 'match.settled': return `Settled · paid ${e.data.totalPaid}`;
    case 'purse.paid': return `${e.data.fighterId} purse ${e.data.amountUsdc} USDC`;
    case 'match.void': return `Void: ${e.data.reason}`;
    default: return (e as { type: string }).type;
  }
}

export const isHighlight = (e: FightEnvelope): 'card' | 'var' | null =>
  e.type === 'referee.card' ? 'card' : e.type === 'verdict.final' && e.data.overturned ? 'var' : null;

export type Submission = {
  seq: number; t: number; fighterId: string; problem: number; attempt: number;
  verdict: { ok: boolean; points: number; reason: string } | null;
  finalVerdict: { overturned: boolean; points: number } | null;
  answer: string | null;   // reference antiderivative; only present once the set is revealed
};

export type PurseRow = { kind: 'entry' | 'paid'; fighterId: string; amountUsdc: number; ref: string | null };

export type Receipt = { state: MatchState; submissions: Submission[]; purses: PurseRow[] };

export function buildReceipt(events: FightEnvelope[]): Receipt {
  let state = initialMatchState();
  for (const e of events) state = reduceMatch(state, e);
  const reveal = state.reveal;
  const subs: Submission[] = [];
  const pending = new Map<string, Submission>();   // fighter:problem -> latest submission awaiting a live verdict
  const key = (f: string, p: number) => `${f}:${p}`;
  const latest = new Map<string, Submission>();
  for (const e of events) {
    if (e.type === 'fighter.submit') {
      const s: Submission = { seq: e.seq, t: e.t, fighterId: e.data.fighterId, problem: e.data.problem, attempt: e.data.attempt, verdict: null, finalVerdict: null,
        answer: reveal?.problemSet.problems.find((p) => p.idx === e.data.problem)?.reference ?? null };
      subs.push(s); pending.set(key(s.fighterId, s.problem), s); latest.set(key(s.fighterId, s.problem), s);
    } else if (e.type === 'verdict.live') {
      const s = pending.get(key(e.data.fighterId, e.data.problem));
      if (s) { s.verdict = { ok: e.data.ok, points: e.data.points, reason: e.data.reason }; pending.delete(key(e.data.fighterId, e.data.problem)); }
    } else if (e.type === 'verdict.final') {
      const s = latest.get(key(e.data.fighterId, e.data.problem));
      if (s) s.finalVerdict = { overturned: e.data.overturned, points: e.data.points };
    }
  }
  const purses: PurseRow[] = [];
  for (const e of events) {
    if (e.type === 'purse.entry') purses.push({ kind: 'entry', fighterId: e.data.fighterId, amountUsdc: e.data.amountUsdc, ref: e.data.txRef });
    else if (e.type === 'purse.paid') purses.push({ kind: 'paid', fighterId: e.data.fighterId, amountUsdc: e.data.amountUsdc, ref: e.data.txHash });
  }
  return { state, submissions: subs, purses };
}

export type HashCheck = { result: 'none' | 'ok' | 'bad'; commit: string | null; canonical: string | null; salt: string | null };
export async function hashCheck(s: Pick<MatchState, 'commitHash' | 'reveal'>): Promise<HashCheck> {
  if (!s.commitHash || !s.reveal) return { result: 'none', commit: s.commitHash, canonical: null, salt: null };
  const canonical = canonicalJson(s.reveal.problemSet);
  let ok = false;
  try { ok = await verifyReveal(s.commitHash, s.reveal.problemSet, s.reveal.salt); } catch { ok = false; }
  return { result: ok ? 'ok' : 'bad', commit: s.commitHash, canonical, salt: s.reveal.salt };
}
