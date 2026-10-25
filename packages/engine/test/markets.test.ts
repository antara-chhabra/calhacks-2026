import { describe, expect, it } from 'vitest';
import type { MarketSpec, Standing } from '@fc/contracts';
import { resolveMarkets, scoreLine, seedSplit, winProbabilities } from '../src/markets.js';
import type { FighterLive, MatchState } from '../src/state.js';

describe('winProbabilities', () => {
  it('sums to 1 and equal elo gives equal probs', () => {
    const p = winProbabilities({ a: 1000, b: 1000, c: 1000, d: 1000 });
    expect(Object.values(p).every((x) => Math.abs(x - 0.25) < 1e-12)).toBe(true);
  });
  it('400 points up is 10x weight', () => {
    const p = winProbabilities({ a: 1400, b: 1000 });
    expect(p.a / p.b).toBeCloseTo(10, 9);
    expect(p.a + p.b).toBeCloseTo(1, 12);
  });
});

describe('seedSplit', () => {
  it('sums to total with min 50 each', () => {
    for (const total of [200, 1000, 20000]) {
      const s = seedSplit([0.7, 0.2, 0.09, 0.01], total);
      expect(s.reduce((a, b) => a + b, 0)).toBe(total);
      expect(Math.min(...s)).toBeGreaterThanOrEqual(50);
      expect(s.every(Number.isInteger)).toBe(true);
    }
  });
  it('splits the free amount by probability', () => {
    expect(seedSplit([0.5, 0.5], 100)).toEqual([50, 50]);
    expect(seedSplit([0.75, 0.25], 300)).toEqual([200, 100]); // min 50 each + 200 free split 150/50
  });
  it('total 200 over 4 outcomes is forced flat by the 50 floor', () => {
    expect(seedSplit([0.7, 0.1, 0.1, 0.1], 200)).toEqual([50, 50, 50, 50]);
  });
  it('degenerate input still sums', () => {
    expect(seedSplit([0, 0, 0], 100).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('scoreLine', () => {
  it('provisional (<5 matches) uses 0.5', () => { expect(scoreLine([])).toBe(0.5); expect(scoreLine([0.9, 0.9])).toBe(0.5); });
  it('median rounded to nearest 5%', () => {
    expect(scoreLine([0.62, 0.58, 0.61, 0.6, 0.63])).toBe(0.6); // median 0.61 → 0.60
    expect(scoreLine([0.1, 0.2, 0.3, 0.4, 0.66])).toBe(0.3);
  });
  it('clamps to 0.2..0.9', () => {
    expect(scoreLine([0, 0, 0, 0, 0])).toBe(0.2);
    expect(scoreLine([1, 1, 1, 1, 1])).toBe(0.9);
  });
  it('uses only the last 10', () => {
    expect(scoreLine([...Array(10).fill(0.1), ...Array(10).fill(0.8)])).toBe(0.8);
  });
});

const live = (id: string, slot: 0 | 1 | 2 | 3, rank: number, solved: FighterLive['solved']): FighterLive => ({
  id, slot, points: 0, damagePct: 0, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0, status: 'done', solved, attempts: {}, lastSay: null, rank,
});
const standing = (id: string, rank: 1 | 2 | 3 | 4, scorePct: number): Standing => ({
  fighterId: id, rank, points: 0, scorePct, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0, firstHitMs: null, lastScoreMs: null, clutchPoints: 0, missesRecovered: 0,
});
function state(fighters: FighterLive[], standings: Standing[]): MatchState {
  return {
    matchId: 'm', status: 'settled', mode: 'live', isDemo: false, category: 'integrals', commitHash: null,
    problems: [1, 2, 3, 4, 5].map((i) => ({ idx: i as 1, difficulty: i as 1, points: (i * 10) as 10 })), timeLimitMs: 300000,
    order: fighters.map((f) => f.id), fighters: Object.fromEntries(fighters.map((f) => [f.id, f])), startedT: 0, t: 300000, lastSeq: 0,
    feed: [], standings, reveal: null, settled: null, purses: [], voidReason: null,
  };
}
const mk = (id: string, kind: MarketSpec['kind'], p: Partial<MarketSpec>): MarketSpec => ({ id, kind, subject: null, line: null, label: '', outcomes: [], seeds: [], rakeBps: 500, ...p });

describe('resolveMarkets', () => {
  const fighters = [
    live('vex', 0, 2, { 1: { atMs: 20000, target: 'sage', points: 10, final: 'overturned' }, 2: { atMs: 40000, target: 'sage', points: 20, final: 'held' } }),
    live('sage', 1, 1, { 5: { atMs: 55000, target: 'vex', points: 50, final: 'held' } }),
    live('pip', 2, 3, {}),
    live('quill', 3, 4, {}),
  ];
  const st = [standing('sage', 1, 0.7), standing('vex', 2, 0.3), standing('pip', 3, 0), standing('quill', 4, 0)];
  it('resolves every kind', () => {
    const r = resolveMarkets(state(fighters, st), [
      mk('m:winner', 'winner', { outcomes: ['vex', 'sage', 'pip', 'quill'] }),
      mk('m:score_line:sage', 'score_line', { subject: 'sage', line: 0.7, outcomes: ['over', 'under'] }),
      mk('m:score_line:vex', 'score_line', { subject: 'vex', line: 0.35, outcomes: ['over', 'under'] }),
      mk('m:beat_clock', 'beat_clock', { line: 60000, outcomes: ['yes', 'no'] }),
      mk('m:first_blood', 'first_blood', { outcomes: ['vex', 'sage', 'pip', 'quill', 'none'] }),
    ]);
    expect(r).toEqual([
      { marketId: 'm:winner', outcome: 'sage' },
      { marketId: 'm:score_line:sage', outcome: 'over' },        // 0.7 ≥ 0.7
      { marketId: 'm:score_line:vex', outcome: 'under' },
      { marketId: 'm:beat_clock', outcome: 'yes' },               // sage's 5★ at 55 s held
      { marketId: 'm:first_blood', outcome: 'vex' },              // vex P1 at 20 s was overturned, so vex P2 at 40 s is first surviving
    ]);
  });
  it('beat_clock no when 5★ is late or overturned; first_blood none when no hits', () => {
    const f2 = [live('a', 0, 1, { 5: { atMs: 70000, target: 'b', points: 50, final: 'held' } }), live('b', 1, 2, { 5: { atMs: 10000, target: 'a', points: 50, final: 'overturned' } })];
    const r = resolveMarkets(state(f2, [standing('a', 1, 0.5), standing('b', 2, 0)]), [mk('bc', 'beat_clock', { line: 60000 }), mk('fb', 'first_blood', {})]);
    expect(r).toEqual([{ marketId: 'bc', outcome: 'no' }, { marketId: 'fb', outcome: 'a' }]);
    const f3 = [live('a', 0, 1, {}), live('b', 1, 2, {})];
    expect(resolveMarkets(state(f3, [standing('a', 1, 0), standing('b', 2, 0)]), [mk('fb', 'first_blood', {})])).toEqual([{ marketId: 'fb', outcome: 'none' }]);
  });
  it('beat_clock counts from the bell, not from match.created', () => {
    // atMs is envelope t: bell at 9 s, 5★ at t = 64 s → 55 s after the bell → yes
    const f = [live('a', 0, 1, { 5: { atMs: 64000, target: 'b', points: 50, final: 'held' } }), live('b', 1, 2, {})];
    const s = { ...state(f, [standing('a', 1, 0.5), standing('b', 2, 0)]), startedT: 9000 };
    expect(resolveMarkets(s, [mk('bc', 'beat_clock', { line: 60000 })])).toEqual([{ marketId: 'bc', outcome: 'yes' }]);
  });
});
