import { mkdtemp, mkdir, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CATEGORY_CATALOG, HOUSE_FIGHTERS, HOUSE_ROSTER, type Strategy } from '@fc/contracts';
import { DEFAULT_REPO_ROOT, droidPath, loadHouseDroid, loadHouseDroids, parseDroid } from './persona.js';
import { systemPrompt } from './prompts.js';
import type { FighterRunInput } from '../types.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true }))); });
const strategyOf = async (id: string) => JSON.parse(await readFile(join(DEFAULT_REPO_ROOT, 'agents', 'house', `${id}.strategy.json`), 'utf8')) as Strategy;

describe('house personas (Factory custom droids)', () => {
  it('defines all six fighters as valid, pinned, distinct droids', () => {
    const droids = loadHouseDroids();
    expect(droids.map((d) => d.id)).toEqual([...HOUSE_FIGHTERS]);
    for (const d of droids) {
      expect(d.name).toBe(`fc-${d.id}`);
      expect(d.tools).toEqual(['Create', 'Edit']);
      expect(d.body).toContain(HOUSE_ROSTER[d.id].name);
      expect(d.body).toMatch(/every match/i);              // the static-across-matches contract is stated to the model
      for (const section of [/who you are/i, /voice/i, /quirks/i, /how you fight/i, /taunt bank/i]) expect(d.body).toMatch(section);
      expect(d.body).not.toMatch(/python|sympy|\bclaude\b|\bgpt|openai|anthropic/i);   // no unavailable tools, no vendors
    }
    expect(new Set(droids.map((d) => d.sha256)).size).toBe(6);
  });

  it('pins one fixed line per challenge mode, so behavior is defined for every category', () => {
    for (const d of loadHouseDroids()) {
      const section = d.body.slice(d.body.search(/# by mode/i));
      expect(section, `${d.id} By mode section`).toMatch(/# by mode/i);
      for (const c of CATEGORY_CATALOG) expect(section, `${d.id} ${c.id}`).toMatch(new RegExp(`^- ${c.label}:`, 'im'));
    }
  });

  it('keeps each persona doctrine consistent with its strategy.json', async () => {
    const orderWords: Record<Strategy['order'], RegExp> = {
      in_order: /in order|P1 to P5|P1, P2, P3, P4, P5/i, hard_first: /p5, p4, p3, p2, p1/i,
      easy_first: /easy ones first|easiest first/i, points_per_risk: /points per risk|points divided by/i,
    };
    for (const d of loadHouseDroids()) {
      const s = await strategyOf(d.id);
      expect(d.body, `${d.id} order`).toMatch(orderWords[s.order]);
      expect(d.body, `${d.id} risk`).toMatch(s.risk === 'cautious' ? /never guess/i : /guess|submit immediately|full send|submit the moment|first instinct/i);
      const taunts = { 1: /once|one taunt/i, 2: /two taunts/i, 3: /three taunts|all three taunts/i }[s.taunts as 1 | 2 | 3];
      expect(d.body, `${d.id} taunts`).toMatch(taunts);
    }
  });

  it('refuses a persona edited without a lock update', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fc-persona-')); dirs.push(root);
    await mkdir(join(root, '.factory'), { recursive: true }); await mkdir(join(root, 'agents', 'house'), { recursive: true });
    await cp(join(DEFAULT_REPO_ROOT, '.factory', 'droids'), join(root, '.factory', 'droids'), { recursive: true });
    await cp(join(DEFAULT_REPO_ROOT, 'agents', 'house', 'personas.lock.json'), join(root, 'agents', 'house', 'personas.lock.json'));
    expect(loadHouseDroid('vex', root).id).toBe('vex');
    const p = droidPath(root, 'vex');
    await writeFile(p, (await readFile(p, 'utf8')).replace('Kneel.', 'Please kneel, if convenient.'));
    expect(() => loadHouseDroid('vex', root)).toThrow(/changed without a lock update/);
  });

  it('rejects definitions Factory would not load or that would leak a model id', () => {
    expect(() => parseDroid('no frontmatter')).toThrow();
    expect(() => parseDroid('---\nname: Bad Name\nmodel: inherit\n---\nbody')).toThrow(/lowercase/);
    expect(() => parseDroid('---\nname: ok\nmodel: inherit\n---\n')).toThrow(/empty/);
    expect(() => parseDroid('---\nname: ok\nmodel: some-model\n---\nbody')).toThrow(/inherit/);
  });

  it('leads the house system prompt with the persona as instructions, with arena rules after it', async () => {
    const vex = loadHouseDroid('vex');
    const input = { origin: 'house', persona: vex.body, strategy: await strategyOf('vex'), timeLimitMs: 120_000, problems: [] } as unknown as FighterRunInput;
    const prompt = await systemPrompt(input);
    expect(prompt.startsWith('You are VEX')).toBe(true);
    expect(prompt.indexOf('THE MATCH')).toBeGreaterThan(prompt.indexOf('Taunt bank'));
    expect(prompt).not.toContain('<persona>');
  });
});
