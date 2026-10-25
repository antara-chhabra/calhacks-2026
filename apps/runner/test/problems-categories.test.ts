import { describe, expect, it, vi } from 'vitest';
import { checkFinal, checkLive } from '../src/problems/check.js';
import { generateProblemSet, loadWebSnapshot } from '../src/problems/generator.js';
import { problemSetSchema, type Category } from '@fc/contracts';

const seed = '1234567890abcdef1234567890abcdef';
const categories: Category[] = ['speed-math', 'logic', 'chess', 'trivia', 'squads'];
const snapshot = { fetchedAt: 1_800_000_000_000, items: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, title: `Story ${i + 1}`, url: `https://example.com/${i + 1}`, by: `author${i}`, score: i * 5, time: 1_800_000_000 + i, text: null })) };

describe('exact category problems', () => {
  for (const category of categories) {
    it(`${category} generates five seeded, verifiable prompts`, () => {
      const a = generateProblemSet(seed, category);
      expect(problemSetSchema.parse(a)).toEqual(a);
      expect(a).toEqual(generateProblemSet(seed, category));
      expect(generateProblemSet('fedcba0987654321fedcba0987654321', category)).not.toEqual(a);
      expect(a.problems).toHaveLength(5);
      expect(new Set(a.problems.map((p) => `${p.evaluation?.prompt}:${p.reference}`)).size).toBe(5);
      for (const p of a.problems) {
        expect(p.evaluation!.prompt.length).toBeGreaterThan(0);
        expect(checkLive(p, p.reference).ok).toBe(true);
        expect(checkFinal(p, p.reference)).toEqual({ ok: true, passRate: 1 });
        expect(checkLive(p, 'clearly wrong answer').ok).toBe(false);
        expect(checkFinal(p, 'clearly wrong answer').ok).toBe(false);
      }
    });
  }

  it('routes code mode through generated code tasks and their deterministic verifier', () => {
    const set = generateProblemSet(seed, 'code');
    expect(problemSetSchema.parse(set)).toEqual(set);
    expect(set.problems).toHaveLength(5);
    expect(set).toEqual(generateProblemSet(seed, 'code'));
    expect(generateProblemSet('fedcba0987654321fedcba0987654321', 'code')).not.toEqual(set);
    for (const p of set.problems) {
      expect(p.evaluation?.kind).toBe('code');
      expect(checkLive(p, p.reference).ok, p.family).toBe(true);
      expect(checkFinal(p, p.reference).ok, p.family).toBe(true);
    }
  });

  it('uses the frozen web snapshot and requires it', () => {
    expect(() => generateProblemSet(seed, 'web')).toThrow(/snapshot/);
    const set = generateProblemSet(seed, 'web', snapshot);
    expect(problemSetSchema.parse(set)).toEqual(set);
    expect(set).toEqual(generateProblemSet(seed, 'web', snapshot));
    expect(generateProblemSet('fedcba0987654321fedcba0987654321', 'web', snapshot)).not.toEqual(set);
    expect(set.problems).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      const p = set.problems[i]!;
      expect(p.evaluation!.prompt).toContain(snapshot.items[i]!.url);
      expect(checkLive(p, p.reference).ok).toBe(true);
    }
  });

  it('bounds and rejects malformed/adversarial exact responses', () => {
    const numberProblem = generateProblemSet(seed, 'speed-math').problems[0]!;
    for (const answer of ['NaN', 'Infinity', '1e999', '1+2', '9'.repeat(10_001), '{"__proto__":1}']) {
      expect(checkLive(numberProblem, answer).ok).toBe(false);
      expect(checkFinal(numberProblem, answer).ok).toBe(false);
    }
    const textProblem = generateProblemSet(seed, 'trivia').problems[0]!;
    expect(checkLive(textProblem, `${textProblem.reference}  `).ok).toBe(true);
    const chessProblem = generateProblemSet(seed, 'chess').problems[0]!;
    expect(checkLive(chessProblem, chessProblem.reference.replaceAll(',', ', ')).ok).toBe(true);
    const jsonProblem = { ...numberProblem, evaluation: { kind: 'exact' as const, format: 'json' as const, prompt: 'Return object', answers: ['{"a":1,"b":[2,3]}'] } };
    expect(checkLive(jsonProblem, '{ "b": [2, 3], "a": 1 }').ok).toBe(true);
    expect(checkLive(jsonProblem, '{broken').reason).toBe('invalid_syntax');
    expect(checkLive(jsonProblem, `${'{'.repeat(40)}0${'}'.repeat(40)}`).reason).toBe('invalid_syntax');
    const nullableJsonProblem = { ...jsonProblem, evaluation: { ...jsonProblem.evaluation, answers: ['null'] } };
    expect(checkLive(nullableJsonProblem, '1e999').reason).toBe('invalid_syntax');
  });

  it('does not silently substitute stale web data when the source is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    try { await expect(loadWebSnapshot()).rejects.toThrow('offline'); }
    finally { vi.unstubAllGlobals(); }
  });

  it('bounds HN responses and freezes all source fields in each prompt', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/topstories.json')) return new Response(JSON.stringify([1,2,3,4,5]));
      const id = Number(url.match(/item\/(\d+)\.json/)?.[1]);
      const item = { id, type: 'story', title: `Title ${id}`, url: id === 1 ? undefined : `http://example.com/${id}`, by: `user${id}`, score: id * 3, time: 1_800_000_000 + id, text: `<p>source ${id}</p>` };
      return new Response(JSON.stringify(item));
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const fetched = await loadWebSnapshot();
      expect(fetched.items).toHaveLength(5);
      expect(fetched.items[0]!.url).toBe('https://news.ycombinator.com/item?id=1');
      const web = generateProblemSet(seed, 'web', fetched);
      for (let i = 0; i < 5; i++) {
        const prompt = web.problems[i]!.evaluation!.prompt;
        const record = JSON.parse(prompt.match(/<untrusted-source-json>\n(.*?)\n<\/untrusted-source-json>/s)![1]!);
        expect(record).toMatchObject({ id: fetched.items[i]!.id, capturedAt: fetched.fetchedAt, publishedAt: fetched.items[i]!.time, title: fetched.items[i]!.title, url: fetched.items[i]!.url, author: fetched.items[i]!.by, score: fetched.items[i]!.score, text: fetched.items[i]!.text });
      }
    } finally { vi.unstubAllGlobals(); }

    vi.stubGlobal('fetch', vi.fn(async () => new Response('x'.repeat(20_000))));
    try { await expect(loadWebSnapshot()).rejects.toThrow(/size limit/); }
    finally { vi.unstubAllGlobals(); }
  });
});
