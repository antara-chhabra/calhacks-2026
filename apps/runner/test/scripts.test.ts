import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkInvariants, initialMatchState, reduceMatch, verifyReveal } from '@fc/engine';
import { runFakeSmoke } from '../../../scripts/smoke.js';
import { buildFixtureFromLog } from '../../../scripts/record.js';
import { recomputeAll } from '../../../scripts/recompute.js';

describe('scripts', () => {
  it('smoke (fake mode) passes every check', async () => {
    const r = await runFakeSmoke();
    expect(r.checks.filter((c) => !c.ok)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.bets.length).toBe(6);
  }, 30_000);

  it('record --from-log yields a settled, invariant-clean, reveal-verified fixture', async () => {
    const r = await runFakeSmoke();
    const file = join(mkdtempSync(join(tmpdir(), 'fc-rec-')), 'log.json');
    writeFileSync(file, JSON.stringify({ matchId: r.matchId, events: r.events, markets: r.markets,
      bets: r.bets.map(({ id, marketId, outcome, stake, handle }) => ({ id, marketId, outcome, stake, handle })) }));
    const fx = await buildFixtureFromLog(JSON.parse(readFileSync(file, 'utf8')));
    expect(fx.version).toBe(1);
    expect(fx.events.reduce(reduceMatch, initialMatchState()).status).toBe('settled');
    expect(checkInvariants(fx.events)).toEqual({ ok: true, violations: [] });
    const created = fx.events.find((e) => e.type === 'match.created');
    expect(created?.type === 'match.created' && await verifyReveal(created.data.commitHash, fx.problemSet, fx.salt)).toBe(true);
    for (const m of fx.markets) {
      const p = fx.expected.payouts[m.id]!;
      expect(Object.values(p.payouts).reduce((a, b) => a + b, 0) + p.rake + p.seedReturn + p.dust).toBe(p.total);
    }
  }, 30_000);

  it('record rejects an unsettled log', async () => {
    const r = await runFakeSmoke();
    const events = r.events.filter((e) => e.type !== 'match.settled');
    await expect(buildFixtureFromLog({ matchId: r.matchId, events, markets: r.markets })).rejects.toThrow(/not settled/);
  }, 30_000);

  it('recompute of no data is clean', () => {
    expect(recomputeAll([], new Map()).diffs).toEqual([]);
  });
});
