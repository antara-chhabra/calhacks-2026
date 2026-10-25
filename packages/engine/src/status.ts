// "SAGE leads 60–40 · 0:47 left · 2 of 5 solved" (PRD §8.6). K-03.
import { HOUSE_ROSTER } from '@fc/contracts';
import type { MatchState } from './state.js';

const nameOf = (id: string): string =>
  (HOUSE_ROSTER as Record<string, { name: string } | undefined>)[id]?.name ?? id.toUpperCase();

const mmss = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function statusLine(s: MatchState): string {
  const fs = s.order.map((id) => s.fighters[id]).filter(Boolean);
  if (s.status === 'void') return `Match void${s.voidReason ? ` · ${s.voidReason}` : ''}`;
  if (s.status === 'scheduled' || s.status === 'open') return `Betting open · ${fs.length} fighters`;
  if (s.status === 'locked') return 'Bets locked · FIGHT starting';
  const ranked = [...fs].sort((a, b) => b.points - a.points || a.slot - b.slot);
  const solvedProblems = new Set<string>();
  for (const f of fs) for (const [p, v] of Object.entries(f.solved)) if (v && v.final !== 'overturned') solvedProblems.add(p);
  const solved = `${solvedProblems.size} of ${s.problems.length} solved`;
  const [a, b] = ranked;
  let lead = 'No fighters';
  if (a) {
    if (!b) lead = `${nameOf(a.id)} ${a.points}`;
    else if (a.points === b.points) lead = `${nameOf(a.id)} and ${nameOf(b.id)} tied ${a.points}–${b.points}`;
    else lead = `${nameOf(a.id)} leads ${a.points}–${b.points}`;
  }
  if (s.status === 'live') {
    const elapsed = s.startedT === null ? 0 : s.t - s.startedT;
    return `${lead} · ${mmss(s.timeLimitMs - elapsed)} left · ${solved}`;
  }
  if (s.status === 'review') return `Time! ${lead} · VAR reviewing · ${solved}`;
  const winner = fs.find((f) => f.rank === 1);
  return winner ? `${nameOf(winner.id)} wins ${winner.points}–${b && b.id !== winner.id ? b.points : (ranked[1]?.points ?? 0)} · ${solved}` : `${lead} · ${solved}`;
}
