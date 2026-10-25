// Runner fighter interfaces (PRD §8.9). HEAD-owned; O5 implements backends, O4 implements FighterIO.
import type { Category, FighterOrigin, FighterProblem, FighterPublic, ProblemIdx, Strategy, ToolKind } from '@fc/contracts';

export type FighterRunInput = {
  category?: Category; matchId: string; fighter: FighterPublic; origin: FighterOrigin; persona: string; strategy: Strategy;
  modelId: string | null; reasoningEffort: string | null;           // from env (house) or tier map (community); never logged
  problems: FighterProblem[]; timeLimitMs: number; deadlineAt: number; sandboxDir: string;
  endpointUrl: string | null; submitUrl: string | null; token: string | null;   // BYO only
};
export type LiveVerdict = { ok: boolean; points: number; message: string };     // message is what the agent reads (§11.7)
export interface FighterIO {
  submit(problem: ProblemIdx, antiderivative: string): Promise<LiveVerdict>;
  say(text: string): Promise<{ accepted: boolean; reason?: string }>;
  activity(a: { kind: 'thinking' } | { kind: 'tool'; tool: ToolKind; label: string }): void;   // throttled by O4
  referee(d: { allowed: boolean; tool: string; summary: string }): void;                         // deny → card (FC-F-061)
  buyHint?(problem: ProblemIdx): Promise<{ hint: string } | { error: string }>;                  // COULD
  remainingMs(): number; isOut(): boolean;
}
export type FighterRunResult = {
  ok: boolean; turns: number;
  usage: { inputTokens: number; outputTokens: number; factoryCredits: number | null } | null;
  error: { code: 'timeout' | 'crash' | 'red_card' | 'budget' | 'unknown'; message: string } | null;
};
export interface FighterBackend {
  readonly engine: 'droid' | 'direct' | 'mock' | 'http' | 'uagent';
  prewarm?(input: FighterRunInput): Promise<void>;
  run(input: FighterRunInput, io: FighterIO, signal: AbortSignal): Promise<FighterRunResult>;
}
