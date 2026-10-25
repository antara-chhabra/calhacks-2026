// Match-screen view models (U-04). Pure helpers: no React, no store access, so they are unit-testable.
import { HOUSE_ROSTER, type FighterId, type SkinSpec } from '@fc/contracts';
import { verifyReveal, type FeedLine, type FighterLive, type MatchState } from '@fc/engine';

export const nameOf = (id: string, fighters?: Record<string, { name: string }>): string =>
  fighters?.[id]?.name ?? (HOUSE_ROSTER as Record<string, { name: string } | undefined>)[id]?.name ?? id.toUpperCase();

export function skinOf(id: string, fighters?: Record<string, { skin: SkinSpec }>): SkinSpec | null {
  return fighters?.[id]?.skin ?? (HOUSE_ROSTER as Record<string, { skin: SkinSpec } | undefined>)[id]?.skin ?? null;
}

export function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Match number from an id like "match-42" / "m42"; null if none. */
export function matchNumber(id: string | null): string | null {
  const m = id ? /(\d+)$/.exec(id) : null;
  return m ? m[1]! : null;
}

export function clockText(s: MatchState): string {
  if (s.status === 'live') return mmss(s.timeLimitMs - (s.startedT === null ? 0 : s.t - s.startedT));
  if (s.status === 'review' || s.status === 'settled') return '0:00';
  return mmss(s.timeLimitMs);
}

export const STATUS_BADGE: Record<MatchState['status'], string> = {
  scheduled: 'UPCOMING', open: 'BETS OPEN', locked: 'LOCKED', live: 'LIVE', review: 'VAR REVIEW', settled: 'FINAL', void: 'VOID',
};

export type Gem = { idx: number; points: number; state: 'open' | 'held' | 'pending' | 'overturned' };
/** Five problem gems: filled once any fighter has a surviving (or pending) hit. */
export function problemGems(s: MatchState): Gem[] {
  return s.problems.map((p) => {
    let state: Gem['state'] = 'open';
    for (const id of s.order) {
      const v = s.fighters[id]?.solved[p.idx];
      if (!v) continue;
      if (v.final === 'held') state = 'held';
      else if (v.final === 'pending' && state !== 'held') state = 'pending';
      else if (v.final === 'overturned' && state === 'open') state = 'overturned';
    }
    return { idx: p.idx, points: p.points, state };
  });
}

const STATUS_LABEL: Record<FighterLive['status'], string> = {
  waiting: 'waiting', thinking: 'thinking', working: 'working', done: 'done', out: 'sent off', winner: 'winner', ko: 'KO',
};
export type Plate = {
  id: FighterId; name: string; points: number; hits: number; misses: number; yellow: number; red: number;
  status: FighterLive['status']; statusLabel: string; activity: string | null; skin: SkinSpec | null; leading: boolean;
};
export function plates(s: MatchState, fighters?: Record<string, { name: string; skin: SkinSpec }>): Plate[] {
  const best = Math.max(0, ...s.order.map((id) => s.fighters[id]?.points ?? 0));
  return s.order.flatMap((id) => {
    const f = s.fighters[id];
    if (!f) return [];
    return [{
      id, name: nameOf(id, fighters), points: f.points, hits: f.hits, misses: f.misses, yellow: f.yellow, red: f.red,
      status: f.status, statusLabel: STATUS_LABEL[f.status], activity: f.lastSay?.text ?? null, skin: skinOf(id, fighters),
      leading: best > 0 && f.points === best,
    }];
  });
}

export const FEED_STYLE: Record<FeedLine['kind'], { tone: string; tag: string }> = {
  hit: { tone: 'text-emerald-400', tag: 'HIT' },
  miss: { tone: 'text-zinc-400', tag: 'MISS' },
  card: { tone: 'text-amber-400', tag: 'CARD' },
  var: { tone: 'text-sky-400', tag: 'VAR' },
  ko: { tone: 'text-red-400', tag: 'KO' },
  say: { tone: 'text-zinc-300 italic', tag: 'SAY' },
  system: { tone: 'text-zinc-100 font-medium', tag: 'SYS' },
  money: { tone: 'text-violet-300', tag: 'USDC' },
};
export const feedTone = (k: FeedLine['kind']): string => FEED_STYLE[k]?.tone ?? 'text-zinc-300';
/** Feed timestamp relative to the bell (mm:ss), or 0:00 before it. */
export function feedStamp(line: FeedLine, startedT: number | null): string {
  return mmss(Math.max(0, line.t - (startedT ?? line.t)) );
}

export type Fairness = 'none' | 'ok' | 'bad';
/** FC-F-081: recompute the commit hash from the revealed problem set + salt. */
export async function checkFairness(s: Pick<MatchState, 'commitHash' | 'reveal'>): Promise<Fairness> {
  if (!s.commitHash || !s.reveal) return 'none';
  try { return (await verifyReveal(s.commitHash, s.reveal.problemSet, s.reveal.salt)) ? 'ok' : 'bad'; } catch { return 'bad'; }
}

export type PodiumEntry = { rank: number; id: FighterId; name: string; points: number; scorePct: number; overturned: number; pose: 'victory' | 'ko' | 'idle'; skin: SkinSpec | null };
export function podium(s: MatchState, fighters?: Record<string, { name: string; skin: SkinSpec }>): PodiumEntry[] {
  return [...(s.standings ?? [])].sort((a, b) => a.rank - b.rank).map((st) => ({
    rank: st.rank, id: st.fighterId, name: nameOf(st.fighterId, fighters), points: st.points, scorePct: st.scorePct, overturned: st.overturned,
    pose: st.rank === 1 ? 'victory' : st.rank === 4 ? 'ko' : 'idle', skin: skinOf(st.fighterId, fighters),
  }));
}
export const varOverturns = (s: MatchState): number => (s.standings ?? []).reduce((n, st) => n + st.overturned, 0);

/** Which data source a /match/:id param should open. Fixture names and an offline connection replay; otherwise watch live. */
export function sourceFor(id: string, conn: string, knownMatches: Record<string, unknown>): 'replay' | 'live' {
  if (conn === 'live' && id in knownMatches) return 'live';
  return 'replay';
}
