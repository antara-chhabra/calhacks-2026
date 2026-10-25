// Match-log invariants (PRD §16.2 #1–5 and the §8.5.1 order rules). K-03.
import type { FightEnvelope } from '@fc/contracts';

const RUNNER = new Set(['fighter.thinking', 'fighter.tool', 'fighter.say', 'fighter.submit', 'verdict.live', 'referee.card', 'fighter.hint', 'fighter.done', 'fighter.out']);
const AFTER_TIMEUP = new Set(['verdict.final', 'match.result', 'match.revealed', 'match.settled', 'purse.paid', 'match.void']);
const MISS_POINTS = -5;

type Phase = 'none' | 'open' | 'locked' | 'live' | 'review' | 'result' | 'revealed' | 'settled' | 'void';

export function checkInvariants(events: FightEnvelope[]): { ok: boolean; violations: string[] } {
  const v: string[] = [];
  let phase: Phase = 'none';
  let fighters: string[] = [];
  const finished = new Set<string>();
  const latestOk = new Map<string, number>();            // `${f}:${p}` -> live points of latest accepted answer
  const finals = new Set<string>();
  const missSum = new Map<string, number>();
  const penSum = new Map<string, number>();
  const overSum = new Map<string, number>();
  let pendingSubmit: { fighterId: string; problem: number; seq: number } | null = null;

  events.forEach((e, i) => {
    const at = `seq ${e.seq} (${e.type})`;
    if (e.seq !== i + 1) v.push(`#1 seq not gapless/increasing: expected ${i + 1}, got ${e.seq}`);
    if (events[0] && e.matchId !== events[0].matchId) v.push(`${at}: matchId differs from first event`);

    // #3: a submit must be immediately followed by its verdict.live (same batch).
    if (pendingSubmit) {
      const p = pendingSubmit;
      if (!(e.type === 'verdict.live' && e.data.fighterId === p.fighterId && e.data.problem === p.problem)) {
        v.push(`#3 fighter.submit at seq ${p.seq} not followed by verdict.live for ${p.fighterId} P${p.problem}`);
      }
      pendingSubmit = null;
    }

    if (phase === 'void' || phase === 'settled' && e.type !== 'purse.paid' && e.type !== 'match.void') {
      if (phase === 'void') v.push(`#2 ${at}: event after match.void`);
      else v.push(`#2 ${at}: unexpected after match.settled`);
    }

    switch (e.type) {
      case 'match.created':
        if (phase !== 'none') v.push(`#2 ${at}: match.created must be first and only once`);
        fighters = e.data.fighters; phase = 'open'; break;
      case 'betting.locked':
        if (phase !== 'open') v.push(`#2 ${at}: betting.locked must follow match.created`);
        phase = 'locked'; break;
      case 'purse.entry':
      case 'match.intro':
        if (phase !== 'locked') v.push(`#2 ${at}: only valid after betting.locked and before match.started`);
        break;
      case 'match.started':
        if (phase !== 'locked') v.push(`#2 ${at}: match.started must follow betting.locked`);
        phase = 'live'; break;
      case 'match.timeup':
        if (phase !== 'live') v.push(`#2 ${at}: match.timeup requires a live match`);
        phase = 'review'; break;
      case 'verdict.final': {
        if (phase !== 'review') v.push(`#2 ${at}: verdict.final only between match.timeup and match.result`);
        const k = `${e.data.fighterId}:${e.data.problem}`;
        const live = latestOk.get(k);
        if (live === undefined) v.push(`#4 ${at}: no accepted verdict.live for ${k}`);
        if (finals.has(k)) v.push(`#4 ${at}: duplicate verdict.final for ${k}`);
        finals.add(k);
        if (e.data.points > 0) v.push(`#4 ${at}: points must be ≤ 0`);
        if (live !== undefined) {
          if (!e.data.overturned && e.data.points !== 0) v.push(`#4 ${at}: held verdict must remove 0 points`);
          if (e.data.overturned && e.data.points !== -live) v.push(`#4 ${at}: overturn must remove ${live}, got ${-e.data.points}`);
        }
        if (e.data.overturned) overSum.set(e.data.fighterId, (overSum.get(e.data.fighterId) ?? 0) + Math.abs(e.data.points));
        break;
      }
      case 'match.result': {
        if (phase !== 'review') v.push(`#2 ${at}: match.result must follow match.timeup`);
        phase = 'result';
        for (const k of latestOk.keys()) if (!finals.has(k)) v.push(`#4 ${at}: accepted answer ${k} has no verdict.final`);
        for (const st of e.data.standings) {
          const live = [...latestOk.entries()].filter(([k]) => k.startsWith(`${st.fighterId}:`)).reduce((a, [, p]) => a + p, 0);
          const calc = Math.max(0, live + (missSum.get(st.fighterId) ?? 0) - (penSum.get(st.fighterId) ?? 0) - (overSum.get(st.fighterId) ?? 0));
          if (calc !== st.points) v.push(`#5 ${st.fighterId}: standing points ${st.points} != reconciled ${calc}`);
        }
        break;
      }
      case 'match.revealed':
        if (phase !== 'result') v.push(`#2 ${at}: match.revealed must follow match.result`);
        phase = 'revealed'; break;
      case 'match.settled':
        if (phase !== 'revealed') v.push(`#2 ${at}: match.settled must follow match.revealed`);
        phase = 'settled'; break;
      case 'purse.paid':
        if (phase !== 'settled') v.push(`#2 ${at}: purse.paid only after match.settled`);
        break;
      case 'match.void':
        if (phase === 'none' || phase === 'settled') v.push(`#2 ${at}: match.void invalid in phase ${phase}`);
        phase = 'void'; break;
      default: break;
    }

    if (RUNNER.has(e.type)) {
      if (phase !== 'live') v.push(`#2 ${at}: runner event outside the live phase`);
      const f = (e.data as { fighterId: string }).fighterId;
      if (fighters.length && !fighters.includes(f)) v.push(`${at}: unknown fighter ${f}`);
      if (finished.has(f) && e.type !== 'fighter.out' && e.type !== 'fighter.done') v.push(`#2 ${at}: ${f} acts after done/out`);
      if (e.type === 'fighter.done' || e.type === 'fighter.out') finished.add(f);
    } else if (phase === 'review' && !AFTER_TIMEUP.has(e.type) && e.type !== 'match.timeup') {
      v.push(`#2 ${at}: not allowed after match.timeup`);
    }

    if (e.type === 'fighter.submit') pendingSubmit = { fighterId: e.data.fighterId, problem: e.data.problem, seq: e.seq };
    if (e.type === 'verdict.live') {
      const k = `${e.data.fighterId}:${e.data.problem}`;
      if (e.data.ok) latestOk.set(k, e.data.points);
      else missSum.set(e.data.fighterId, (missSum.get(e.data.fighterId) ?? 0) + MISS_POINTS);
    }
    if (e.type === 'referee.card') penSum.set(e.data.fighterId, (penSum.get(e.data.fighterId) ?? 0) + Math.abs(e.data.penalty));
  });

  if (pendingSubmit) v.push(`#3 fighter.submit at seq ${(pendingSubmit as { seq: number }).seq} has no verdict.live`);
  return { ok: v.length === 0, violations: v };
}
