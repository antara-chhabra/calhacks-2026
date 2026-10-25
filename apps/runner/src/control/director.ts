// Director controller (R-03): state + commands behind the admin API (PRD §8.10, FC-F-007, FC-F-260).
// Knows nothing about match internals; the wiring injects callbacks.
export type MatchStatusLite = 'betting' | 'locked' | 'live' | 'review' | 'settled' | 'void' | string;

export class DirectorError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export type StartMatchOpts = { fighters?: string[]; betWindowS?: number };
export type StartedMatch = { matchId: string; done?: Promise<unknown> };

export type DirectorDeps = {
  mode: string;                    // 'live' | 'demo'
  engine: string;                  // 'droid' | 'direct' | 'mock'
  /** Start a match; resolves once the match id exists. `done` settles when the match is finished. */
  runMatch(opts: StartMatchOpts): Promise<StartedMatch>;
  lockMatch(id: string): Promise<void> | void;
  holdMatch?(id: string, seconds: number): Promise<void> | void;
  voidMatch(id: string, reason: string): Promise<void> | void;
  onSeason?(on: boolean): void;
  runDemo?(fixture: string): Promise<StartedMatch | void> | StartedMatch | void;
  killed?(): boolean;
  stdbStatus?(): 'ok' | 'down';
  droidStatus?(): 'ok' | 'down' | 'mock';
  paymentsStatus?(): 'off' | 'ok' | 'down';
  creditsHour?(): number;
  /** Extra strings to scrub from logs (model ids etc.). */
  secrets?(): string[];
  seasonOn?: boolean;
};

export type DirectorHealth = {
  ok: boolean; mode: string; engine: string;
  stdb: 'ok' | 'down'; droid: 'ok' | 'down' | 'mock'; payments: 'off' | 'ok' | 'down';
  season: { on: boolean; played: number; creditsHour: number; pausedReason: string | null };
};

const LOG_MAX = 50;

export class Director {
  private current: { id: string; status: MatchStatusLite } | null = null;
  private season = { on: false, played: 0, pausedReason: null as string | null };
  private lines: string[] = [];
  private starting = false;
  private activeDone: Promise<unknown> | null = null;

  constructor(private deps: DirectorDeps) { this.season.on = !!deps.seasonOn; }

  redact(s: string): string {
    let out = s
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/\b(FC_MODEL_\w+|FACTORY_API_KEY|FC_DIRECTOR_TOKEN|token)(\s*[=:]\s*)\S+/gi, '$1$2[redacted]');
    for (const sec of this.deps.secrets?.() ?? []) if (sec && sec.length >= 4) out = out.split(sec).join('[redacted]');
    return out;
  }
  log(line: string): void {
    this.lines.push(this.redact(line));
    if (this.lines.length > LOG_MAX) this.lines.splice(0, this.lines.length - LOG_MAX);
  }
  logLines(): string[] { return [...this.lines]; }

  currentMatch(): { id: string; status: MatchStatusLite } | null { return this.current && { ...this.current }; }
  /** The match runtime reports status changes here. */
  setMatchStatus(id: string, status: MatchStatusLite): void {
    if (this.current?.id === id) this.current.status = status;
  }
  noteMatchPlayed(): void { this.season.played++; }
  pauseSeason(reason: string | null): void { this.season.pausedReason = reason; }

  async startMatch(opts: StartMatchOpts = {}): Promise<{ matchId: string }> {
    if (this.deps.killed?.()) throw new DirectorError(409, 'killed', 'New matches are disabled by the kill switch');
    if (this.current || this.starting) throw new DirectorError(409, 'match_active', 'A match is already active');
    this.starting = true;
    try {
      const m = await this.deps.runMatch(opts);
      this.track(m);
      return { matchId: m.matchId };
    } finally { this.starting = false; }
  }
  private track(m: StartedMatch): void {
    this.current = { id: m.matchId, status: 'betting' };
    this.log(`match ${m.matchId} started`);
    if (m.done) {
      this.activeDone = m.done;
      const end = () => { if (this.current?.id === m.matchId) this.current = null; if (this.activeDone === m.done) this.activeDone = null; this.log(`match ${m.matchId} ended`); };
      // Consume failure even when no caller awaits the background run.
      void m.done.then(end, (e) => { this.log(`match ${m.matchId} failed: ${(e as Error)?.message ?? 'error'}`); end(); });
    }
  }
  private need(id: string) {
    if (!this.current || this.current.id !== id) throw new DirectorError(404, 'not_found', 'No such active match');
    return this.current;
  }
  async lock(id: string): Promise<void> {
    this.need(id); await this.deps.lockMatch(id); this.setMatchStatus(id, 'locked'); this.log(`match ${id} locked`);
  }
  async hold(id: string, seconds: number): Promise<void> {
    this.need(id);
    if (!this.deps.holdMatch) throw new DirectorError(409, 'unsupported', 'Hold is not available');
    await this.deps.holdMatch(id, seconds); this.log(`match ${id} betting held ${seconds}s`);
  }
  async void(id: string, reason: string): Promise<void> {
    this.need(id); await this.deps.voidMatch(id, reason);
    this.current = null; this.log(`match ${id} voided: ${reason}`);
  }
  setSeason(on: boolean): void {
    this.season.on = on; if (on) this.season.pausedReason = null;
    this.deps.onSeason?.(on); this.log(`season ${on ? 'on' : 'off'}`);
  }
  async demo(fixture: string): Promise<void> {
    if (!this.deps.runDemo) throw new DirectorError(409, 'unsupported', 'Demo mode is not available');
    if (this.deps.killed?.()) throw new DirectorError(409, 'killed', 'New matches are disabled by the kill switch');
    if (this.current || this.starting) throw new DirectorError(409, 'match_active', 'A match is already active');
    this.starting = true;
    try {
      const m = await this.deps.runDemo(fixture);
      if (m) this.track(m);
      this.log(`demo fixture ${fixture}`);
    } finally { this.starting = false; }
  }
  health(): DirectorHealth {
    const d = this.deps;
    return {
      ok: true, mode: d.mode, engine: d.engine,
      stdb: d.stdbStatus?.() ?? 'down',
      droid: d.droidStatus?.() ?? (d.engine === 'mock' ? 'mock' : 'down'),
      payments: d.paymentsStatus?.() ?? 'off',
      season: { on: this.season.on, played: this.season.played, creditsHour: d.creditsHour?.() ?? 0, pausedReason: this.season.pausedReason },
    };
  }
}
