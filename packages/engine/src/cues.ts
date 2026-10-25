// Arena cues (PRD §8.6). deriveCues implements the event → cue table (K-03).
import type { FighterId, FightEnvelope, ProblemIdx, Slot, ToolKind } from '@fc/contracts';
import type { MatchState } from './state.js';
import { pickTarget } from './target.js';

export type Power = 'light' | 'heavy' | 'special';          // 10 → light · 20–30 → heavy · 40–50 → special
export type ArenaCue =
  | { kind: 'dropIn';   fighter: FighterId; slot: Slot; line: string | null }
  | { kind: 'countdown' }
  | { kind: 'think';    fighter: FighterId }
  | { kind: 'toolUse';  fighter: FighterId; tool: ToolKind }
  | { kind: 'say';      fighter: FighterId; text: string }
  | { kind: 'attack';   fighter: FighterId; target: FighterId; power: Power; problem: ProblemIdx; points: number; label: string }
  | { kind: 'whiff';    fighter: FighterId; target: FighterId; problem: ProblemIdx; label: string }
  | { kind: 'card';     fighter: FighterId; color: 'yellow' | 'red' }
  | { kind: 'potion';   fighter: FighterId }
  | { kind: 'done';     fighter: FighterId }
  | { kind: 'out';      fighter: FighterId; reason: string }
  | { kind: 'timeup' }
  | { kind: 'var';      fighter: FighterId; target: FighterId; problem: ProblemIdx; overturned: boolean; points: number }
  | { kind: 'ko';       fighter: FighterId; order: number; rank: number }
  | { kind: 'victory';  fighter: FighterId }
  | { kind: 'coin';     fighter: FighterId; amountUsdc: number }
  | { kind: 'void';     reason: string };

const MINUS = '−';
const stars = (points: number): string => '★'.repeat(Math.max(1, Math.min(5, Math.round(points / 10))));
const powerOf = (points: number): Power => (points <= 10 ? 'light' : points <= 30 ? 'heavy' : 'special');

export function deriveCues(prev: MatchState, e: FightEnvelope): ArenaCue[] {
  switch (e.type) {
    case 'match.intro':
      return prev.order
        .map((id) => prev.fighters[id])
        .filter((f): f is NonNullable<typeof f> => !!f)
        .sort((a, b) => a.slot - b.slot)
        .map((f): ArenaCue => ({ kind: 'dropIn', fighter: f.id, slot: f.slot, line: e.data.lines[f.id] ?? null }));
    case 'match.started': return [{ kind: 'countdown' }];
    case 'fighter.thinking': return [{ kind: 'think', fighter: e.data.fighterId }];
    case 'fighter.tool': return [{ kind: 'toolUse', fighter: e.data.fighterId, tool: e.data.tool }];
    case 'fighter.say': return [{ kind: 'say', fighter: e.data.fighterId, text: e.data.text }];
    case 'verdict.live': {
      const d = e.data;
      const target = pickTarget(prev, d.fighterId);
      if (d.ok) {
        return [{ kind: 'attack', fighter: d.fighterId, target, power: powerOf(d.points), problem: d.problem, points: d.points,
          label: `P${d.problem} · ${stars(d.points)} · +${d.points}` }];
      }
      return [{ kind: 'whiff', fighter: d.fighterId, target, problem: d.problem, label: `P${d.problem} · MISS · ${MINUS}5` }];
    }
    case 'referee.card': return [{ kind: 'card', fighter: e.data.fighterId, color: e.data.color }];
    case 'fighter.hint': return [{ kind: 'potion', fighter: e.data.fighterId }];
    case 'fighter.done': return [{ kind: 'done', fighter: e.data.fighterId }];
    case 'fighter.out': return [{ kind: 'out', fighter: e.data.fighterId, reason: e.data.reason }];
    case 'match.timeup': return [{ kind: 'timeup' }];
    case 'verdict.final': {
      const d = e.data;
      if (!d.overturned) return [];
      const target = prev.fighters[d.fighterId]?.solved[d.problem]?.target ?? pickTarget(prev, d.fighterId);
      return [{ kind: 'var', fighter: d.fighterId, target, problem: d.problem, overturned: true, points: -Math.abs(d.points) }];
    }
    case 'match.result': {
      const sorted = [...e.data.standings].sort((a, b) => b.rank - a.rank);
      const cues: ArenaCue[] = [];
      let order = 0;
      for (const st of sorted) if (st.rank !== 1) cues.push({ kind: 'ko', fighter: st.fighterId, order: ++order, rank: st.rank });
      const winner = sorted.find((st) => st.rank === 1);
      if (winner) cues.push({ kind: 'victory', fighter: winner.fighterId });
      return cues;
    }
    case 'purse.paid': return [{ kind: 'coin', fighter: e.data.fighterId, amountUsdc: e.data.amountUsdc }];
    case 'match.void': return [{ kind: 'void', reason: e.data.reason }];
    default: return [];
  }
}
