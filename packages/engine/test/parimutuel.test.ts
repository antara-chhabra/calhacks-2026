import { describe, expect, it } from 'vitest';
import { decimalOdds, settleMarket, type PoolState } from '../src/parimutuel.js';

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

describe('decimalOdds', () => {
  it('matches the hand-computed example', () => {
    // total = 1000+500+... : A 600+100, B 300+100 → total 1100; rake 5% = 55; net 1045
    const o = decimalOdds([{ outcome: 'A', staked: 600, seed: 100 }, { outcome: 'B', staked: 300, seed: 100 }], 500);
    expect(o.A).toBeCloseTo(1045 / 700, 10);
    expect(o.B).toBeCloseTo(1045 / 400, 10);
  });
  it('is 0 for an empty outcome', () => {
    const o = decimalOdds([{ outcome: 'A', staked: 100, seed: 50 }, { outcome: 'B', staked: 0, seed: 0 }], 500);
    expect(o.B).toBe(0);
    expect(o.A).toBeGreaterThan(0);
  });
});

describe('settleMarket', () => {
  it('pays winners pro rata and returns seed share', () => {
    const pools: PoolState = [{ outcome: 'A', staked: 300, seed: 100 }, { outcome: 'B', staked: 700, seed: 100 }];
    // total 1200, rake 60, net 1140; W(A) = 400
    const r = settleMarket(pools, [{ id: 'b1', outcome: 'A', stake: 200 }, { id: 'b2', outcome: 'A', stake: 100 }, { id: 'b3', outcome: 'B', stake: 700 }], 'A', 500);
    expect(r.rake).toBe(60);
    expect(r.payouts).toEqual({ b1: 570, b2: 285, b3: 0 }); // floor(200*1140/400)=570, floor(100*1140/400)=285
    expect(r.seedReturn).toBe(285); // floor(100*1140/400)
    expect(r.dust).toBe(0);
  });
  it('no winning bets: seed and everything else goes to treasury', () => {
    const pools: PoolState = [{ outcome: 'A', staked: 0, seed: 100 }, { outcome: 'B', staked: 500, seed: 100 }];
    const r = settleMarket(pools, [{ id: 'b', outcome: 'B', stake: 500 }], 'A', 500);
    expect(r.payouts).toEqual({ b: 0 });
    expect(r.seedReturn + r.dust + r.rake).toBe(700);
  });
  it('winning outcome with zero pool: all to dust, no NaN', () => {
    const pools: PoolState = [{ outcome: 'A', staked: 0, seed: 0 }, { outcome: 'B', staked: 500, seed: 100 }];
    const r = settleMarket(pools, [{ id: 'b', outcome: 'B', stake: 500 }], 'A', 500);
    expect(r.payouts.b).toBe(0);
    expect(r.seedReturn).toBe(0);
    expect(r.dust).toBe(600 - 30);
    expect(r.rake).toBe(30);
  });
  it('AC-06.1 conservation over 1000 random markets', () => {
    const rand = rng(42);
    for (let t = 0; t < 1000; t++) {
      const k = 2 + Math.floor(rand() * 4);
      const outcomes = Array.from({ length: k }, (_, i) => `o${i}`);
      const bets: { id: string; outcome: string; stake: number }[] = [];
      const nb = Math.floor(rand() * 30);
      for (let i = 0; i < nb; i++) bets.push({ id: `b${i}`, outcome: outcomes[Math.floor(rand() * k)], stake: 100 + Math.floor(rand() * 2401) });
      const pools: PoolState = outcomes.map((o) => ({ outcome: o, staked: bets.filter((b) => b.outcome === o).reduce((a, b) => a + b.stake, 0), seed: rand() < 0.2 ? 0 : 5 + Math.floor(rand() * 300) }));
      const result = outcomes[Math.floor(rand() * k)];
      const rakeBps = rand() < 0.8 ? 500 : Math.floor(rand() * 2000);
      const r = settleMarket(pools, bets, result, rakeBps);
      const total = pools.reduce((a, p) => a + p.staked + p.seed, 0);
      const paid = Object.values(r.payouts).reduce((a, b) => a + b, 0);
      expect(paid + r.rake + r.seedReturn + r.dust).toBe(total);
      expect(r.rake).toBeGreaterThanOrEqual(0);
      expect(r.seedReturn).toBeGreaterThanOrEqual(0);
      expect(r.dust).toBeGreaterThanOrEqual(0);
      for (const v of Object.values(r.payouts)) { expect(v).toBeGreaterThanOrEqual(0); expect(Number.isInteger(v)).toBe(true); }
    }
  });
});
