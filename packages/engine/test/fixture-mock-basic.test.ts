import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fightEnvelopeSchema, marketSpecSchema, problemSetSchema, type FightEnvelope } from '@fc/contracts';
import { checkInvariants, deriveCues, initialMatchState, reduceMatch, settleMarket, verifyReveal, type ArenaCue, type MatchState } from '../src/index.js';
import { renderMockBasic, type MockBasicFixture } from '../../../scripts/gen-mock-basic.js';

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/matches/mock-basic.json');
const raw = readFileSync(FILE, 'utf8');
const fx = JSON.parse(raw) as MockBasicFixture;

describe('fixture mock-basic', () => {
  it('every event parses and ordering is sane', () => {
    expect(fx.events.length).toBeGreaterThanOrEqual(100);
    fx.events.forEach((e, i) => {
      expect(fightEnvelopeSchema.safeParse(e).success, `event ${i + 1} ${e.type}`).toBe(true);
      expect(e.seq).toBe(i + 1);
      if (i > 0) expect(e.t).toBeGreaterThanOrEqual(fx.events[i - 1]!.t);
    });
    fx.markets.forEach((m) => expect(marketSpecSchema.safeParse(m).success).toBe(true));
    expect(problemSetSchema.safeParse(fx.problemSet).success).toBe(true);
    expect(fx.problemSet.seed).toMatch(/^[0-9a-f]{32}$/);
  });

  it('covers every event type except match.void', () => {
    const types = new Set(fx.events.map((e) => e.type));
    for (const t of ['match.created', 'betting.locked', 'purse.entry', 'match.intro', 'match.started', 'fighter.thinking', 'fighter.tool', 'fighter.say',
      'fighter.submit', 'verdict.live', 'referee.card', 'fighter.hint', 'fighter.done', 'fighter.out', 'match.timeup', 'verdict.final',
      'match.result', 'match.revealed', 'match.settled', 'purse.paid']) expect(types.has(t as FightEnvelope['type']), t).toBe(true);
    expect(fx.events.filter((e) => e.type === 'purse.entry')).toHaveLength(4);
    expect(fx.events.filter((e) => e.type === 'referee.card' && e.data.color === 'yellow')).toHaveLength(2);
    expect(fx.events.filter((e) => e.type === 'referee.card' && e.data.color === 'red')).toHaveLength(1);
    expect(fx.events.filter((e) => e.type === 'verdict.final' && e.data.overturned)).toHaveLength(1);
  });

  it('reduces cleanly to settled, invariants hold, reveal verifies', async () => {
    const final = fx.events.reduce(reduceMatch, initialMatchState());
    expect(final.status).toBe('settled');
    expect(final.mode).toBe('mock');
    expect(checkInvariants(fx.events)).toEqual({ ok: true, violations: [] });
    const created = fx.events[0]!;
    expect(created.type === 'match.created' && (await verifyReveal(created.data.commitHash, fx.problemSet, fx.salt))).toBe(true);
    const rev = fx.events.find((e) => e.type === 'match.revealed')!;
    expect(rev.type === 'match.revealed' && rev.data.problemSet).toEqual(fx.problemSet);
  });

  it('final standings equal match.result and expected', () => {
    const final = fx.events.reduce(reduceMatch, initialMatchState());
    const res = fx.events.find((e) => e.type === 'match.result')!;
    const standings = res.type === 'match.result' ? res.data.standings : [];
    expect(final.standings).toEqual(standings);
    expect(standings).toEqual(fx.expected.standings);
    for (const s of standings) expect(final.fighters[s.fighterId]!.points).toBe(s.points);
    expect(standings.find((s) => s.fighterId === 'vex')!.overturned).toBe(1);
  });

  it('deriveCues never throws and yields an overturned var cue', () => {
    let s: MatchState = initialMatchState();
    const cues: ArenaCue[] = [];
    for (const e of fx.events) { cues.push(...deriveCues(s, e)); s = reduceMatch(s, e); }
    expect(cues.some((c) => c.kind === 'var' && c.overturned)).toBe(true);
  });

  it('settlement conserves money for every market and matches the log', () => {
    const settled = fx.events.find((e) => e.type === 'match.settled')!;
    if (settled.type !== 'match.settled') throw new Error('no settled');
    expect(settled.data.results).toEqual(fx.expected.results);
    let paid = 0;
    for (const m of fx.markets) {
      const pools = m.outcomes.map((o, i) => ({ outcome: o, seed: m.seeds[i]!,
        staked: fx.bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0) }));
      const total = pools.reduce((a, p) => a + p.staked + p.seed, 0);
      const r = settleMarket(pools, fx.bets.filter((b) => b.marketId === m.id), settled.data.results.find((x) => x.marketId === m.id)!.outcome, m.rakeBps);
      const sum = Object.values(r.payouts).reduce((a, b) => a + b, 0);
      expect(sum + r.seedReturn + r.dust + r.rake).toBe(total);
      expect(r.payouts).toEqual(fx.expected.payouts[m.id]!.payouts);
      paid += sum;
    }
    expect(settled.data.totalPaid).toBe(paid);
    const lock = fx.events.find((e) => e.type === 'betting.locked')!;
    if (lock.type !== 'betting.locked') throw new Error('no lock');
    for (const m of fx.markets) for (const o of m.outcomes) {
      expect(lock.data.pools[m.id]![o]).toBe(fx.bets.filter((b) => b.marketId === m.id && b.outcome === o).reduce((a, b) => a + b.stake, 0));
    }
    expect(fx.markets.map((m) => m.seeds.reduce((a, b) => a + b, 0))).toEqual([20000, 10000, 10000, 20000]);
  });

  it('regenerating is byte-identical', async () => {
    expect(await renderMockBasic()).toBe(raw);
  });
});
