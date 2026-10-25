import { describe, expect, it } from 'vitest';
import { validateStake } from '../src/ui/betslip/logic';
import { barPct, canBet, clampStake, pickView, winnerMarket } from '../src/ui/mobile/model';

describe('mobile state selection', () => {
  it('maps match status to bet / live / result', () => {
    for (const s of ['scheduled', 'open'] as const) expect(pickView(s)).toBe('bet');
    for (const s of ['locked', 'live', 'review'] as const) expect(pickView(s)).toBe('live');
    for (const s of ['settled', 'void'] as const) expect(pickView(s)).toBe('result');
    expect(pickView(null)).toBe('bet');
  });
  it('only allows betting on a live connection with an open market', () => {
    expect(canBet('live', 'open')).toBe(true);
    expect(canBet('replay', 'open')).toBe(false);
    expect(canBet('live', 'locked')).toBe(false);
  });
});

describe('stake clamp reuses betslip validation', () => {
  it('clamps to $1–$25 in whole dollars', () => {
    expect(clampStake(0)).toBe(100); expect(clampStake(99999)).toBe(2500); expect(clampStake(149)).toBe(100);
    expect(clampStake(Number.NaN)).toBe(100); expect(clampStake(1250)).toBe(1300);
  });
  it('every clamped stake passes validateStake; out-of-range raw values do not', () => {
    const ctx = { status: 'open' as const, registered: true, balanceCents: 10000, myOpenStake: 0 };
    for (const raw of [-5, 0, 50, 777, 2500, 10000]) expect(validateStake(clampStake(raw), ctx)).toBeNull();
    expect(validateStake(5000, ctx)?.code).toBe('bad_stake');
  });
});

describe('helpers', () => {
  it('picks the winner market of the match', () => {
    const ms = { a: { id: 'm1:score_line', kind: 'score_line' }, b: { id: 'm1:winner', kind: 'winner' } };
    expect(winnerMarket(ms, 'm1')?.id).toBe('m1:winner');
    expect(winnerMarket({}, 'm1')).toBeNull();
  });
  it('scales bars to the leader', () => { expect(barPct(5, 10)).toBe(50); expect(barPct(0, 0)).toBe(2); });
});
