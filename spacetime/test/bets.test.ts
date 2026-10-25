import { describe, expect, it, vi } from 'vitest';

vi.mock('spacetimedb/server', () => ({ SenderError: class SenderError extends Error {} }));
import { validateBet, validCreditAmount, type BetCheckInput } from '../src/logic/bets';
import { applyLedger } from '../src/logic/ledger';

const ok: BetCheckInput = {
  registered: true, marketStatus: 'open', nowMicros: 1_000_000n, bettingClosesAtMicros: 2_000_000n,
  outcomes: ['A', 'B'], outcome: 'A', stake: 500n, balanceCents: 10_000n, alreadyStakedInMarket: 0n,
  isCreatorOfFighterInMatch: false, isRunner: false, lastBetAtMicros: undefined,
};
const v = (o: Partial<BetCheckInput>) => validateBet({ ...ok, ...o });

describe('validateBet', () => {
  it('accepts a valid bet', () => expect(v({})).toBeNull());
  it('not_registered', () => expect(v({ registered: false })).toBe('not_registered'));
  it('market_locked: status', () => expect(v({ marketStatus: 'locked' })).toBe('market_locked'));
  it('market_locked: past close (inclusive)', () => expect(v({ nowMicros: 2_000_000n })).toBe('market_locked'));
  it('bad_outcome', () => expect(v({ outcome: 'Z' })).toBe('bad_outcome'));
  it('bad_stake low/high, boundaries ok', () => {
    expect(v({ stake: 99n })).toBe('bad_stake');
    expect(v({ stake: 2501n })).toBe('bad_stake');
    expect(v({ stake: 100n })).toBeNull();
    expect(v({ stake: 2500n })).toBeNull();
  });
  it('insufficient_funds', () => expect(v({ balanceCents: 499n })).toBe('insufficient_funds'));
  it('market_cap', () => {
    expect(v({ alreadyStakedInMarket: 4501n })).toBe('market_cap');
    expect(v({ alreadyStakedInMarket: 4500n })).toBeNull();
  });
  it('self_bet_forbidden', () => expect(v({ isCreatorOfFighterInMatch: true })).toBe('self_bet_forbidden'));
  it('house_cannot_bet', () => expect(v({ isRunner: true })).toBe('house_cannot_bet'));
  it('slow_down', () => {
    expect(v({ lastBetAtMicros: 900_000n })).toBe('slow_down');
    expect(v({ lastBetAtMicros: 850_000n })).toBeNull();
  });
  it('first failing code wins in 8.8 order', () => {
    expect(v({ registered: false, stake: 1n })).toBe('not_registered');
    expect(v({ outcome: 'Z', stake: 1n })).toBe('bad_outcome');
  });
});

describe('validCreditAmount', () => {
  it('rejects 0 and over cap', () => {
    expect(validCreditAmount(0n)).toBe(false);
    expect(validCreditAmount(100_001n)).toBe(false);
    expect(validCreditAmount(5000n)).toBe(true);
  });
});

describe('applyLedger', () => {
  const mk = (bal: bigint) => {
    const players = new Map<string, any>([['id', { balanceCents: bal }]]);
    const txs: any[] = [];
    const ctx: any = {
      timestamp: 'T',
      db: {
        player: { identity: { find: (i: string) => players.get(i), update: (r: any) => players.set('id', r) } },
        ledgerTx: { insert: (r: any) => txs.push(r) },
      },
    };
    return { ctx, players, txs };
  };
  it('debits and records', () => {
    const { ctx, players, txs } = mk(1000n);
    expect(applyLedger(ctx, 'id' as any, -400n, 'stake', 'm1')).toBe(600n);
    expect(players.get('id').balanceCents).toBe(600n);
    expect(txs[0]).toMatchObject({ deltaCents: -400n, reason: 'stake', refId: 'm1' });
  });
  it('rejects negative balance', () => {
    const { ctx, txs } = mk(100n);
    expect(() => applyLedger(ctx, 'id' as any, -101n, 'stake', 'm1')).toThrow();
    expect(txs).toHaveLength(0);
  });
  it('rejects unknown player', () => {
    const { ctx } = mk(100n);
    expect(() => applyLedger(ctx, 'nope' as any, 1n, 'payout', 'x')).toThrow();
  });
});
