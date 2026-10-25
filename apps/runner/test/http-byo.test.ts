import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createByoRouter, registerByoSession, unregisterByoSession, _resetByoSessions } from '../src/http/byo.js';
import type { FighterIO } from '../src/fighters/types.js';

let server: Server | undefined;
beforeEach(() => _resetByoSessions());
afterEach(() => { server?.close(); server = undefined; });

const fakeIO = (): FighterIO & { said: string[] } => {
  const said: string[] = [];
  return {
    said,
    submit: async (p, a) => ({ ok: a === 'x^2/2', points: 10 * p, message: `p${p}` }),
    say: async (t) => { said.push(t); return { accepted: true }; },
    activity() {}, referee() {}, remainingMs: () => 1000, isOut: () => false,
  };
};
async function boot() {
  const app = express(); app.use(express.json()); app.use(createByoRouter());
  server = await new Promise<Server>((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

describe('byo routes', () => {
  it('submit and say happy path', async () => {
    const io = fakeIO(); registerByoSession('m1', 'f_a', 'tok-123', io);
    const post = await boot();
    const s = await post('/byo/m1/submit', { token: 'tok-123', fighterId: 'f_a', problem: 2, antiderivative: 'x^2/2' });
    expect(s.status).toBe(200);
    expect(await s.json()).toEqual({ ok: true, points: 20, message: 'p2' });
    const y = await post('/byo/m1/say', { token: 'tok-123', fighterId: 'f_a', text: 'hi' });
    expect(await y.json()).toEqual({ accepted: true });
    expect(io.said).toEqual(['hi']);
  });
  it('bad token 401, unknown 404, bad body 400', async () => {
    registerByoSession('m1', 'f_a', 'tok-123', fakeIO());
    const post = await boot();
    expect((await post('/byo/m1/submit', { token: 'nope', fighterId: 'f_a', problem: 1, antiderivative: 'x' })).status).toBe(401);
    expect((await post('/byo/zz/submit', { token: 'tok-123', fighterId: 'f_a', problem: 1, antiderivative: 'x' })).status).toBe(404);
    expect((await post('/byo/m1/say', { token: 'tok-123', fighterId: 'f_zz', text: 'x' })).status).toBe(404);
    expect((await post('/byo/m1/say', { token: 'tok-123' })).status).toBe(400);
  });
  it('410 after the match ended', async () => {
    registerByoSession('m1', 'f_a', 'tok-123', fakeIO());
    const post = await boot();
    unregisterByoSession('m1');
    const r = await post('/byo/m1/say', { token: 'tok-123', fighterId: 'f_a', text: 'x' });
    expect(r.status).toBe(410);
    expect((await r.json()).error.code).toBe('match_ended');
  });
});
