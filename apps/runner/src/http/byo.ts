// BYO HTTP protocol fightcard/1 (PRD §8.10, FC-F-204, R-03). Tokens are never logged.
import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { FighterIO } from '../fighters/types.js';

type Session = { token: string; io: FighterIO; ended: boolean };
const sessions = new Map<string, Map<string, Session>>();   // matchId -> fighterId -> session
const endedMatches = new Set<string>();

export function registerByoSession(matchId: string, fighterId: string, token: string, io: FighterIO): void {
  endedMatches.delete(matchId);
  let m = sessions.get(matchId); if (!m) sessions.set(matchId, m = new Map());
  m.set(fighterId, { token, io, ended: false });
}
/** Without fighterId: ends the whole match (subsequent calls get 410). */
export function unregisterByoSession(matchId: string, fighterId?: string): void {
  const m = sessions.get(matchId);
  if (!m) return;
  if (fighterId) { const s = m.get(fighterId); if (s) s.ended = true; }
  else { for (const s of m.values()) s.ended = true; }
  endedMatches.add(matchId);
  if (endedMatches.size > 200) endedMatches.delete(endedMatches.values().next().value as string);
}
export function _resetByoSessions(): void { sessions.clear(); endedMatches.clear(); }

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  // pad to equal length so length differences don't short-circuit
  const n = Math.max(x.length, y.length, 1);
  const px = Buffer.alloc(n), py = Buffer.alloc(n); x.copy(px); y.copy(py);
  return timingSafeEqual(px, py) && x.length === y.length;
}
const err = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const submitBody = z.object({
  token: z.string().min(1), fighterId: z.string().min(1),
  problem: z.number().int().min(1).max(5), antiderivative: z.string().min(1).max(2000),
});
const sayBody = z.object({ token: z.string().min(1), fighterId: z.string().min(1), text: z.string().min(1).max(500) });

export function createByoRouter(): Router {
  const r = Router();

  function auth(req: Request, res: Response, schema: z.ZodType<{ token: string; fighterId: string }>) {
    const p = schema.safeParse(req.body ?? {});
    if (!p.success) { err(res, 400, 'bad_request', 'Invalid body'); return null; }
    const matchId = String(req.params.matchId);
    const s = sessions.get(matchId)?.get(p.data.fighterId);
    if (!s) {
      if (endedMatches.has(matchId)) err(res, 410, 'match_ended', 'Match has ended');
      else err(res, 404, 'not_found', 'Unknown match or fighter');
      return null;
    }
    if (!safeEqual(p.data.token, s.token)) { err(res, 401, 'unauthorized', 'Bad token'); return null; }
    if (s.ended) { err(res, 410, 'match_ended', 'Match has ended'); return null; }
    return { s, data: p.data };
  }

  r.post('/byo/:matchId/submit', async (req, res) => {
    const a = auth(req, res, submitBody); if (!a) return;
    const d = a.data as z.infer<typeof submitBody>;
    try {
      const v = await a.s.io.submit(d.problem as 1 | 2 | 3 | 4 | 5, d.antiderivative);
      res.json({ ok: v.ok, points: v.points, message: v.message });
    } catch { err(res, 500, 'internal', 'Submit failed'); }
  });
  r.post('/byo/:matchId/say', async (req, res) => {
    const a = auth(req, res, sayBody); if (!a) return;
    const d = a.data as z.infer<typeof sayBody>;
    try { res.json({ accepted: (await a.s.io.say(d.text)).accepted }); }
    catch { err(res, 500, 'internal', 'Say failed'); }
  });
  return r;
}
