// Pure match reducer (PRD §8.5.1, §8.6). K-03.
import type { FightEnvelope, ProblemIdx } from '@fc/contracts';
import type { FighterLive, MatchState } from './state.js';
import { feedLine } from './feed.js';
import { pickTarget } from './target.js';

const FEED_CAP = 120;
const MISS_POINTS = -5;

export function initialMatchState(): MatchState {
  return {
    matchId: null, status: 'scheduled', mode: 'live', isDemo: false, category: 'integrals',
    commitHash: null, problems: [], timeLimitMs: 0, order: [], fighters: {},
    startedT: null, t: 0, lastSeq: 0, feed: [], standings: null, reveal: null, settled: null, purses: [], voidReason: null,
  };
}

const withFighter = (s: MatchState, id: string, f: (x: FighterLive) => FighterLive): MatchState => {
  const cur = s.fighters[id];
  return cur ? { ...s, fighters: { ...s.fighters, [id]: f(cur) } } : s;
};
const isFinal = (x: FighterLive): boolean => x.status === 'done' || x.status === 'out' || x.status === 'winner' || x.status === 'ko';

function apply(s: MatchState, e: FightEnvelope): MatchState {
  switch (e.type) {
    case 'match.created': {
      const d = e.data;
      const pairs = d.fighters.map((id, i) => ({ id, slot: d.slots[i]! })).sort((a, b) => a.slot - b.slot);
      const fighters: MatchState['fighters'] = {};
      for (const { id, slot } of pairs) {
        fighters[id] = { id, slot, points: 0, damagePct: 0, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0,
          status: 'waiting', solved: {}, attempts: {}, lastSay: null, rank: null };
      }
      return { ...s, matchId: e.matchId, status: 'open', mode: d.mode, isDemo: d.isDemo, category: d.category, commitHash: d.commitHash,
        problems: d.problems, timeLimitMs: d.timeLimitMs, order: pairs.map((p) => p.id), fighters };
    }
    case 'betting.locked': return { ...s, status: 'locked' };
    case 'purse.entry':
      return { ...s, purses: [...s.purses, { fighterId: e.data.fighterId, kind: 'entry', amountUsdc: e.data.amountUsdc, ref: e.data.txRef }] };
    case 'purse.paid':
      return { ...s, purses: [...s.purses, { fighterId: e.data.fighterId, kind: 'paid', amountUsdc: e.data.amountUsdc, ref: e.data.txHash }] };
    case 'match.started': return { ...s, status: 'live', startedT: e.t };
    case 'fighter.thinking':
      return withFighter(s, e.data.fighterId, (f) => (isFinal(f) ? f : { ...f, status: 'thinking' }));
    case 'fighter.tool':
      return withFighter(s, e.data.fighterId, (f) => (isFinal(f) ? f : { ...f, status: 'working' }));
    case 'fighter.say':
      return withFighter(s, e.data.fighterId, (f) => ({ ...f, lastSay: { text: e.data.text, t: e.t } }));
    case 'fighter.submit':
      return withFighter(s, e.data.fighterId, (f) => ({ ...f, attempts: { ...f.attempts, [e.data.problem]: e.data.attempt },
        status: isFinal(f) ? f.status : 'working' }));
    case 'verdict.live': {
      const d = e.data;
      if (!d.ok) return withFighter(s, d.fighterId, (f) => ({ ...f, points: f.points + MISS_POINTS, misses: f.misses + 1 }));
      const target = pickTarget(s, d.fighterId);
      const prior = s.fighters[d.fighterId]?.solved[d.problem];
      let next = s;
      if (prior) {
        // Replaced answer: undo the earlier accepted hit's damage before applying this one.
        next = withFighter(next, prior.target, (t) => ({ ...t, damagePct: t.damagePct - prior.points * 1.2 }));
      }
      next = withFighter(next, d.fighterId, (f) => ({ ...f,
        points: f.points - (prior?.points ?? 0) + d.points,
        hits: f.hits + (prior ? 0 : 1),
        solved: { ...f.solved, [d.problem]: { atMs: e.t, target, points: d.points, final: 'pending' as const } } }));
      return withFighter(next, target, (t) => ({ ...t, damagePct: t.damagePct + d.points * 1.2 }));
    }
    case 'referee.card': {
      const d = e.data;
      return withFighter(s, d.fighterId, (f) => ({ ...f, points: f.points - Math.abs(d.penalty),
        yellow: f.yellow + (d.color === 'yellow' ? 1 : 0), red: f.red + (d.color === 'red' ? 1 : 0) }));
    }
    case 'fighter.done': return withFighter(s, e.data.fighterId, (f) => (f.status === 'out' ? f : { ...f, status: 'done' }));
    case 'fighter.out': return withFighter(s, e.data.fighterId, (f) => ({ ...f, status: 'out' }));
    case 'match.timeup': return { ...s, status: 'review' };
    case 'verdict.final': {
      const d = e.data;
      const p = d.problem as ProblemIdx;
      const sol = s.fighters[d.fighterId]?.solved[p];
      if (!sol) return s;
      if (!d.overturned) {
        return withFighter(s, d.fighterId, (f) => ({ ...f, solved: { ...f.solved, [p]: { ...sol, final: 'held' as const } } }));
      }
      const next = withFighter(s, sol.target, (t) => ({ ...t, damagePct: t.damagePct - sol.points * 1.2 }));
      return withFighter(next, d.fighterId, (f) => ({ ...f,
        points: f.points + d.points, overturned: f.overturned + 1, damagePct: f.damagePct + 10,
        solved: { ...f.solved, [p]: { ...sol, final: 'overturned' as const } } }));
    }
    case 'match.result': {
      let next: MatchState = { ...s, standings: e.data.standings };
      for (const st of e.data.standings) {
        next = withFighter(next, st.fighterId, (f) => ({ ...f, rank: st.rank, points: st.points, hits: st.hits, misses: st.misses,
          overturned: st.overturned, yellow: st.yellow, red: st.red, status: st.rank === 1 ? 'winner' : 'ko' }));
      }
      return next;
    }
    case 'match.revealed': return { ...s, reveal: { problemSet: e.data.problemSet, salt: e.data.salt } };
    case 'match.settled': return { ...s, status: 'settled', settled: e.data };
    case 'match.void': return { ...s, status: 'void', voidReason: e.data.reason };
    default: return s;
  }
}

export function reduceMatch(s: MatchState, e: FightEnvelope): MatchState {
  if (s.lastSeq > 0 && e.seq <= s.lastSeq) return s;          // duplicate / stale replay: idempotent
  const line = feedLine(s, e);
  const next = apply(s, e);
  const feed = line ? [...next.feed, line].slice(-FEED_CAP) : next.feed;
  return { ...next, feed, t: e.t, lastSeq: e.seq, matchId: next.matchId ?? e.matchId };
}
