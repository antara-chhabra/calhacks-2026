// Scripted FighterBackend for tests. Steps run in order; each honours the abort signal and isOut().
import type { FighterBackend, FighterIO, FighterRunInput, FighterRunResult } from '../../src/fighters/types.js';

export type Step =
  | { kind: 'wait'; ms: number }
  | { kind: 'think' }
  | { kind: 'tool'; tool?: 'read' | 'write' | 'run' | 'other'; label: string }
  | { kind: 'say'; text: string }
  | { kind: 'submit'; problem: 1 | 2 | 3 | 4 | 5; answer: string | ((input: FighterRunInput) => string) }
  | { kind: 'deny'; tool?: string; summary?: string }
  | { kind: 'hang' }                       // run until aborted
  | { kind: 'throw' };

export type FakeFighter = FighterBackend & { verdicts: { problem: number; ok: boolean; message: string }[]; says: { accepted: boolean; reason?: string }[]; prewarmed: boolean };

export function fakeFighter(steps: Step[], result?: Partial<FighterRunResult>): FakeFighter {
  const f: FakeFighter = {
    engine: 'mock', verdicts: [], says: [], prewarmed: false,
    async prewarm() { f.prewarmed = true; },
    async run(input, io: FighterIO, signal) {
      const waitFor = (ms: number) => new Promise<void>((res) => {
        const t = setTimeout(res, ms);
        signal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true });
      });
      for (const s of steps) {
        if (signal.aborted || io.isOut()) break;
        switch (s.kind) {
          case 'wait': await waitFor(s.ms); break;
          case 'think': io.activity({ kind: 'thinking' }); break;
          case 'tool': io.activity({ kind: 'tool', tool: s.tool ?? 'run', label: s.label }); break;
          case 'say': f.says.push(await io.say(s.text)); break;
          case 'submit': {
            const ans = typeof s.answer === 'function' ? s.answer(input) : s.answer;
            const v = await io.submit(s.problem, ans);
            f.verdicts.push({ problem: s.problem, ok: v.ok, message: v.message });
            break;
          }
          case 'deny': io.referee({ allowed: false, tool: s.tool ?? 'curl', summary: s.summary ?? 'network access blocked' }); break;
          case 'hang': await waitFor(60_000); break;
          case 'throw': throw new Error('boom');
        }
      }
      return { ok: true, turns: steps.length, usage: null, error: null, ...result };
    },
  };
  return f;
}
