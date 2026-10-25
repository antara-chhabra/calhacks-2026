import { describe, expect, it } from 'vitest';
import {
  HOUSE_ROSTER, RUNNER_POSTABLE, eventDataSchemas, fightEnvelopeSchema, fightEventSchema, fighterPublicSchema, forgeSpecSchema,
  parseRunnerPostable,
} from '../src/index.js';
import type { FightEventType } from '../src/index.js';
import { examples } from './examples.js';

describe('examples', () => {
  it('cover every event type exactly once', () => {
    expect(examples.map((e) => e.type).sort()).toEqual(Object.keys(eventDataSchemas).sort());
  });
  it.each(examples.map((e) => [e.type, e] as const))('%s envelope parses', (_t, env) => {
    expect(fightEnvelopeSchema.parse(env)).toEqual(env);
    expect(fightEventSchema.safeParse({ type: env.type, data: env.data }).success).toBe(true);
    expect(eventDataSchemas[env.type as FightEventType].safeParse(env.data).success).toBe(true);
  });
});

describe('negative cases', () => {
  const base = examples.find((e) => e.type === 'fighter.tool')!;
  it('rejects unknown type', () => expect(fightEnvelopeSchema.safeParse({ ...base, type: 'fighter.dance' }).success).toBe(false));
  it('rejects label > 48', () =>
    expect(fightEnvelopeSchema.safeParse({ ...base, data: { ...(base.data as object), label: 'x'.repeat(49) } }).success).toBe(false));
  it('rejects say > 80', () =>
    expect(fightEventSchema.safeParse({ type: 'fighter.say', data: { fighterId: 'vex', text: 'x'.repeat(81), source: 'model' } }).success).toBe(false));
  it('rejects bad seq / t / version', () => {
    expect(fightEnvelopeSchema.safeParse({ ...base, seq: 0 }).success).toBe(false);
    expect(fightEnvelopeSchema.safeParse({ ...base, seq: 1.5 }).success).toBe(false);
    expect(fightEnvelopeSchema.safeParse({ ...base, t: -1 }).success).toBe(false);
    expect(fightEnvelopeSchema.safeParse({ ...base, v: 2 }).success).toBe(false);
  });
  it('rejects persona > 600', () => {
    const spec = { name: 'X', title: 't', catchphrase: 'c', archetype: 'tank', persona: 'p'.repeat(601),
      strategy: { verify: true, order: 'in_order', risk: 'cautious', taunts: 0 }, tier: 'standard', skin: HOUSE_ROSTER.brick.skin };
    expect(forgeSpecSchema.safeParse(spec).success).toBe(false);
    expect(forgeSpecSchema.safeParse({ ...spec, persona: 'ok' }).success).toBe(true);
  });
});

describe('house roster', () => {
  it.each(Object.values(HOUSE_ROSTER).map((f) => [f.id, f] as const))('%s matches FighterPublic schema', (_id, f) => {
    expect(fighterPublicSchema.safeParse(f).success).toBe(true);
  });
});

describe('parseRunnerPostable', () => {
  it('accepts runner types', () => {
    const r = parseRunnerPostable('fighter.thinking', JSON.stringify({ fighterId: 'vex' }));
    expect(r.ok).toBe(true);
  });
  it('accepts every postable example', () => {
    for (const e of examples.filter((x) => RUNNER_POSTABLE.includes(x.type))) {
      expect(parseRunnerPostable(e.type, JSON.stringify(e.data)).ok).toBe(true);
    }
  });
  it('rejects module-only types, bad json, bad data', () => {
    expect(parseRunnerPostable('match.result', '{"standings":[]}').ok).toBe(false);
    expect(parseRunnerPostable('match.started', '{}').ok).toBe(false);
    expect(parseRunnerPostable('fighter.thinking', 'nope').ok).toBe(false);
    expect(parseRunnerPostable('fighter.tool', JSON.stringify({ fighterId: 'vex', tool: 'run', label: 'x'.repeat(49) })).ok).toBe(false);
  });
});
