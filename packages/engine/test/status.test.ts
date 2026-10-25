import { describe, expect, it } from 'vitest';
import { statusLine } from '../src/index.js';
import { buildLog, reduceAll } from './helpers/log.js';

describe('statusLine', () => {
  const log = buildLog();
  it('live line with leader, clock and solved count', () => {
    const i = log.findIndex((e) => e.type === 'verdict.live' && e.data.fighterId === 'sage' && e.data.problem === 3);
    const s = reduceAll(log.slice(0, i + 1));
    expect(statusLine(s)).toMatch(/^SAGE leads 40\u201320 \u00b7 \d:\d\d left \u00b7 3 of 5 solved$/);
  });
  it('counts down from the time limit', () => {
    const s = { ...reduceAll(log.slice(0, log.findIndex((e) => e.type === 'match.started') + 1)), t: 0 };
    const live = { ...s, startedT: 0, t: 73_000, timeLimitMs: 120_000 };
    expect(statusLine(live)).toContain('0:47 left');
  });
  it('covers open, review, settled', () => {
    expect(statusLine(reduceAll(log.slice(0, 1)))).toMatch(/Betting open/);
    const t = log.findIndex((e) => e.type === 'match.timeup');
    expect(statusLine(reduceAll(log.slice(0, t + 1)))).toMatch(/^Time!/);
    expect(statusLine(reduceAll(log))).toMatch(/^SAGE wins 60\u201340/);
  });
});
