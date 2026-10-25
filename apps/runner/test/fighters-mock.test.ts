import { describe, expect, it } from 'vitest';
import type { FighterProblem, FighterPublic, ProblemIdx } from '@fc/contracts';
import { HOUSE_ROSTER } from '@fc/contracts';
import { createMockBackend } from '../src/fighters/mock.js';
import { MOCK_PROFILES } from '../src/fighters/mock-profiles.js';
import type { FighterIO, FighterRunInput } from '../src/fighters/types.js';

const PTS = [10, 20, 30, 40, 50] as const;
const problems: FighterProblem[] = [1, 2, 3, 4, 5].map((i) => ({
  idx: i as ProblemIdx, difficulty: i as FighterProblem['difficulty'], points: PTS[i - 1]!,
  statementTex: `\\int x^${i}\\,dx`, integrand: `x^${i}`,
}));
const refs: Record<number, string> = { 1: 'x^2/2', 2: 'x^3/3', 3: 'x^4/4', 4: 'x^5/5', 5: 'log(abs(x))' };

const SCALE = 5000, LIMIT = 600_000;

function harness(id: string, matchId = 'm1', limitMs = LIMIT) {
  const log: string[] = [];
  const caps = { say: 0, label: 0 };
  const start = Date.now();
  let out = false;
  const io: FighterIO = {
    async submit(p, a) { log.push(`submit:${p}:${a}`); return { ok: a === refs[p], points: 0, message: '' }; },
    async say(t) { log.push(`say:${t}`); caps.say = Math.max(caps.say, t.length); return { accepted: true }; },
    activity(a) { log.push(a.kind === 'tool' ? `tool:${a.label}` : 'thinking'); if (a.kind === 'tool') caps.label = Math.max(caps.label, a.label.length); },
    referee(d) { log.push(`ref:${d.allowed}`); },
    remainingMs: () => limitMs - (Date.now() - start) * SCALE,
    isOut: () => out,
  };
  const input: FighterRunInput = {
    matchId, fighter: (HOUSE_ROSTER as Record<string, FighterPublic>)[id]!, origin: 'house', persona: '',
    strategy: { verify: true, order: 'in_order', risk: 'cautious', taunts: 2 }, modelId: null, reasoningEffort: null,
    problems, timeLimitMs: limitMs, deadlineAt: 0, sandboxDir: '', endpointUrl: null, submitUrl: null, token: null,
  };
  return { io, input, log, caps, setOut: () => { out = true; } };
}
const backend = () => createMockBackend({ timeScale: SCALE, answerFor: (p) => refs[p.idx] ?? null });

describe('mock backend', () => {
  for (const id of Object.keys(MOCK_PROFILES)) {
    it(`${id} completes within deadline, caps respected`, async () => {
      const h = harness(id);
      const r = await backend().run(h.input, h.io, new AbortController().signal);
      expect(r).toMatchObject({ ok: true, usage: null, error: null });
      expect(h.log.some((l) => l.startsWith('submit:'))).toBe(true);
      expect(h.caps.say).toBeLessThanOrEqual(80);
      expect(h.caps.label).toBeLessThanOrEqual(48);
    }, 20_000);
  }

  it('is deterministic for the same matchId (submits and order)', async () => {
    const a = harness('glitch', 'same'), b = harness('glitch', 'same');
    await backend().run(a.input, a.io, new AbortController().signal);
    await backend().run(b.input, b.io, new AbortController().signal);
    const subs = (l: string[]) => l.filter((x) => x.startsWith('submit:') || x.startsWith('say:'));
    expect(subs(a.log)).toEqual(subs(b.log));
  }, 20_000);

  it('stops on abort', async () => {
    const h = harness('sage');
    const ac = new AbortController();
    const p = createMockBackend({ timeScale: 1 }).run(h.input, h.io, ac.signal);
    setTimeout(() => ac.abort(), 20);
    const r = await p;
    expect(r.ok).toBe(true);
    expect(h.log.filter((l) => l.startsWith('submit:')).length).toBe(0);
  });

  it('stops when time is up', async () => {
    const h = harness('sage', 'm2', 15_000);   // sage latency ~20s > 15s
    const r = await backend().run(h.input, h.io, new AbortController().signal);
    expect(r.ok).toBe(true);
    expect(h.log.filter((l) => l.startsWith('submit:')).length).toBe(0);
  });

  it('orders by strategy (hard_first)', async () => {
    const h = harness('glitch', 'ord');
    h.input.strategy = { ...h.input.strategy, order: 'hard_first' };
    await backend().run(h.input, h.io, new AbortController().signal);
    const first = h.log.find((l) => l.startsWith('submit:'))!;
    expect(first.startsWith('submit:5:')).toBe(true);
  }, 20_000);

  it('submits garbage-but-valid answers without answerFor', async () => {
    const h = harness('vex');
    await createMockBackend({ timeScale: SCALE }).run(h.input, h.io, new AbortController().signal);
    expect(h.log.some((l) => l.startsWith('submit:'))).toBe(true);
  }, 20_000);
});
