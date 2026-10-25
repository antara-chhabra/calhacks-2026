// Orphan recovery on runner boot (R-02b, FC-F-006): a match left open/locked/live/review by a dead runner process is voided.
// Stdb has no list method; the caller supplies one (e.g. reading the match table from a subscription).
import type { Stdb } from '../stdb.js';

export type ActiveMatch = { id: string; status: string };
export type ListActiveMatches = () => Promise<ActiveMatch[]> | ActiveMatch[];
const ACTIVE = new Set(['open', 'locked', 'live', 'review']);

export async function recoverOrphans(stdb: Stdb, listActiveMatches: ListActiveMatches | undefined, log: (m: string) => void = (m) => console.warn(`[match] ${m}`),
  skip: ReadonlySet<string> = new Set()): Promise<string[]> {
  if (!listActiveMatches) { log('orphan recovery skipped: no listActiveMatches available'); return []; }
  const voided: string[] = [];
  for (const m of await listActiveMatches()) {
    if (!ACTIVE.has(m.status) || skip.has(m.id)) continue;
    try { await stdb.voidMatch({ matchId: m.id, reason: 'runner_restart' }); voided.push(m.id); }
    catch (e) { log(`${m.id}: void on recovery failed: ${(e as Error).message}`); }
  }
  return voided;
}
