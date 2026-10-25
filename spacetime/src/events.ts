// The only writer of fight_event rows (PRD §8.4, §8.5.1). seq is gapless per match and t is ms since match.createdAt,
// both assigned here from ctx.timestamp, so every reducer that emits an event goes through appendEvent.
import { SenderError } from 'spacetimedb/server';
import type { Ctx } from './auth.js';

export function appendEvent(ctx: Ctx, matchId: string, type: string, data: unknown): number {
  const m = ctx.db.match.id.find(matchId);
  if (!m) throw new SenderError('no_match');
  const seq = m.lastSeq + 1;
  const t = Number((ctx.timestamp.microsSinceUnixEpoch - m.createdAt.microsSinceUnixEpoch) / 1000n);
  ctx.db.fightEvent.insert({ id: 0n, matchId, seq, t: Math.max(0, t), type, data: JSON.stringify(data ?? {}) });
  ctx.db.match.id.update({ ...m, lastSeq: seq });
  return seq;
}
