// Feed lines in the §10.4 voice (PRD §8.6 table). K-03.
import { HOUSE_ROSTER } from '@fc/contracts';
import type { FightEnvelope } from '@fc/contracts';
import type { FeedLine, MatchState } from './state.js';

const MINUS = '−';
const nameOf = (id: string): string =>
  (HOUSE_ROSTER as Record<string, { name: string } | undefined>)[id]?.name ?? id.toUpperCase();
const mmss = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
const usdc = (n: number): string => n.toFixed(2);
const REASON: Record<string, string> = { red_card: 'red card', timeout: 'timed out', crash: 'crashed', budget: 'out of budget' };
const HINT_PRICE_USDC = 0.02;                         // fixed price; fighter.hint carries no amount

export function feedLine(prev: MatchState, e: FightEnvelope): FeedLine | null {
  const mk = (kind: FeedLine['kind'], text: string, fighterId?: string): FeedLine =>
    fighterId === undefined ? { seq: e.seq, t: e.t, kind, text } : { seq: e.seq, t: e.t, kind, text, fighterId };
  switch (e.type) {
    case 'match.created': {
      const m = /(\d+)$/.exec(e.matchId);
      const closes = e.data.bettingClosesAt < 1e11 ? Math.max(0, e.data.bettingClosesAt - e.t) : 90_000;
      return mk('system', `Match #${m ? m[1] : e.matchId} is open. Bets close in ${mmss(closes)}.`);
    }
    case 'betting.locked': return mk('system', 'Bets are locked.');
    case 'match.started': return mk('system', 'FIGHT!');
    case 'fighter.say': return mk('say', `${nameOf(e.data.fighterId)}: ${e.data.text}`, e.data.fighterId);
    case 'verdict.live': {
      const d = e.data; const n = nameOf(d.fighterId);
      if (d.ok) return mk('hit', `${n} solves P${d.problem} · +${d.points}`, d.fighterId);
      if (d.reason === 'invalid_syntax') return mk('miss', `${n} fumbles P${d.problem} (bad syntax) · ${MINUS}5`, d.fighterId);
      return mk('miss', `${n} misses P${d.problem} · ${MINUS}5`, d.fighterId);
    }
    case 'referee.card': {
      const d = e.data;
      return mk('card', `${d.color === 'red' ? '\u{1F7E5}' : '\u{1F7E8}'} ${nameOf(d.fighterId)}: ${d.reason} · ${MINUS}${Math.abs(d.penalty)}`, d.fighterId);
    }
    case 'fighter.hint':
      return mk('money', `${nameOf(e.data.fighterId)} buys a hint for P${e.data.problem} (${usdc(HINT_PRICE_USDC)} test USDC)`, e.data.fighterId);
    case 'fighter.done': return mk('system', `${nameOf(e.data.fighterId)} is done.`, e.data.fighterId);
    case 'fighter.out':
      return mk('card', `${nameOf(e.data.fighterId)} is sent off (${REASON[e.data.reason] ?? e.data.reason}).`, e.data.fighterId);
    case 'match.timeup': {
      let n = 0;
      for (const id of prev.order) for (const v of Object.values(prev.fighters[id]?.solved ?? {})) if (v && v.final === 'pending') n++;
      return mk('system', `TIME! The VAR is reviewing ${n} ${n === 1 ? 'hit' : 'hits'}.`);
    }
    case 'verdict.final': {
      const d = e.data;
      if (d.overturned) return mk('var', `VAR: ${nameOf(d.fighterId)}'s P${d.problem} is overturned · ${MINUS}${Math.abs(d.points)}`, d.fighterId);
      // One summary line, emitted when the last pending hit is held.
      let pendingOthers = 0; let held = 0;
      for (const id of prev.order) {
        for (const [p, v] of Object.entries(prev.fighters[id]?.solved ?? {})) {
          if (!v) continue;
          if (id === d.fighterId && Number(p) === d.problem) { held++; continue; }
          if (v.final === 'pending') pendingOthers++;
          else if (v.final === 'held') held++;
        }
      }
      return pendingOthers === 0 ? mk('var', `VAR: ${held} ${held === 1 ? 'hit stands' : 'hits stand'}.`) : null;
    }
    case 'match.result': {
      const w = e.data.standings.find((s) => s.rank === 1);
      return w ? mk('ko', `${nameOf(w.fighterId)} wins with ${w.points} (${Math.round(w.scorePct * 100)}%).`, w.fighterId) : null;
    }
    case 'match.revealed': return mk('system', 'Problems revealed · Provably fair ✓');
    case 'match.settled': return mk('money', `Paid out $${(e.data.totalPaid / 100).toFixed(2)}.`);
    case 'purse.entry': return mk('money', `${nameOf(e.data.fighterId)} pays the ${usdc(e.data.amountUsdc)} test USDC entry fee`, e.data.fighterId);
    case 'purse.paid': return mk('money', `${nameOf(e.data.fighterId)} wins the purse: ${usdc(e.data.amountUsdc)} test USDC`, e.data.fighterId);
    case 'match.void': return mk('system', `Match void: ${e.data.reason}. All bets refunded.`);
    default: return null;
  }
}
