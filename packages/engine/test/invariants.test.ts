import { describe, expect, it } from 'vitest';
import type { FightEnvelope } from '@fc/contracts';
import { checkInvariants } from '../src/index.js';
import { buildLog } from './helpers/log.js';

const renumber = (es: FightEnvelope[]) => es.map((e, i) => ({ ...e, seq: i + 1 }) as FightEnvelope);

describe('checkInvariants', () => {
  it('passes the synthetic log', () => {
    const r = checkInvariants(buildLog());
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });
  it('#1 detects seq gaps', () => {
    const log = buildLog(); log.splice(5, 1);
    expect(checkInvariants(log).violations.join()).toMatch(/#1/);
  });
  it('#2 detects runner event before started and after timeup', () => {
    const log = buildLog();
    const early = log.findIndex((e) => e.type === 'fighter.thinking');
    const moved = renumber([...log.slice(0, 3), log[early]!, ...log.slice(3, early), ...log.slice(early + 1)]);
    expect(checkInvariants(moved).violations.join()).toMatch(/#2/);
    const t = log.findIndex((e) => e.type === 'match.timeup');
    const late = renumber([...log.slice(0, t + 1), log[early]!, ...log.slice(t + 1)]);
    expect(checkInvariants(late).ok).toBe(false);
  });
  it('#3 detects a submit without its verdict', () => {
    const log = buildLog();
    const i = log.findIndex((e) => e.type === 'verdict.live');
    expect(checkInvariants(renumber(log.filter((_, k) => k !== i))).violations.join()).toMatch(/#3/);
  });
  it('#4 detects duplicate and unknown verdict.final', () => {
    const log = buildLog();
    const i = log.findIndex((e) => e.type === 'verdict.final');
    expect(checkInvariants(renumber([...log.slice(0, i + 1), log[i]!, ...log.slice(i + 1)])).violations.join()).toMatch(/#4/);
    expect(checkInvariants(renumber(log.filter((_, k) => k !== i))).violations.join()).toMatch(/#4/);
  });
  it('#5 detects points that do not reconcile', () => {
    const log = buildLog();
    const i = log.findIndex((e) => e.type === 'match.result');
    const bad = structuredClone(log);
    (bad[i] as { data: { standings: { points: number }[] } }).data.standings[0]!.points += 1;
    expect(checkInvariants(bad).violations.join()).toMatch(/#5/);
  });
  it('rejects events after void', () => {
    const log = buildLog().slice(0, 3);
    log.push({ ...log[0]!, seq: 4, type: 'match.void', data: { reason: 'x' } } as FightEnvelope);
    expect(checkInvariants(log).ok).toBe(true);
    log.push({ ...log[0]!, seq: 5, type: 'betting.locked', data: { pools: {} } } as FightEnvelope);
    expect(checkInvariants(log).ok).toBe(false);
  });
});
