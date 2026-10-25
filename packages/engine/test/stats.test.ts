import { describe, expect, it } from 'vitest';
import type { EntryRow, FighterStats } from '@fc/contracts';
import { cardFrame, computeStats } from '../src/stats.js';

const base: EntryRow = {
  fighterId: 'vex', rank: 1, points: 0, scorePct: 0, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0, firstHitMs: null, lastScoreMs: null,
  clutchPoints: 0, missesRecovered: 0, matchId: 'm', slot: 0, mode: 'live', isDemo: false, voided: false, timeLimitMs: 100000, endedAt: 0,
  eloBefore: 1000, eloAfter: null, wonAtOdds: null,
} as EntryRow;
const e = (o: Partial<EntryRow>): EntryRow => ({ ...base, ...o });

const E1 = e({ matchId: 'm1', endedAt: 1000, rank: 1, points: 100, scorePct: 0.9, hits: 4, misses: 1, firstHitMs: 30000, clutchPoints: 20, missesRecovered: 1, eloBefore: 1000, eloAfter: 1016, wonAtOdds: 4.5 });
const E2 = e({ matchId: 'm2', endedAt: 2000, rank: 2, points: 60, scorePct: 0.6, hits: 3, misses: 1, yellow: 1, firstHitMs: 60000, clutchPoints: 30, missesRecovered: 0, eloBefore: 1016, eloAfter: 1010 });
const E3 = e({ matchId: 'm3', endedAt: 3000, rank: 4, points: 40, scorePct: 0.3, hits: 1, misses: 2, red: 1, firstHitMs: null, clutchPoints: 10, missesRecovered: 0, eloBefore: 1010, eloAfter: 995 });
const T = 100000;

describe('computeStats (hand-computed fixture, T = 100 000)', () => {
  const s = computeStats('vex', [E3, E1, E2, e({ mode: 'mock', endedAt: 4000 }), e({ isDemo: true, endedAt: 5000 }), e({ voided: true, endedAt: 6000 })], T, null);
  it('counts', () => {
    expect(s.matches).toBe(3); expect(s.wins).toBe(1); expect(s.podiums).toBe(2);
    expect(s.avgScorePct).toBeCloseTo(0.6, 12); // (0.9+0.6+0.3)/3
  });
  it('stats', () => {
    // SPD: firstHit [30000, 60000, null→100000], median 60000 → 30 + 69×(1 − 0.6) = 57.6 → 58
    expect(s.spd).toBe(58);
    // ACC: 30 + 69×0.6 = 71.4 → 71
    expect(s.acc).toBe(71);
    // CLU: Σclutch 60 / Σpoints 200 = 0.3 → 30 + 20.7 = 50.7 → 51
    expect(s.clu).toBe(51);
    // DIS: Σmisses 4, Σ(hits+misses) 12 → 30 + 69×(1 − 4/12) = 76; penalty 3×(yellow 1 + 3×red 1) = 12 → 64
    expect(s.dis).toBe(64);
    // GRT: misses 4 ≠ 0; Σrecovered 1 → 30 + 69×1/4 = 47.25 → 47
    expect(s.grt).toBe(47);
    // CON: stdev of [0.9, 0.6, 0.3] (population) = sqrt(0.18/3) = 0.24495 → 99 − min(69, 36.74) = 62.26 → 62
    expect(s.con).toBe(62);
    // OVR: last eloAfter 995 → round(60 + (995−1000)/10) = round(59.5) = 60
    expect(s.ovr).toBe(60);
  });
  it('form, streak, upset, history', () => {
    expect(s.form).toBe('LPW');          // newest first: rank 4 → L, rank 2 → P, rank 1 → W
    expect(s.streak).toBe(-2);           // two non-wins since last win
    expect(s.upsetUntil).toBe(1000 + 24 * 3600 * 1000); // E1 won at 4.5 ≥ 4.0
    expect(s.eloHistory).toEqual([1016, 1010, 995]);
  });
  it('carries backersWon / earningsUsdc from prev', () => {
    const p = computeStats('vex', [E1], T, { ...s, backersWon: 7, earningsUsdc: 0.5 });
    expect(p.backersWon).toBe(7); expect(p.earningsUsdc).toBe(0.5);
  });
  it('perfect fighter clamps to 99; zero-miss GRT is 70; streak counts wins', () => {
    const w = (i: number) => e({ endedAt: i, rank: 1, points: 100, scorePct: 1, hits: 5, firstHitMs: 0, clutchPoints: 100, eloBefore: 1000, eloAfter: 3000 });
    const p = computeStats('vex', [w(1), w(2), w(3)], T, null);
    expect(p.spd).toBe(99); expect(p.acc).toBe(99); expect(p.clu).toBe(99); expect(p.dis).toBe(99); expect(p.grt).toBe(70); expect(p.con).toBe(99); expect(p.ovr).toBe(99);
    expect(p.streak).toBe(3); expect(p.form).toBe('WWW');
  });
  it('uses only the last 20 entries', () => {
    const many = Array.from({ length: 25 }, (_, i) => e({ endedAt: i + 1, rank: i < 5 ? 4 : 1, scorePct: i < 5 ? 0 : 1, eloAfter: 1000 + i }));
    const p = computeStats('vex', many, T, null);
    expect(p.avgScorePct).toBe(1);
    expect(p.eloHistory).toHaveLength(20);
    expect(p.matches).toBe(25);
  });
});

describe('cardFrame', () => {
  const st = (o: Partial<FighterStats>): FighterStats => ({ fighterId: 'v', category: 'integrals', matches: 10, wins: 0, podiums: 0, avgScorePct: 0, spd: 50, acc: 50, clu: 50, dis: 50, grt: 50, con: 50, ovr: 60, form: '', streak: 0, upsetUntil: null, eloHistory: [], backersWon: 0, earningsUsdc: 0, ...o });
  it('tiers by OVR', () => {
    expect(cardFrame(st({ ovr: 64 }), false, 0)).toBe('bronze');
    expect(cardFrame(st({ ovr: 65 }), false, 0)).toBe('silver');
    expect(cardFrame(st({ ovr: 74 }), false, 0)).toBe('silver');
    expect(cardFrame(st({ ovr: 75 }), false, 0)).toBe('gold');
    expect(cardFrame(st({ ovr: 84 }), false, 0)).toBe('gold');
    expect(cardFrame(st({ ovr: 85 }), false, 0)).toBe('elite');
  });
  it('special frames override', () => {
    expect(cardFrame(st({ ovr: 90, streak: 3 }), false, 0)).toBe('hot_streak');
    expect(cardFrame(st({ ovr: 90, streak: 2 }), false, 0)).toBe('elite');
    expect(cardFrame(st({ upsetUntil: 1000 }), false, 999)).toBe('upset');
    expect(cardFrame(st({ upsetUntil: 1000 }), false, 1000)).toBe('bronze');
    expect(cardFrame(st({}), true, 0)).toBe('rookie');
  });
});
