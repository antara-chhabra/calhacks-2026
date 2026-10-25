// ReplaySource (PRD §8.7, FC-F-241/242). HEAD-owned. Plays a recorded fixture on its `t` timeline.
// Pure of the store: it reports through hooks so it can be unit-tested with fake timers.
import type { FightEnvelope } from '@fc/contracts';
import { deriveCues, initialMatchState, reduceMatch, type ArenaCue, type MatchState } from '@fc/engine';
import type { MockBasicFixture } from '../../../../scripts/gen-mock-basic';

export type { MockBasicFixture };

// Fixtures are bundled by Vite (lazy chunk per file). Name = file basename without `.json`.
const loaders = import.meta.glob('../../../../fixtures/matches/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;

export function fixtureNames(): string[] {
  return Object.keys(loaders).map((p) => p.replace(/^.*\//, '').replace(/\.json$/, ''));
}

export async function loadFixture(name: string): Promise<MockBasicFixture> {
  const key = Object.keys(loaders).find((p) => p.endsWith(`/${name}.json`));
  if (!key) throw new Error(`replay_not_found:${name}`);
  return (await loaders[key]!()) as MockBasicFixture;
}

export type ReplayHooks = {
  /** A live-played event was applied (cues already derived from `prev`). */
  onLive(prev: MatchState, next: MatchState, e: FightEnvelope, cues: ArenaCue[]): void;
  /** Silent jump (start/seek/restart): state replaced, no cues. */
  onSnap(state: MatchState, cursor: number): void;
  onPlayState?(playing: boolean): void;
};

export class ReplaySource {
  state: MatchState = initialMatchState();
  /** Number of fixture events applied so far. */
  cursor = 0;
  /** Replay clock, ms on the fixture's `t` timeline. */
  clockT = 0;
  playing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastWall = 0;
  private disposed = false;

  constructor(readonly fixture: MockBasicFixture, private hooks: ReplayHooks, public speed = 1) {}

  get events(): FightEnvelope[] { return this.fixture.events; }
  get duration(): number { return this.events.length ? this.events[this.events.length - 1]!.t : 0; }
  get ended(): boolean { return this.cursor >= this.events.length; }

  /** Catch-up: reduce every event with t <= target, no cues. */
  private reduceTo(targetT: number): void {
    let s = initialMatchState();
    let i = 0;
    while (i < this.events.length && this.events[i]!.t <= targetT) s = reduceMatch(s, this.events[i++]!);
    this.state = s; this.cursor = i;
  }

  private sync(): void {   // fold elapsed wall time into the replay clock
    const now = Date.now();
    if (this.playing && !this.ended) {
      const next = this.events[this.cursor]!.t;
      this.clockT = Math.min(next, this.clockT + (now - this.lastWall) * this.speed);
    }
    this.lastWall = now;
  }

  private schedule(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.disposed || !this.playing || this.ended) return;
    this.lastWall = Date.now();
    const delay = Math.max(0, (this.events[this.cursor]!.t - this.clockT) / this.speed);
    this.timer = setTimeout(() => this.fire(), delay);
  }

  private fire(): void {
    this.timer = null;
    if (this.disposed || !this.playing || this.ended) return;
    const e = this.events[this.cursor++]!;
    const prev = this.state;
    const cues = deriveCues(prev, e);
    this.state = reduceMatch(prev, e);
    this.clockT = e.t;
    this.hooks.onLive(prev, this.state, e, cues);
    this.schedule();
  }

  /** Start from the beginning (silent snap to the empty state), then play if `playing`. */
  start(playing = true): void {
    this.clockT = -1; this.state = initialMatchState(); this.cursor = 0;
    this.hooks.onSnap(this.state, 0);
    this.setPlaying(playing);
  }
  restart(): void { this.start(true); }

  setPlaying(on: boolean): void {
    this.sync();
    this.playing = on;
    this.hooks.onPlayState?.(on);
    this.schedule();
  }
  setSpeed(n: number): void {
    this.sync();
    this.speed = n > 0 ? n : 1;
    this.schedule();
  }
  /** Seek = catch-up. Silent; the store bumps playbackRevision from onSnap. */
  seek(targetT: number): void {
    const t = Math.max(0, Math.min(targetT, this.duration));
    this.reduceTo(t);
    this.clockT = t; this.lastWall = Date.now();
    this.hooks.onSnap(this.state, this.cursor);
    this.schedule();
  }
  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
