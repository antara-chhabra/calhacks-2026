import { describe, expect, it } from 'vitest';
import type { ArenaCue } from '@fc/engine';
import { BUBBLE_MAX_CHARS, LabelModel, clampBubble, damageColor, damageText, hitText, wrapBubble } from '../src/arena/labels/model';

const attack = { kind: 'attack', fighter: 'a', target: 'b', power: 'heavy', problem: 3, points: 30, label: 'P3 · ★★★ · +30' } as unknown as ArenaCue;
const whiff = { kind: 'whiff', fighter: 'a', target: 'b', problem: 3, label: 'P3 · MISS · −5' } as unknown as ArenaCue;
const say = (fighter: string, text: string) => ({ kind: 'say', fighter, text }) as unknown as ArenaCue;

describe('labels', () => {
  it('hit text from cues', () => {
    expect(hitText(attack)).toEqual({ text: 'P3 · ★★★ · +30', target: 'b', kind: 'hit' });
    expect(hitText(whiff)).toEqual({ text: 'P3 · MISS · −5', target: 'b', kind: 'miss' });
    expect(hitText(say('a', 'x'))).toBeNull();
  });
  it('bubble truncates at 80 and wraps', () => {
    const t = clampBubble('word '.repeat(40));
    expect(t.length).toBeLessThanOrEqual(BUBBLE_MAX_CHARS);
    expect(t.endsWith('…')).toBe(true);
    expect(clampBubble('hi   there\n')).toBe('hi there');
    const lines = wrapBubble('the quick brown fox jumps over the lazy dog again and again');
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(22);
    expect(wrapBubble('x'.repeat(50)).every((l) => l.length <= 22)).toBe(true);
  });
  it('one bubble per fighter; new replaces old; expires at 3 s', () => {
    const m = new LabelModel();
    m.onCue(say('a', 'first')); m.onCue(say('b', 'other')); m.onCue(say('a', 'second'));
    expect(m.bubbles.size).toBe(2);
    expect(m.bubbles.get('a')!.lines.join(' ')).toBe('second');
    m.update(2900); expect(m.bubbles.size).toBe(2);
    m.update(200); expect(m.bubbles.size).toBe(0);
  });
  it('speed scales lifetimes', () => {
    const m = new LabelModel(); m.onCue(say('a', 'hi'));
    m.update(1600, 2); expect(m.bubbles.size).toBe(0);
  });
  it('damage colour ramp', () => {
    expect(damageColor(0)).toBe(0xffffff);
    expect(damageColor(-20)).toBe(0xffffff);
    expect(damageColor(60)).toBe(0xf2c14e);
    expect(damageColor(500)).toBe(0xe5383b);
    expect(damageColor(30)).not.toBe(damageColor(90));
    expect(damageText(37.6)).toBe('38%');
  });
  it('AC-07.3: hit label exists synchronously on cue arrival, and survives snap only until snap', () => {
    const m = new LabelModel();
    m.onCue(attack);
    expect(m.hits).toHaveLength(1);
    expect(m.hits[0]!.ageMs).toBe(0);
    m.onCue(whiff);
    expect(m.hits.map((h) => h.kind)).toEqual(['hit', 'miss']);
    m.update(1500); expect(m.hits).toHaveLength(0);
    m.onCue(attack); m.snap(); expect(m.hits).toHaveLength(0);
  });
});
