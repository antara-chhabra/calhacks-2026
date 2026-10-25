import { describe, expect, it } from 'vitest';
import { decimalOdds } from '@fc/engine';
import { ERROR_COPY, errorCopy, fmtOdds, impliedPct, parseDollars, payoutPreview, PLACE_BET_CODES, validateStake } from '../src/ui/betslip/logic';

const m = { outcomes: ['a', 'b'], rakeBps: 500, pools: { a: { staked: 1000, seed: 500, bettors: 1 }, b: { staked: 3000, seed: 500, bettors: 2 } } };
const ok = { status: 'open' as const, registered: true, balanceCents: 10000, myOpenStake: 0 };

describe('payout preview', () => {
  it('equals stake × decimalOdds with the stake added to its pool', () => {
    const o = decimalOdds([{ outcome: 'a', staked: 1500, seed: 500 }, { outcome: 'b', staked: 3000, seed: 500 }], 500)['a']!;
    expect(payoutPreview(m, 'a', 500)).toBe(Math.floor(500 * o));
  });
  it('is below the stale-odds payout (odds move against you) and 0 for no stake', () => {
    const stale = decimalOdds([{ outcome: 'a', staked: 1000, seed: 500 }, { outcome: 'b', staked: 3000, seed: 500 }], 500)['a']!;
    expect(payoutPreview(m, 'a', 500)).toBeLessThan(Math.floor(500 * stale));
    expect(payoutPreview(m, 'a', 0)).toBe(0);
  });
  it('formats odds and implied %', () => { expect(fmtOdds(0)).toBe('—'); expect(fmtOdds(2.5)).toBe('2.50'); expect(impliedPct(4)).toBe('25%'); expect(impliedPct(0)).toBe('—'); });
  it('parses dollars', () => { expect(parseDollars('$12.5')).toBe(1250); expect(parseDollars('abc')).toBe(0); });
});

describe('stake validation', () => {
  it('accepts $1–$25', () => { expect(validateStake(100, ok)).toBeNull(); expect(validateStake(2500, ok)).toBeNull(); });
  it('rejects out of range', () => { expect(validateStake(99, ok)?.code).toBe('bad_stake'); expect(validateStake(2600, ok)?.code).toBe('bad_stake'); expect(validateStake(150.5, ok)?.code).toBe('bad_stake'); });
  it('enforces the $50 market cap from open stakes', () => {
    expect(validateStake(1000, { ...ok, myOpenStake: 4000 })).toBeNull();
    const r = validateStake(1100, { ...ok, myOpenStake: 4000 });
    expect(r?.code).toBe('market_cap'); expect(r?.message).toContain('Max $50 per market.'); expect(r?.message).toContain('$10.00');
  });
  it('checks locked, registration, balance in order', () => {
    expect(validateStake(500, { ...ok, status: 'locked', registered: false })?.code).toBe('market_locked');
    expect(validateStake(500, { ...ok, registered: false })?.code).toBe('not_registered');
    expect(validateStake(500, { ...ok, balanceCents: 400 })?.code).toBe('insufficient_funds');
  });
});

describe('error copy', () => {
  it('covers every §8.8 place_bet code with non-generic copy', () => {
    for (const c of PLACE_BET_CODES) expect(errorCopy(new Error(c)), c).toBe(ERROR_COPY[c]);
  });
  it('matches §10.4 wording', () => {
    expect(errorCopy(new Error('market_locked'))).toBe('Bets closed for this match.');
    expect(errorCopy(new Error('insufficient_funds'))).toBe('Not enough balance. Add funds or bet less.');
    expect(errorCopy(new Error('market_cap'))).toBe('Max $50 per market.');
    expect(errorCopy(new Error('self_bet_forbidden'))).toBe("You can back your own fighter to win, but not bet against it or on side markets.");
    expect(errorCopy(new Error('slow_down'))).toBe('Easy — one bet at a time.');
    expect(errorCopy(new Error('not_connected'))).toBe('Replay is read-only — join a live match to bet');
    expect(errorCopy(new Error('weird'))).toBe('Could not place that bet. Try again.');
  });
});
