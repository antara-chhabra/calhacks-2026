// FC-N-025: exercise the actual public HTTP route, including authentication and retry metadata.
import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { FighterIO } from '../fighters/types.js';
import { _resetByoSessions, createByoRouter, registerByoSession } from '../http/byo.js';

let server: Server | undefined;
afterEach(() => { server?.close(); vi.restoreAllMocks(); _resetByoSessions(); });

it('allows 20 authenticated submits per fighter per rolling minute; bad tokens cannot drain quota', async () => {
  _resetByoSessions();
  let now = 100_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  const submit = vi.fn(async () => ({ ok: true, points: 10, message: 'hit' }));
  const io: FighterIO = { submit, say: async () => ({ accepted: true }), activity() {}, referee() {}, remainingMs: () => 1000, isOut: () => false };
  registerByoSession('m_limit', 'f_one', 'token_one', io);
  registerByoSession('m_limit', 'f_two', 'token_two', io);
  const app = express(); app.use(express.json()); app.use(createByoRouter());
  server = await new Promise<Server>((done, fail) => {
    const s = app.listen(0, '127.0.0.1', () => done(s)); s.on('error', fail);
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/byo/m_limit/submit`;
  const post = (token = 'token_one', fighterId = 'f_one') => fetch(url, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, fighterId, problem: 1, antiderivative: 'x' }) });
  const wrong = await Promise.all(Array.from({ length: 20 }, () => post('wrong_token')));
  expect(wrong.every((r) => r.status === 401)).toBe(true);
  expect(submit).not.toHaveBeenCalled();
  const accepted = await Promise.all(Array.from({ length: 20 }, () => post()));
  expect(accepted.every((r) => r.status === 200)).toBe(true);
  const blocked = await post();
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get('Retry-After')).toBe('60');
  expect(await blocked.json()).toMatchObject({ error: { code: 'rate_limited' } });
  expect(submit).toHaveBeenCalledTimes(20);
  expect((await post('token_two', 'f_two')).status).toBe(200);
  now += 59_999;
  expect((await post()).status).toBe(429);
  now++;
  expect((await post()).status).toBe(200);
  expect(submit).toHaveBeenCalledTimes(22);
});
