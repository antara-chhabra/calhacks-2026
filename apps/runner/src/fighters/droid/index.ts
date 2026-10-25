import { fileURLToPath } from 'node:url';
import { isAbsolute, resolve } from 'node:path';
import {
  AutonomyLevel, DroidMessageType, ReasoningEffort, createSession, createSdkMcpServer, tool,
  type CreateSessionOptions, type DroidSession, type TokenUsage,
} from '@factory/droid-sdk/node';
import { z } from 'zod';
import type { ProblemIdx } from '@fc/contracts';
import type { FighterBackend, FighterIO, FighterRunInput, FighterRunResult } from '../types.js';
import { createReferee } from './referee.js';
import { prepareSandbox } from './sandbox.js';
import { problemPrompt, systemPrompt } from './prompts.js';
import { speechAllowed } from '../speech.js';

type Ready = { session: DroidSession; io?: FighterIO; solved: Set<ProblemIdx>; completed: boolean; timer?: ReturnType<typeof setTimeout>; stopTimer?: ReturnType<typeof setTimeout> };
type Options = { createSession?: (options: CreateSessionOptions) => Promise<DroidSession>; prewarmTtlMs?: number };
const wrapper = fileURLToPath(new URL('../../../bin/droid-sandboxed', import.meta.url));
// Autonomy Off does not mediate read-only tools. Problems arrive in the prompt;
// disable native reads/discovery rather than trusting a permission callback they bypass.
export const H0_DISABLED_TOOLS = [
  'Read', 'Glob', 'Grep', 'LS', 'Execute', 'WebSearch', 'FetchUrl', 'Task', 'TaskOutput', 'TaskStop', 'Skill',
  'ExecuteScript', 'GenerateImage', 'GenerateDroid', 'ConnectApp', 'ToolSearch', 'Loop',
  'CreateAutomation', 'DeleteAutomation', 'EditAutomation', 'ListAutomations', 'ListAutomationTemplates',
  'ReadAutomation', 'RunAutomation', 'StageSettingsChanges', 'StartMissionRun', 'ProposeMission',
  'EndFeatureRun', 'DismissHandoffItems', 'ExitSpecMode', 'TodoWrite',
];

export function minimalEnvironment(): Record<string, string> {
  return { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '', LANG: 'en_US.UTF-8', TERM: 'dumb', FACTORY_API_KEY: process.env.FACTORY_API_KEY ?? '' };
}

function execPath(): string {
  const configured = process.env.FC_DROID_EXEC;
  // The documented default is relative to apps/runner; cwd becomes the sandbox.
  return !configured || configured === './bin/droid-sandboxed' ? wrapper : isAbsolute(configured) ? configured : resolve(configured);
}

function addUsage(total: FighterRunResult['usage'], usage: TokenUsage | null): FighterRunResult['usage'] {
  if (!usage) return total;
  return {
    inputTokens: (total?.inputTokens ?? 0) + usage.inputTokens,
    outputTokens: (total?.outputTokens ?? 0) + usage.outputTokens,
    factoryCredits: total?.factoryCredits == null && usage.factoryCredits == null ? null : (total?.factoryCredits ?? 0) + (usage.factoryCredits ?? 0),
  };
}

/** Per-match sessions are prewarmed without seeing problems, then bound to live IO at the bell. */
export function createDroidBackend(options: Options = {}): FighterBackend {
  const sessions = new Map<string, Promise<Ready>>();
  const key = (input: FighterRunInput) => JSON.stringify([input.matchId, input.fighter.id]);
  const spawn = options.createSession ?? createSession;

  async function create(input: FighterRunInput): Promise<Ready> {
    if (!input.modelId || input.modelId === 'auto') throw new Error('Fighter model is not configured.');
    await prepareSandbox(input, false);
    let ready: Ready | undefined;
    const server = createSdkMcpServer({ name: 'arena', tools: [
      tool('submit_answer', 'Submit an antiderivative for problem 1–5. Live-checked instantly; wrong answers cost 5 points; max 3 per problem.',
        { problem: z.number().int().min(1).max(5), antiderivative: z.string().min(1).max(400) }, async ({ problem, antiderivative }) => {
          if (!ready?.io || ready.io.isOut() || ready.io.remainingMs() <= 0) return 'Time is up. Submission not scored.';
          const verdict = await ready.io.submit(problem as ProblemIdx, antiderivative);
          if (verdict.ok) ready.solved.add(problem as ProblemIdx);
          if (input.problems.every((p) => ready!.solved.has(p.idx)) && !ready.completed) {
            ready.completed = true;
            // Let the final verdict reach the tool caller before ending its turn.
            ready.stopTimer = setTimeout(() => { void ready?.session.interrupt().catch(() => undefined); }, 25);
          }
          return verdict.message;
        }),
      tool('taunt', 'Say one short in-character line to the crowd (≤ 80 chars).', { text: z.string().min(1).max(80) }, async ({ text }) => {
        if (!ready?.io || ready.io.isOut() || ready.io.remainingMs() <= 0) return 'Not allowed: match is not live';
        if (!speechAllowed(text)) return 'Not allowed: stay in character and keep it family friendly';
        const verdict = await ready.io.say(text);
        return verdict.accepted ? 'Crowd heard you.' : `Not allowed: ${verdict.reason ?? 'referee declined'}`;
      }),
    ] });
    const effort = Object.values(ReasoningEffort).find((e) => e === input.reasoningEffort);
    const session = await spawn({
      modelId: input.modelId, ...(effort ? { reasoningEffort: effort } : {}),
      cwd: input.sandboxDir, autonomyLevel: AutonomyLevel.Off,
      systemPrompt: { type: 'preset', preset: 'droid', append: await systemPrompt(input) },
      permissionHandler: createReferee(input, () => ready?.io, async () => { await ready?.session.interrupt(); }),
      askUserHandler: () => ({ cancelled: true, answers: [] }),
      disabledToolIds: [...H0_DISABLED_TOOLS],
      disableBuiltinSkills: true, mcpServers: [server], execPath: execPath(), env: minimalEnvironment(),
    });
    ready = { session, solved: new Set(), completed: false };
    // Match creation/void can fail before run(). Do not retain a prewarm forever.
    ready.timer = setTimeout(() => { sessions.delete(key(input)); void session.close().catch(() => undefined); }, options.prewarmTtlMs ?? 120_000);
    ready.timer.unref();
    return ready;
  }

  function get(input: FighterRunInput): Promise<Ready> {
    const id = key(input);
    let pending = sessions.get(id);
    if (!pending) {
      pending = create(input).catch(() => { sessions.delete(id); throw new Error('Fighter session could not start.'); });
      sessions.set(id, pending);
    }
    return pending;
  }

  return {
    engine: 'droid',
    async prewarm(input) { await get(input); },
    async run(input, io, signal) {
      let ready: Ready | undefined;
      let turns = 0;
      let usage: FighterRunResult['usage'] = null;
      const ctrl = new AbortController();
      let expired = false;
      const abort = () => { ctrl.abort(); void ready?.session.interrupt().catch(() => undefined); };
      const remaining = () => Math.max(0, Math.min(io.remainingMs(), input.deadlineAt - Date.now()));
      const timeout = setTimeout(() => { expired = true; abort(); }, remaining());
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      try {
        if (ctrl.signal.aborted) return { ok: false, turns, usage, error: { code: 'timeout', message: 'Time is up.' } };
        ready = await get(input);
        clearTimeout(ready.timer);
        ready.io = io;
        await prepareSandbox(input, true);
        if (ctrl.signal.aborted) throw new Error('aborted');
        let prompt = problemPrompt(input);
        for (let turn = 0; turn < 2; turn++) {
          turns++;
          let success = false;
          let turnUsage: TokenUsage | null = null;
          try { for await (const message of ready.session.stream(prompt, { includePartialMessages: true, abortSignal: ctrl.signal })) {
            if (message.type === DroidMessageType.ToolCall) {
              const name = message.name;
              const tool = /read|glob|grep/i.test(name) ? 'read' : /edit|create|patch/i.test(name) ? 'write' : /execute/i.test(name) ? 'run' : 'other';
              // Fixed labels prevent model IDs, private paths and tool arguments reaching events.
              io.activity({ kind: 'tool', tool, label: tool === 'read' ? 'reading arena notes' : tool === 'write' ? 'writing scratch notes' : tool === 'run' ? 'checking with python' : 'using arena tool' });
            } else if (message.type === DroidMessageType.ThinkingTextDelta || message.type === DroidMessageType.AssistantTextDelta || message.type === DroidMessageType.Assistant) {
              io.activity({ kind: 'thinking' });
            } else if (message.type === DroidMessageType.TokenUsageUpdate) {
              turnUsage = message;
            } else if (message.type === DroidMessageType.Result) {
              turnUsage = message.tokenUsage ?? turnUsage;
              success = message.success;
            }
          } } finally { usage = addUsage(usage, turnUsage); }
          if (io.isOut() || ctrl.signal.aborted) break;
          if (ready.completed) break;
          if (!success) return { ok: false, turns, usage, error: { code: 'crash', message: 'Fighter turn failed.' } };
          const unsolved = input.problems.filter((p) => !ready!.solved.has(p.idx));
          if (turn > 0 || remaining() < 20_000 || !unsolved.length) break;
          prompt = `${Math.floor(remaining() / 1000)}s left. Unsolved: ${unsolved.map((p) => `P${p.idx}`).join(', ')}. Keep going.`;
        }
        if (io.isOut() || ctrl.signal.aborted) return { ok: false, turns, usage, error: { code: io.isOut() && !expired && remaining() > 0 ? 'red_card' : 'timeout', message: io.isOut() && !expired && remaining() > 0 ? 'Referee stopped the fighter.' : 'Time is up.' } };
        return { ok: true, turns, usage, error: null };
      } catch {
        // SDK errors and traces can contain configured model IDs or request secrets.
        if (ready?.completed && !io.isOut()) return { ok: true, turns, usage, error: null };
        return { ok: false, turns, usage, error: { code: io.isOut() && !expired && remaining() > 0 ? 'red_card' : ctrl.signal.aborted ? 'timeout' : 'crash', message: ctrl.signal.aborted ? 'Fighter interrupted.' : 'Fighter session failed.' } };
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        sessions.delete(key(input));
        if (ready) { clearTimeout(ready.timer); clearTimeout(ready.stopTimer); await ready.session.close().catch(() => undefined); }
      }
    },
  };
}
