import { describe, expect, it } from 'vitest';
import { feedLine } from '../src/index.js';
import { buildLog, stateBefore } from './helpers/log.js';

const log = buildLog();
const text = (pred: (e: (typeof log)[number]) => boolean, nth = 0): string | null => {
  const idx = log.map((e, i) => (pred(e) ? i : -1)).filter((i) => i >= 0)[nth]!;
  return feedLine(stateBefore(log, idx), log[idx]!)?.text ?? null;
};

describe('feedLine', () => {
  it('system lines', () => {
    expect(text((e) => e.type === 'match.created')).toBe('Match #7 is open. Bets close in 1:30.');
    expect(text((e) => e.type === 'betting.locked')).toBe('Bets are locked.');
    expect(text((e) => e.type === 'match.started')).toBe('FIGHT!');
    expect(text((e) => e.type === 'match.intro')).toBeNull();
  });
  it('hits, misses, syntax', () => {
    expect(text((e) => e.type === 'verdict.live' && e.data.ok)).toBe('SAGE solves P1 \u00b7 +10');
    expect(text((e) => e.type === 'verdict.live' && !e.data.ok)).toBe('VEX misses P1 \u00b7 \u22125');
    expect(text((e) => e.type === 'verdict.live' && e.data.reason === 'invalid_syntax')).toBe('GLITCH fumbles P5 (bad syntax) \u00b7 \u22125');
  });
  it('say, cards, done, out', () => {
    expect(text((e) => e.type === 'fighter.say')).toBe('VEX: Kneel.');
    expect(text((e) => e.type === 'referee.card')).toBe('\u{1F7E8} GLITCH: blocked network call \u00b7 \u22125');
    expect(text((e) => e.type === 'fighter.done')).toBe('QUILL is done.');
    expect(text((e) => e.type === 'fighter.out')).toBe('GLITCH is sent off (red card).');
    expect(text((e) => e.type === 'fighter.thinking')).toBeNull();
    expect(text((e) => e.type === 'fighter.tool')).toBeNull();
    expect(text((e) => e.type === 'fighter.submit')).toBeNull();
  });
  it('review, result, money', () => {
    expect(text((e) => e.type === 'match.timeup')).toBe('TIME! The VAR is reviewing 6 hits.');
    expect(text((e) => e.type === 'verdict.final' && e.data.overturned)).toBe("VAR: VEX's P1 is overturned \u00b7 \u221210");
    expect(text((e) => e.type === 'match.result')).toBe('SAGE wins with 60 (40%).');
    expect(text((e) => e.type === 'match.revealed')).toBe('Problems revealed \u00b7 Provably fair \u2713');
    expect(text((e) => e.type === 'match.settled')).toBe('Paid out $42.10.');
    expect(text((e) => e.type === 'purse.entry')).toBe('VEX pays the 0.01 test USDC entry fee');
    expect(text((e) => e.type === 'purse.paid')).toBe('SAGE wins the purse: 0.09 test USDC');
  });
  it('emits a single held summary on the last pending hit', () => {
    const finals = log.filter((e) => e.type === 'verdict.final');
    const lines = finals.map((f) => feedLine(stateBefore(log, log.indexOf(f)), f)?.text ?? null);
    // order: 3 held (sage), overturned (vex P1), held (vex P2), held (quill P4)
    expect(lines.filter((l) => l?.startsWith('VAR: ') && l.endsWith('stand.'))).toEqual(['VAR: 5 hits stand.']);
  });
});
