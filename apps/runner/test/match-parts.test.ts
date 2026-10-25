import { describe, it, expect } from 'vitest';
import { HOUSE_ROSTER } from '@fc/contracts';
import { pickFighters, EventBatcher, filterSay, buildMarkets, type Candidate } from '../src/match/index.js';
import { createRng } from '../src/problems/rng.js';

const S = { verify: false, order: 'in_order', risk: 'cautious', taunts: 1 } as const;
const house = (id: keyof typeof HOUSE_ROSTER, last: number): Candidate => ({ fighter: HOUSE_ROSTER[id], origin: 'house', engine: 'mock', persona: '', strategy: S, elo: 1000, lastMatchAt: last });
const comm = (id: string, last: number, debut = false): Candidate => ({ fighter: { ...HOUSE_ROSTER.pip, id }, origin: 'community', engine: 'mock', persona: '', strategy: S, elo: 1000, lastMatchAt: last, debutPending: debut });
const rnd = () => { const r = createRng('00000000000000000000000000000002'); return () => r.next(); };

describe('scheduler', () => {
  const pool = [house('vex', 5), house('sage', 1), house('glitch', 3), house('quill', 2), house('brick', 4), house('pip', 6)];
  it('takes least-recently-fought first, 4 distinct slots', () => {
    const { picked, slots } = pickFighters(pool, rnd());
    expect(picked.map((c) => c.fighter.id).sort()).toEqual(['brick', 'glitch', 'quill', 'sage']);
    expect([...slots].sort()).toEqual([0, 1, 2, 3]);
  });
  it('limits community slots and prioritises debut', () => {
    const { picked } = pickFighters([...pool, comm('f_a', 0), comm('f_b', 0, true)], rnd(), 1);
    const ids = picked.map((c) => c.fighter.id);
    expect(ids).toContain('f_b');
    expect(ids).not.toContain('f_a');
    expect(ids.filter((i) => i.startsWith('f_'))).toHaveLength(1);
  });
  it('skips inactive and throws when short', () => {
    expect(() => pickFighters(pool.slice(0, 3), rnd())).toThrow('not_enough_fighters');
    expect(() => pickFighters(pool.map((c) => ({ ...c, active: false })), rnd())).toThrow();
  });
});

describe('batcher', () => {
  it('chunks ≤ 64 without splitting groups', async () => {
    const calls: number[] = [];
    const b = new EventBatcher(async (e) => { calls.push(e.length); });
    for (let i = 0; i < 40; i++) b.push({ type: 'fighter.submit', data: {} }, { type: 'verdict.live', data: {} });
    await b.flush();
    expect(calls).toEqual([64, 16]);
    await b.stop();
    expect(b.push({ type: 'x', data: {} })).toBe(false);
  });
});

describe('say filter', () => {
  it('truncates and strips', () => {
    const r = filterSay('hello www.x.com gpt-4o ' + 'a'.repeat(200));
    expect(r.ok && r.text.length).toBeLessThanOrEqual(80);
    expect(r.ok && r.text).not.toMatch(/www|gpt/);
    expect(filterSay('I am an AI model').ok).toBe(false);
  });
});

describe('markets', () => {
  it('seeds in cents', () => {
    const ms = buildMarkets('m1', [house('vex', 0), house('sage', 0), house('glitch', 0), house('quill', 0)]);
    expect(ms.find((m) => m.kind === 'first_blood')!.seeds).toEqual([4000, 4000, 4000, 4000, 4000]);
    expect(ms.find((m) => m.kind === 'score_line')!.seeds).toEqual([5000, 5000]);
  });
});
