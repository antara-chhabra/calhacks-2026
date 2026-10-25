import { z } from 'zod';
import type { ProblemIdx } from '@fc/contracts';
import type { FighterBackend, FighterRunResult } from './types.js';
import { answerLimit, problemPrompt, systemPrompt } from './droid/prompts.js';
import { speechAllowed } from './speech.js';

const taunt = z.object({ text: z.string().min(1).max(80) });
const tools = (input: Parameters<FighterBackend['run']>[0]) => {
  const maxAnswerLength = answerLimit(input);
  const code = maxAnswerLength > 400;
  return [
  { type: 'function', function: { name: 'submit_answer', description: code ? 'Submit a pure JavaScript function expression as the answer. Wrong answers cost 5 points; max 3 attempts per problem.' : 'Submit your answer for one problem in the requested challenge format. Wrong answers cost 5 points; max 3 attempts per problem.', parameters: { type: 'object', properties: { problem: { type: 'integer', minimum: 1, maximum: 5 }, antiderivative: { type: 'string', maxLength: maxAnswerLength } }, required: ['problem', 'antiderivative'], additionalProperties: false } } },
  { type: 'function', function: { name: 'taunt', description: 'Say one in-character line, maximum 80 characters.', parameters: { type: 'object', properties: { text: { type: 'string', maxLength: 80 } }, required: ['text'], additionalProperties: false } } },
  ];
};
type Message = { role: string; content?: string | null; tool_calls?: Call[]; tool_call_id?: string };
type Call = { id: string; type: 'function'; function: { name: string; arguments: string } };
type Completion = { choices?: { message?: Message }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
type Options = { fetch?: typeof fetch };

/** Explicit fallback: the backend reports engine=direct and never silently replaces Droid. */
export function createDirectBackend(options: Options = {}): FighterBackend {
  return { engine: 'direct', async run(input, io, signal) {
    const base = process.env.FC_DIRECT_BASE_URL, apiKey = process.env.FC_DIRECT_API_KEY, model = process.env.FC_DIRECT_MODEL;
    if (!base || !apiKey || !model || model === 'auto') return { ok: false, turns: 0, usage: null, error: { code: 'crash', message: 'Direct fallback is not configured.' } };
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    const timeout = setTimeout(abort, Math.max(0, Math.min(input.deadlineAt - Date.now(), io.remainingMs())));
    signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
    let usage: FighterRunResult['usage'] = null, inputTokens = 0, outputTokens = 0, turns = 1, followup = false;
    const solved = new Set<ProblemIdx>();
    try {
      const submit = z.object({ problem: z.number().int().min(1).max(5), antiderivative: z.string().min(1).max(answerLimit(input)) });
      const messages: Message[] = [{ role: 'system', content: await systemPrompt({ ...input, strategy: { ...input.strategy, verify: false } }) }, { role: 'user', content: problemPrompt(input) }];
      for (let request = 0; request < 20 && !ctrl.signal.aborted && !io.isOut(); request++) {
        io.activity({ kind: 'thinking' });
        const res = await (options.fetch ?? fetch)(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', signal: ctrl.signal,
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages, tools: tools(input), tool_choice: 'auto' }) });
        if (!res.ok) throw new Error('completion failed');
        const body = await res.json() as Completion;
        if (body.usage) { inputTokens += body.usage.prompt_tokens ?? 0; outputTokens += body.usage.completion_tokens ?? 0; usage = { inputTokens, outputTokens, factoryCredits: null }; }
        const message = body.choices?.[0]?.message;
        if (!message) throw new Error('empty completion');
        messages.push({ role: 'assistant', content: message.content ?? null, ...(message.tool_calls ? { tool_calls: message.tool_calls } : {}) });
        if (!message.tool_calls?.length) {
          const unsolved = input.problems.filter((p) => !solved.has(p.idx));
          if (followup || io.remainingMs() < 20_000 || !unsolved.length) break;
          followup = true; turns = 2;
          messages.push({ role: 'user', content: `${Math.floor(io.remainingMs() / 1000)}s left. Unsolved: ${unsolved.map((p) => `P${p.idx}`).join(', ')}. Keep going.` });
          continue;
        }
        for (const call of message.tool_calls) {
          if (ctrl.signal.aborted || io.isOut() || io.remainingMs() <= 0) break;
          let content = 'Not allowed: unknown or invalid tool request.';
          try {
            const args: unknown = JSON.parse(call.function.arguments);
            if (call.function.name === 'submit_answer') {
              const p = submit.parse(args);
              const result = await io.submit(p.problem as ProblemIdx, p.antiderivative);
              if (result.ok) solved.add(p.problem as ProblemIdx);
              content = result.message;
            } else if (call.function.name === 'taunt') {
              const { text } = taunt.parse(args);
              const result = speechAllowed(text) ? await io.say(text) : { accepted: false };
              content = result.accepted ? 'Crowd heard you.' : 'Not allowed: stay in character.';
            }
          } catch { /* schema failures return a safe tool error, never raw arguments */ }
          io.activity({ kind: 'tool', tool: 'other', label: 'using arena tool' });
          messages.push({ role: 'tool', tool_call_id: call.id, content });
        }
      }
      return ctrl.signal.aborted || io.isOut() ? { ok: false, turns, usage, error: { code: io.isOut() ? 'red_card' : 'timeout', message: 'Fallback fighter interrupted.' } } : { ok: true, turns, usage, error: null };
    } catch { return { ok: false, turns, usage, error: { code: ctrl.signal.aborted ? 'timeout' : 'crash', message: 'Direct fallback failed.' } }; }
    finally { clearTimeout(timeout); signal.removeEventListener('abort', abort); }
  } };
}
