import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { creditsByBettor, nextFighterStatus, ovrFromElo, planMarket } from '../src/logic/settle.js';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../fixtures/matches/mock-basic.json');
const fx = JSON.parse(readFileSync(FILE, 'utf8')) as {
  markets: { id: string; outcomes: string[]; seeds: number[]; rakeBps: number }[];
  bets: { id: string; marketId: string; outcome: string; stake: number; handle: string }[];
  expected: { results: { marketId: string; outcome: string }[];
    payouts: Record<string, { payouts: Record<string, number>; rake: number; seedReturn: number; dust: number; total: number }> };
};

function plan(marketId: string) {
  const mk = fx.markets.find((m) => m.id === marketId)!;
  const bets = fx.bets.filter((b) => b.marketId === marketId);
  return planMarket({
    marketId, rakeBps: mk.rakeBps, result: fx.expected.results.find((r) => r.marketId === marketId)!.outcome,
    pools: mk.outcomes.map((o, i) => ({
      outcome: o, seed: BigInt(mk.seeds[i]!),
      staked: BigInt(bets.filter((b) => b.outcome === o).reduce((a, b) => a + b.stake, 0)),
    })),
    bets: bets.map((b) => ({ id: BigInt(b.id.slice(1)), bettor: b.handle, outcome: b.outcome, stake: BigInt(b.stake) })),
  });
}

describe('settlement matches mock-basic (ADR-019)', () => {
  for (const marketId of Object.keys(fx.expected.payouts)) {
    it(marketId, () => {
      const exp = fx.expected.payouts[marketId]!;
      const p = plan(marketId);
      const got: Record<string, number> = {};
      for (const b of p.bets) got[`b${b.id}`] = Number(b.payout);
      expect(got).toEqual(exp.payouts);
      expect(Number(p.rake)).toBe(exp.rake);
      expect(Number(p.seedReturn)).toBe(exp.seedReturn);
      expect(Number(p.dust)).toBe(exp.dust);
      expect(Number(p.total)).toBe(exp.total);
      // conservation: payouts + treasury share = total pool
      expect(p.paid + p.treasury).toBe(p.total);
    });
  }

  it('marks won/lost and aggregates credits per bettor', () => {
    const plans = Object.keys(fx.expected.payouts).map(plan);
    expect(plans[0]!.bets.find((b) => b.id === 1n)!.status).toBe('won');
    expect(plans[0]!.bets.find((b) => b.id === 2n)!.status).toBe('lost');
    const c = creditsByBettor(plans);
    expect(c.get('JudgeOtter42')).toBe(6566n);
    expect(c.get('bay_bob')).toBe(2626n + 3528n + 1491n);
    expect(c.has('calhacks_dev')).toBe(false);
  });
});

describe('helpers', () => {
  it('ovrFromElo clamps', () => {
    expect(ovrFromElo(1000)).toBe(60);
    expect(ovrFromElo(1234)).toBe(83);
    expect(ovrFromElo(0)).toBe(40);
    expect(ovrFromElo(5000)).toBe(99);
  });
  it('provisional -> active at 5 matches', () => {
    expect(nextFighterStatus('provisional', 4)).toBe('provisional');
    expect(nextFighterStatus('provisional', 5)).toBe('active');
    expect(nextFighterStatus('retired', 9)).toBe('retired');
  });
});
