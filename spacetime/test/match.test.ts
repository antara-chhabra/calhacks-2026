import { describe, expect, it } from 'vitest';
import { RUNNER_POSTABLE } from '@fc/contracts';
import {
  RUNNER_POSTABLE_TYPES, canTransition, checkPostedBatch, checkPostedEvent, eventAllowedIn, poolsSnapshot, seedToCents,
  validateCreateMatch, validateStandings, winnerOf, standingToEvent,
} from '../src/logic/match.js';

const st = (fighterId: string, rank: number) => ({
  fighterId, rank, points: 0, scorePct: 0, hits: 0, misses: 0, overturned: 0, yellow: 0, red: 0,
  firstHitMs: undefined, lastScoreMs: 5, clutchPoints: 0, missesRecovered: 0,
});

describe('transitions', () => {
  it('allows the forward chain only', () => {
    expect(canTransition('open', 'locked')).toBe(true);
    expect(canTransition('locked', 'live')).toBe(true);
    expect(canTransition('live', 'review')).toBe(true);
    expect(canTransition('open', 'live')).toBe(false);
    expect(canTransition('live', 'locked')).toBe(false);
    expect(canTransition('locked', 'locked')).toBe(false);
  });
  it('void reachable before settled, terminal after', () => {
    for (const s of ['open', 'locked', 'live', 'review']) expect(canTransition(s, 'void')).toBe(true);
    for (const s of ['settled', 'void']) expect(canTransition(s, 'void')).toBe(false);
    expect(canTransition('void', 'locked')).toBe(false);
  });
});

describe('post_events gating', () => {
  it('allowlist matches @fc/contracts RUNNER_POSTABLE', () => {
    expect([...RUNNER_POSTABLE_TYPES].sort()).toEqual([...RUNNER_POSTABLE].sort());
  });
  it('verdict.final only in review, others only live', () => {
    expect(eventAllowedIn('review', 'verdict.final')).toBe(true);
    expect(eventAllowedIn('live', 'verdict.final')).toBe(false);
    expect(eventAllowedIn('live', 'fighter.say')).toBe(true);
    expect(eventAllowedIn('review', 'fighter.say')).toBe(false);
    expect(eventAllowedIn('open', 'fighter.say')).toBe(false);
    expect(eventAllowedIn('locked', 'match.intro')).toBe(true);   // §8.5.1: intro precedes match.started
    expect(eventAllowedIn('live', 'match.intro')).toBe(false);
  });
  it('rejects module-emitted types as bad_event, wrong status as bad_status', () => {
    expect(checkPostedEvent('live', 'match.started', '{}')).toMatchObject({ ok: false, code: 'bad_event' });
    expect(checkPostedEvent('open', 'fighter.say', '{}')).toMatchObject({ ok: false, code: 'bad_status' });
    expect(checkPostedEvent('live', 'fighter.say', 'nope')).toMatchObject({ ok: false, code: 'bad_event' });
    expect(checkPostedEvent('live', 'fighter.say', '[1]')).toMatchObject({ ok: false, code: 'bad_event' });
    expect(checkPostedEvent('live', 'fighter.say', '{"a":1}')).toEqual({ ok: true });
  });
  it('caps batches at 64', () => {
    const ev = { type: 'fighter.done', data: '{}' };
    expect(checkPostedBatch('live', Array(64).fill(ev))).toEqual({ ok: true });
    expect(checkPostedBatch('live', Array(65).fill(ev))).toMatchObject({ ok: false, code: 'bad_event' });
    expect(checkPostedBatch('live', [ev, { type: 'x', data: '{}' }])).toMatchObject({ ok: false });
  });
});

describe('seeds', () => {
  it('preserves integer cents with a 50 cent floor', () => {
    expect(seedToCents(4000n)).toBe(4000n);
    expect(seedToCents(500n)).toBe(500n);
    expect(seedToCents(0n)).toBe(50n);
  });
});

describe('validateCreateMatch', () => {
  const ok = {
    id: 'm1', fighterIds: ['a', 'b'], slots: [0, 1], problems: [1, 2, 3, 4, 5], bettingWindowMs: 1000, timeLimitMs: 1000,
    markets: [{ id: 'm1:w', outcomes: ['a', 'b'], seeds: [5n, 5n] }],
  };
  it('accepts a good payload', () => expect(validateCreateMatch(ok)).toBeNull());
  it('rejects bad fighters/problems/markets', () => {
    expect(validateCreateMatch({ ...ok, fighterIds: ['a', 'a'] })).toBe('bad_match');
    expect(validateCreateMatch({ ...ok, fighterIds: ['a'], slots: [0] })).toBe('bad_match');
    expect(validateCreateMatch({ ...ok, problems: [1] })).toBe('bad_match');
    expect(validateCreateMatch({ ...ok, markets: [{ id: 'x', outcomes: ['a', 'b'], seeds: [5n] }] })).toBe('bad_market');
    expect(validateCreateMatch({ ...ok, markets: [ok.markets[0]!, ok.markets[0]!] })).toBe('bad_market');
  });
});

describe('standings', () => {
  it('validates coverage and ranks', () => {
    expect(validateStandings(['a', 'b'], [st('a', 1), st('b', 2)])).toBeNull();
    expect(validateStandings(['a', 'b'], [st('a', 1)])).toBe('bad_standings');
    expect(validateStandings(['a', 'b'], [st('a', 1), st('a', 2)])).toBe('bad_standings');
    expect(validateStandings(['a', 'b'], [st('a', 1), st('c', 2)])).toBe('bad_standings');
    expect(validateStandings(['a', 'b'], [st('a', 0), st('b', 2)])).toBe('bad_standings');
    expect(validateStandings(['a', 'b'], [st('a', 1), st('b', 3)])).toBe('bad_standings');
  });
  it('winner is the unique rank 1', () => {
    expect(winnerOf([st('a', 2), st('b', 1)])).toBe('b');
    expect(winnerOf([st('a', 1), st('b', 1)])).toBeUndefined();
  });
  it('maps options to null for events', () => {
    expect(standingToEvent(st('a', 1))).toMatchObject({ firstHitMs: null, lastScoreMs: 5 });
  });
});

it('poolsSnapshot groups staked by market', () => {
  expect(poolsSnapshot([
    { marketId: 'w', outcome: 'a', staked: 100n }, { marketId: 'w', outcome: 'b', staked: 0n }, { marketId: 'f', outcome: 'none', staked: 7n },
  ])).toEqual({ w: { a: 100, b: 0 }, f: { none: 7 } });
});
