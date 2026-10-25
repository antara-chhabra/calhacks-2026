import { describe, expect, it } from 'vitest';
import { initialMatchState, reduceMatch } from '../src/index.js';
import { buildLog, reduceAll } from './helpers/log.js';

describe('reduceMatch', () => {
  const log = buildLog();
  it('reduces the full log to a settled match', () => {
    const s = reduceAll(log);
    expect(s.status).toBe('settled');
    expect(s.lastSeq).toBe(log.length);
    expect(s.order).toEqual(['vex', 'sage', 'glitch', 'quill']);
    expect(s.fighters.sage!.status).toBe('winner');
    expect(s.fighters.glitch!.status).toBe('ko');
    expect(s.fighters.sage!.points).toBe(60);
    expect(s.fighters.vex!.points).toBe(15);
    expect(s.standings).toHaveLength(4);
    expect(s.reveal?.salt).toBe('salt');
    expect(s.settled?.totalPaid).toBe(4210);
    expect(s.purses.filter((p) => p.kind === 'entry')).toHaveLength(4);
    expect(s.purses.filter((p) => p.kind === 'paid')).toHaveLength(1);
  });
  it('does not mutate its input', () => {
    let s = initialMatchState();
    for (const e of log) {
      const before = JSON.stringify(s);
      const frozenEvent = JSON.stringify(e);
      const next = reduceMatch(s, e);
      expect(JSON.stringify(s)).toBe(before);
      expect(JSON.stringify(e)).toBe(frozenEvent);
      s = next;
    }
  });
  it('applies ADR-002 damage and overturn', () => {
    const i = log.findIndex((e) => e.type === 'verdict.live' && e.data.ok && e.data.fighterId === 'vex' && e.data.problem === 1);
    const s = reduceAll(log.slice(0, i + 1));
    expect(s.fighters.vex!.solved[1]!.target).toBe('sage');           // sage leads at that moment
    const j = log.findIndex((e) => e.type === 'verdict.final' && e.data.overturned);
    const before = reduceAll(log.slice(0, j));
    const after = reduceAll(log.slice(0, j + 1));
    const sol = before.fighters.vex!.solved[1]!;
    expect(after.fighters[sol.target]!.damagePct).toBeCloseTo(before.fighters[sol.target]!.damagePct - 12);
    expect(after.fighters.vex!.damagePct).toBeCloseTo(before.fighters.vex!.damagePct + 10);
    expect(after.fighters.vex!.solved[1]!.final).toBe('overturned');
    expect(after.fighters.vex!.overturned).toBe(1);
  });
  it('tracks statuses, miss penalty and cards', () => {
    const k = log.findIndex((e) => e.type === 'fighter.out');
    const s = reduceAll(log.slice(0, k + 1));
    expect(s.fighters.glitch!.status).toBe('out');
    expect(s.fighters.glitch!.points).toBe(-20);                       // -5 miss, -5 yellow, -10 red
    expect(s.fighters.glitch!.yellow).toBe(1);
    expect(s.fighters.glitch!.red).toBe(1);
    expect(s.fighters.sage!.status).toBe('working');
    expect(s.fighters.vex!.lastSay?.text).toBe('Kneel.');
  });
  it('caps the feed at 120 and ignores duplicate seqs', () => {
    let s = reduceAll(log.slice(0, 8));
    for (let n = 0; n < 200; n++) {
      s = reduceMatch(s, { v: 1, matchId: 'm_7', seq: 100 + n, t: 9000 + n, type: 'fighter.say', data: { fighterId: 'vex', text: `x${n}`, source: 'canned' } });
    }
    expect(s.feed).toHaveLength(120);
    expect(s.feed.at(-1)!.text).toBe('VEX: x199');
    expect(reduceMatch(s, log[1]!)).toBe(s);
  });
  it('handles void', () => {
    const s = reduceAll([...log.slice(0, 2), { ...log[0]!, seq: 3, type: 'match.void', data: { reason: 'quorum lost' } } as never]);
    expect(s.status).toBe('void');
    expect(s.voidReason).toBe('quorum lost');
  });
});
