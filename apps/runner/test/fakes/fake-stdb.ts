// In-memory Stdb that mimics the SpacetimeDB module's match reducers (PRD §8.4, §8.5.1):
// assigns gapless seq / t, emits module events, enforces the status gates and the runner allowlist.
import { RUNNER_POSTABLE, type FightEnvelope, type FightEvent } from '@fc/contracts';
import type { FightEventRow, Stdb } from '../../src/stdb.js';

type Status = 'open' | 'locked' | 'live' | 'review' | 'settled' | 'void';
type M = { status: Status; createdAt: number; seq: number; events: FightEnvelope[]; markets: { id: string; outcomes: string[]; seeds: number[] }[];
  fighters: string[]; timer: ReturnType<typeof setTimeout> | null; args: Parameters<Stdb['createMatch']>[0] };

export class FakeStdb implements Stdb {
  readonly matches = new Map<string, M>();
  readonly calls: { name: string; matchId?: string }[] = [];
  readonly settles: Parameters<Stdb['settleMatch']>[0][] = [];
  readonly finalizes: Parameters<Stdb['finalizeMatch']>[0][] = [];
  readonly postBatches: { matchId: string; types: string[] }[] = [];
  private listeners = new Map<string, Set<(e: FightEventRow) => void>>();

  status(): 'ok' | 'down' { return 'ok'; }
  identity(): string | null { return 'fake'; }
  close(): void { for (const m of this.matches.values()) if (m.timer) clearTimeout(m.timer); }
  onEvent(matchId: string, f: (e: FightEventRow) => void): () => void {
    let s = this.listeners.get(matchId);
    if (!s) this.listeners.set(matchId, (s = new Set()));
    s.add(f);
    return () => { s!.delete(f); };
  }

  /** Optional capability used by recoverOrphans. */
  async listActiveMatches(): Promise<{ id: string; status: string }[]> {
    return [...this.matches].filter(([, m]) => m.status !== 'settled' && m.status !== 'void').map(([id, m]) => ({ id, status: m.status }));
  }

  /** Test helpers. */
  events(matchId: string): FightEnvelope[] { return this.get(matchId).events; }
  statusOf(matchId: string): Status { return this.get(matchId).status; }
  private get(id: string): M { const m = this.matches.get(id); if (!m) throw new Error('no_such_match'); return m; }
  private gate(m: M, ok: Status[], what: string): void { if (!ok.includes(m.status)) throw new Error(`bad_status:${what}:${m.status}`); }

  private emit(m: M, matchId: string, type: FightEvent['type'], data: unknown): void {
    const env = { v: 1, matchId, seq: ++m.seq, t: Date.now() - m.createdAt, type, data } as FightEnvelope;
    m.events.push(env);
    for (const f of [...(this.listeners.get(matchId) ?? [])]) f({ matchId, seq: env.seq, t: env.t, type, data });
  }

  async claimRunner(): Promise<void> {}
  async creditTestFunds(): Promise<void> {}
  async upsertHouseFighter(): Promise<void> {}

  async createMatch(a: Parameters<Stdb['createMatch']>[0]): Promise<void> {
    this.calls.push({ name: 'createMatch', matchId: a.id });
    if (this.matches.has(a.id)) throw new Error('duplicate_match');
    if (a.fighterIds.length !== 4 || a.slots.length !== 4 || new Set(a.slots).size !== 4) throw new Error('bad_fighters');
    for (const mk of a.markets) {
      if (mk.outcomes.length !== mk.seeds.length) throw new Error('bad_seeds');
      if (mk.seeds.some((s) => !Number.isInteger(s) || s < 50)) throw new Error('seed_below_min');
    }
    const m: M = { status: 'open', createdAt: Date.now(), seq: 0, events: [], markets: a.markets, fighters: a.fighterIds, timer: null, args: a };
    this.matches.set(a.id, m);
    this.emit(m, a.id, 'match.created', { category: a.category, mode: a.mode, isDemo: a.isDemo, fighters: a.fighterIds, slots: a.slots,
      problems: a.problems, commitHash: a.commitHash, bettingClosesAt: m.createdAt + a.bettingWindowMs, timeLimitMs: a.timeLimitMs });
    m.timer = setTimeout(() => { if (m.status === 'open') this.doLock(m, a.id); }, a.bettingWindowMs);   // auto_lock
  }
  private doLock(m: M, id: string): void {
    m.status = 'locked';
    const pools: Record<string, Record<string, number>> = {};
    for (const mk of m.markets) pools[mk.id] = Object.fromEntries(mk.outcomes.map((o, i) => [o, mk.seeds[i]!]));
    this.emit(m, id, 'betting.locked', { pools });
  }
  async lockMatch(a: { matchId: string }): Promise<void> {
    this.calls.push({ name: 'lockMatch', matchId: a.matchId });
    const m = this.get(a.matchId); this.gate(m, ['open'], 'lock_match');
    if (m.timer) clearTimeout(m.timer);
    this.doLock(m, a.matchId);
  }
  async startMatch(a: { matchId: string }): Promise<void> {
    this.calls.push({ name: 'startMatch', matchId: a.matchId });
    const m = this.get(a.matchId); this.gate(m, ['locked'], 'start_match');
    m.status = 'live'; this.emit(m, a.matchId, 'match.started', {});
  }
  async postEvents(a: { matchId: string; events: { type: string; data: string }[] }): Promise<void> {
    this.calls.push({ name: 'postEvents', matchId: a.matchId });
    const m = this.get(a.matchId);
    if (a.events.length === 0 || a.events.length > 64) throw new Error('bad_batch_size');
    const parsed = a.events.map((e) => {
      if (!(RUNNER_POSTABLE as string[]).includes(e.type)) throw new Error(`not_postable:${e.type}`);
      if (typeof e.data !== 'string') throw new Error('data_not_string');
      return { type: e.type, data: JSON.parse(e.data) as { fighterId?: string } };
    });
    for (const e of parsed) {
      const ok = e.type === 'match.intro' ? m.status === 'locked' : e.type === 'verdict.final' ? m.status === 'review' : m.status === 'live';
      if (!ok) throw new Error(`bad_status:${e.type}:${m.status}`);
      if (e.data.fighterId && !m.fighters.includes(e.data.fighterId)) throw new Error('unknown_fighter');
    }
    this.postBatches.push({ matchId: a.matchId, types: parsed.map((e) => e.type) });
    for (const e of parsed) this.emit(m, a.matchId, e.type as FightEvent['type'], e.data);   // one transaction: consecutive seqs
  }
  async beginReview(a: { matchId: string }): Promise<void> {
    this.calls.push({ name: 'beginReview', matchId: a.matchId });
    const m = this.get(a.matchId); this.gate(m, ['live'], 'begin_review');
    m.status = 'review'; this.emit(m, a.matchId, 'match.timeup', {});
  }
  async finalizeMatch(a: Parameters<Stdb['finalizeMatch']>[0]): Promise<void> {
    this.calls.push({ name: 'finalizeMatch', matchId: a.matchId }); this.finalizes.push(a);
    const m = this.get(a.matchId); this.gate(m, ['review'], 'finalize_match');
    this.emit(m, a.matchId, 'match.result', { standings: a.standings });
  }
  async revealMatch(a: { matchId: string; problemSetJson: string; salt: string }): Promise<void> {
    this.calls.push({ name: 'revealMatch', matchId: a.matchId });
    const m = this.get(a.matchId); this.gate(m, ['review'], 'reveal_match');
    this.emit(m, a.matchId, 'match.revealed', { problemSet: JSON.parse(a.problemSetJson), salt: a.salt });
  }
  async settleMatch(a: Parameters<Stdb['settleMatch']>[0]): Promise<void> {
    this.calls.push({ name: 'settleMatch', matchId: a.matchId }); this.settles.push(a);
    const m = this.get(a.matchId); this.gate(m, ['review'], 'settle_match');
    m.status = 'settled'; this.emit(m, a.matchId, 'match.settled', { results: a.results, totalPaid: 0, elo: {}, ovr: {} });
  }
  async voidMatch(a: { matchId: string; reason: string }): Promise<void> {
    this.calls.push({ name: 'voidMatch', matchId: a.matchId });
    const m = this.get(a.matchId); this.gate(m, ['open', 'locked', 'live', 'review'], 'void_match');
    if (m.timer) clearTimeout(m.timer);
    m.status = 'void'; this.emit(m, a.matchId, 'match.void', { reason: a.reason });
  }
  async recordPurse(): Promise<void> {}
  async setFighterWallet(): Promise<void> {}
}
