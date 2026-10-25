import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOUSE_ROSTER } from '@fc/contracts';
import type { FighterIO, FighterRunInput } from './types.js';
import { createDirectBackend } from './direct.js';

afterEach(() => vi.unstubAllEnvs());
const input = (): FighterRunInput => ({ matchId: 'direct-test', fighter: HOUSE_ROSTER.vex, origin: 'house', persona: 'Kneel.', strategy: { verify: false, order: 'in_order', risk: 'bold', taunts: 0 }, modelId: null, reasoningEffort: null, problems: [{ idx: 1, difficulty: 1, points: 10, integrand: '2*x', statementTex: '' }], timeLimitMs: 60_000, deadlineAt: Date.now() + 60_000, sandboxDir: '/unused', endpointUrl: null, submitUrl: null, token: null });
const io = (): FighterIO => ({ submit: vi.fn(async () => ({ ok: true, points: 10, message: 'HIT' })), say: vi.fn(async () => ({ accepted: true })), activity: vi.fn(), referee: vi.fn(), remainingMs: () => 60_000, isOut: () => false });
function config() { vi.stubEnv('FC_DIRECT_BASE_URL', 'https://example.invalid/v1'); vi.stubEnv('FC_DIRECT_API_KEY', 'test-private'); vi.stubEnv('FC_DIRECT_MODEL', 'test-private-model'); }

describe('explicit direct fallback', () => {
  it('round-trips a function tool verdict and accumulates provider usage', async () => {
    config(); const output = io(); const bodies: Record<string, unknown>[] = [];
    const request = vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ choices: [{ message: bodies.length === 1 ? { tool_calls: [{ id: 'call1', type: 'function', function: { name: 'submit_answer', arguments: '{"problem":1,"antiderivative":"x^2"}' } }] } : { content: 'done' } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }));
    }) as unknown as typeof fetch;
    const backend = createDirectBackend({ fetch: request });
    expect(backend.engine).toBe('direct');
    const result = await backend.run(input(), output, new AbortController().signal);
    expect(output.submit).toHaveBeenCalledWith(1, 'x^2');
    expect(bodies[1]!.messages).toEqual(expect.arrayContaining([{ role: 'tool', tool_call_id: 'call1', content: 'HIT' }]));
    expect(result).toMatchObject({ ok: true, usage: { inputTokens: 6, outputTokens: 4, factoryCredits: null } });
  });
  it('returns static errors without exposing request credentials', async () => {
    config(); const request = vi.fn(async () => { throw new Error('test-private-model test-private'); }) as unknown as typeof fetch;
    const result = await createDirectBackend({ fetch: request }).run(input(), io(), new AbortController().signal);
    expect(result.error).toEqual({ code: 'crash', message: 'Direct fallback failed.' });
  });
  it('sends category-specific challenge instructions without private evaluator data', async () => {
    config(); const bodies: Record<string, unknown>[] = [];
    const request = vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'done' } }] }));
    }) as unknown as typeof fetch;
    const i = input(); i.category = 'code';
    i.problems[0] = { ...i.problems[0]!, category: 'code', prompt: 'Trace the code and return JSON.', answerFormat: 'json', reference: 'SECRET-REFERENCE' } as typeof i.problems[number];
    await createDirectBackend({ fetch: request }).run(i, io(), new AbortController().signal);
    const body = bodies[0]!;
    expect(JSON.stringify(body.messages)).toContain('Trace the code and return JSON.');
    expect(JSON.stringify(body.messages)).toContain('pure JavaScript function expression');
    expect(JSON.stringify(body)).not.toContain('SECRET-REFERENCE');
    expect(JSON.stringify(body.tools)).toContain('pure JavaScript function expression');
    expect(JSON.stringify(body.tools)).toContain('10000');
  });
});
