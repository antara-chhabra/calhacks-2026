import { describe, expect, it } from 'vitest';
import type { FightEvent } from '@fc/contracts';
import { deriveCues, feedLine } from '../src/index.js';
import { buildLog, envelope, reduceAll, stateBefore } from './helpers/log.js';

const log = buildLog();
const cuesAt = (pred: (e: (typeof log)[number]) => boolean, nth = 0) => {
  const idx = log.map((e, i) => (pred(e) ? i : -1)).filter((i) => i >= 0)[nth]!;
  return deriveCues(stateBefore(log, idx), log[idx]!);
};
const live = reduceAll(log.slice(0, 8));
const synth = (ev: FightEvent) => deriveCues(live, envelope(99, 9999, ev));

describe('deriveCues table (PRD 8.6)', () => {
  it('match.created / betting.locked / purse.entry / submit / tool-less rows give no cue', () => {
    expect(cuesAt((e) => e.type === 'match.created')).toEqual([]);
    expect(cuesAt((e) => e.type === 'betting.locked')).toEqual([]);
    expect(cuesAt((e) => e.type === 'purse.entry')).toEqual([]);
    expect(cuesAt((e) => e.type === 'fighter.submit')).toEqual([]);
    expect(cuesAt((e) => e.type === 'match.revealed')).toEqual([]);
    expect(cuesAt((e) => e.type === 'match.settled')).toEqual([]);
  });
  it('match.intro -> dropIn x fighters in slot order with lines', () => {
    const c = cuesAt((e) => e.type === 'match.intro');
    expect(c.map((x) => x.kind)).toEqual(['dropIn', 'dropIn', 'dropIn', 'dropIn']);
    expect(c.map((x) => (x as { slot: number }).slot)).toEqual([0, 1, 2, 3]);
    expect(c[0]).toEqual({ kind: 'dropIn', fighter: 'vex', slot: 0, line: 'Kneel.' });
  });
  it('match.started -> countdown; thinking -> think; tool -> toolUse; say -> say', () => {
    expect(cuesAt((e) => e.type === 'match.started')).toEqual([{ kind: 'countdown' }]);
    expect(cuesAt((e) => e.type === 'fighter.thinking')).toEqual([{ kind: 'think', fighter: 'sage' }]);
    expect(cuesAt((e) => e.type === 'fighter.tool')).toEqual([{ kind: 'toolUse', fighter: 'sage', tool: 'run' }]);
    expect(cuesAt((e) => e.type === 'fighter.say')).toEqual([{ kind: 'say', fighter: 'vex', text: 'Kneel.' }]);
  });
  it('verdict.live ok -> attack with power and label', () => {
    expect(cuesAt((e) => e.type === 'verdict.live' && e.data.ok, 0)[0]).toMatchObject(
      { kind: 'attack', fighter: 'sage', power: 'light', problem: 1, points: 10, label: 'P1 · ★ · +10' });
    expect(cuesAt((e) => e.type === 'verdict.live' && e.data.ok, 2)[0]).toMatchObject(
      { kind: 'attack', fighter: 'sage', power: 'heavy', label: 'P3 · ★★★ · +30' });
  });
  it('power buckets 10/20/30/40/50', () => {
    const p = (points: number) => (synth({ type: 'verdict.live', data: { fighterId: 'vex', problem: 1, ok: true, points, reason: 'hit', replaced: false } })[0] as { power: string }).power;
    expect([10, 20, 30, 40, 50].map(p)).toEqual(['light', 'heavy', 'heavy', 'special', 'special']);
  });
  it('verdict.live miss -> whiff', () => {
    expect(cuesAt((e) => e.type === 'verdict.live' && !e.data.ok)[0]).toMatchObject(
      { kind: 'whiff', fighter: 'vex', target: 'sage', problem: 1, label: 'P1 · MISS · −5' });
  });
  it('referee.card, hint, done, out, timeup', () => {
    expect(cuesAt((e) => e.type === 'referee.card')).toEqual([{ kind: 'card', fighter: 'glitch', color: 'yellow' }]);
    expect(synth({ type: 'fighter.hint', data: { fighterId: 'vex', problem: 4, txRef: null } })).toEqual([{ kind: 'potion', fighter: 'vex' }]);
    expect(cuesAt((e) => e.type === 'fighter.done')).toEqual([{ kind: 'done', fighter: 'quill' }]);
    expect(cuesAt((e) => e.type === 'fighter.out')).toEqual([{ kind: 'out', fighter: 'glitch', reason: 'red_card' }]);
    expect(cuesAt((e) => e.type === 'match.timeup')).toEqual([{ kind: 'timeup' }]);
  });
  it('verdict.final overturned -> var on the stored target; held -> no cue', () => {
    expect(cuesAt((e) => e.type === 'verdict.final' && e.data.overturned)).toEqual(
      [{ kind: 'var', fighter: 'vex', target: 'sage', problem: 1, overturned: true, points: -10 }]);
    expect(cuesAt((e) => e.type === 'verdict.final' && !e.data.overturned)).toEqual([]);
  });
  it('match.result -> ko for ranks 4,3,2 then victory', () => {
    expect(cuesAt((e) => e.type === 'match.result')).toEqual([
      { kind: 'ko', fighter: 'glitch', order: 1, rank: 4 },
      { kind: 'ko', fighter: 'vex', order: 2, rank: 3 },
      { kind: 'ko', fighter: 'quill', order: 3, rank: 2 },
      { kind: 'victory', fighter: 'sage' },
    ]);
  });
  it('purse.paid -> coin; match.void -> void', () => {
    expect(cuesAt((e) => e.type === 'purse.paid')).toEqual([{ kind: 'coin', fighter: 'sage', amountUsdc: 0.09 }]);
    expect(synth({ type: 'match.void', data: { reason: 'quorum lost' } })).toEqual([{ kind: 'void', reason: 'quorum lost' }]);
    expect(feedLine(live, envelope(99, 1, { type: 'match.void', data: { reason: 'quorum lost' } }))?.text).toBe('Match void: quorum lost. All bets refunded.');
    expect(feedLine(live, envelope(99, 1, { type: 'fighter.hint', data: { fighterId: 'pip', problem: 4, txRef: null } }))?.text).toBe('PIP buys a hint for P4 (0.02 test USDC)');
  });
});
