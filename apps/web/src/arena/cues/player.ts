// Cue player (PRD §8.6/§8.7/§10.5/§10.8, FC-F-123). Pure TS over PoseDriver + GSAP timelines (no Pixi), so it runs in node tests.
// Model: each fighter runs ONE clip at a time. Jobs wait in a per-fighter FIFO; when the queue is empty the fighter loops idle
// (or think while its status is `thinking`). Timelines are paused and advanced by tick(dtMs) × speed, so pause/speed/seek are exact.
import type { ArenaCue } from '@fc/engine';
import type { Archetype, FighterId } from '@fc/contracts';
import { KO_FADED_ALPHA } from '../clips/koBlast';
import { CLIPS, resetPose, type ClipName, type ClipParams, type ClipPower, type ClipTimeline, type PoseDriver } from '../clips';

export type CueKind = ArenaCue['kind'];
export const CUE_KINDS: readonly CueKind[] = ['dropIn', 'countdown', 'think', 'toolUse', 'say', 'attack', 'whiff', 'card', 'potion', 'done', 'out', 'timeup', 'var', 'ko', 'victory', 'coin', 'void'];

export interface FighterHandle {
  id: FighterId;
  slot: { x: number; y: number; facing: 1 | -1 };   // feet anchor in stage px
  driver: PoseDriver;
  archetype?: Archetype;
  /** Move the rig root in stage space (used for platform-height changes during a dash). */
  place(x: number, y: number): void;
}
export type LiveStatus = 'waiting' | 'thinking' | 'working' | 'done' | 'out' | 'winner' | 'ko';

export interface CueHooks {
  /** Every cue, once, when received (before queueing). VFX (A-07) / labels (A-08) attach here. */
  onCue?(cue: ArenaCue): void;
  /** Contact frame of an attack, after the victim reaction was started. `second` = special's second arc. */
  onImpact?(cue: Extract<ArenaCue, { kind: 'attack' }>, second: boolean): void;
  /** A queued cue was dropped by the §10.5 rules. */
  onDrop?(cue: ArenaCue): void;
}

export interface CuePlayerDeps {
  speed(): number;
  playing(): boolean;
  /** Current engine state per fighter (status, damagePct). */
  fighterState(id: FighterId): { status: LiveStatus; damagePct: number } | undefined;
  reduced?(): boolean;
  hooks?: CueHooks;
  /** Test seam: replace the clip registry. */
  clips?: Record<ClipName, (d: PoseDriver, p?: ClipParams) => ClipTimeline>;
}

export const QUEUE_LIMIT = 4;          // FC-F-123: more than this and non-scoring cues are dropped
export const DASH_STOP_GAP = 140;      // PRD §10.5: dash lands 140 px in front of the target
/** Never dropped (FC-F-123 + victory). Everything else droppable class is DROPPABLE; the remainder has no clip and is free. */
export const NEVER_DROP: ReadonlySet<CueKind> = new Set<CueKind>(['attack', 'whiff', 'var', 'card', 'ko', 'victory', 'out', 'dropIn']);
export const DROPPABLE: ReadonlySet<CueKind> = new Set<CueKind>(['think', 'toolUse', 'done']);

type Step = (f: Fighter) => ClipTimeline;
interface Job { kind: CueKind | 'reaction'; cue: ArenaCue | null; steps: Step[]; idx: number; soft: boolean; hold?: 'ko' | 'victory'; reset: boolean }
interface Active { job: Job | null; tl: ClipTimeline; name: string }
export interface Fighter {
  h: FighterHandle; queue: Job[]; active: Active | null; held: 'ko' | 'victory' | null;
  pos: { x: number; y: number }; pendingReact: Job | null;
  blasted: boolean;   // a KO/out clip already carried the rig away: keep it there instead of redrawing the ko pose at the slot
}
export interface KindStats { received: number; played: number; hooked: number; dropped: number }

const PROTECTED = new Set<string>(['attack', 'whiff', 'ko', 'out', 'victory', 'dropIn', 'card']);

export class CuePlayer {
  private readonly fighters = new Map<FighterId, Fighter>();
  private list: Fighter[] = [];
  private lastScale = 1;
  private readonly frozen = new Map<FighterId, number>();   // hit-stop: remaining ms (game time) per fighter
  readonly stats: Record<string, KindStats> = {};
  constructor(private readonly d: CuePlayerDeps) {
    for (const k of CUE_KINDS) this.stats[k] = { received: 0, played: 0, hooked: 0, dropped: 0 };
  }

  private clip(n: ClipName, f: Fighter, p: ClipParams): ClipTimeline {
    const tl = (this.d.clips ?? CLIPS)[n](f.h.driver, { archetype: f.h.archetype, reduced: this.d.reduced?.() ?? false, ...p });
    tl.timeScale(this.d.speed());
    return tl;
  }

  /** Replace the set of rigs. New/changed handles start idle at their slot; removed ones are killed. */
  setFighters(hs: readonly FighterHandle[]): void {
    for (const [id, f] of this.fighters) if (!hs.some((h) => h.id === id && h === f.h)) { this.kill(f); this.fighters.delete(id); }
    for (const h of hs) {
      if (this.fighters.has(h.id)) continue;
      const f: Fighter = { h, queue: [], active: null, held: null, blasted: false, pos: { x: h.slot.x, y: h.slot.y }, pendingReact: null };
      this.fighters.set(h.id, f);
      this.settle(f);
    }
    this.list = [...this.fighters.values()];
  }

  /** Catch-up rule (PRD §8.7): kill everything, clear queues, show the state-derived pose. */
  snap(): void {
    this.frozen.clear();
    for (const f of this.list) { this.kill(f); f.queue.length = 0; f.pendingReact = null; f.held = null; f.blasted = false; this.settle(f); }
  }

  private kill(f: Fighter): void { if (f.active) { f.active.tl.kill(); f.active = null; } }

  /** Hard-reset a fighter to its slot and the pose its engine status implies. */
  private settle(f: Fighter): void {
    this.kill(f);
    const { h } = f;
    resetPose(h.driver); h.driver.setFacing(h.slot.facing); f.pos.x = h.slot.x; f.pos.y = h.slot.y; h.place(f.pos.x, f.pos.y);
    const st = this.d.fighterState(h.id)?.status;
    f.held = st === 'ko' || st === 'out' ? 'ko' : st === 'winner' ? 'victory' : null;
    this.next(f);
  }

  // ---- queue / lifecycle ----
  private enqueue(f: Fighter, job: Job): void {
    f.queue.push(job);
    if (!f.active || f.active.job === null || f.active.job.soft) this.next(f);
  }

  /** Start whatever comes next on this fighter. */
  private next(f: Fighter): void {
    this.kill(f);
    if (f.pendingReact) { const j = f.pendingReact; f.pendingReact = null; this.start(f, j); return; }
    const job = f.queue.shift();
    if (job) { this.start(f, job); return; }
    if (f.held === 'ko') { if (!f.blasted) this.applyKo(f); return; }
    const st = this.d.fighterState(f.h.id)?.status;
    const name: ClipName = f.held === 'victory' ? 'victory' : st === 'thinking' ? 'think' : 'idle';
    f.active = { job: null, tl: this.clip(name, f, { facing: f.h.slot.facing }), name };
    f.active.tl.pause(0);
  }

  private start(f: Fighter, job: Job): void {
    resetPose(f.h.driver);                       // looping/soft clips leave the body mid-pose; every job starts from idle
    if (job.hold === 'victory') f.held = 'victory';   // victory loops forever, so it never reaches finishStep
    this.run(f, job);
  }
  private run(f: Fighter, job: Job): void {
    const tl = job.steps[job.idx]!(f);
    f.active = { job, tl, name: job.kind };
    tl.pause(0);
  }

  private applyKo(f: Fighter): void {
    const d = f.h.driver, ko = d.poses.ko;
    resetPose(d);
    for (const k of Object.keys(ko.bones)) d.state.bones[k] = ko.bones[k]!;
    d.state.weapon = ko.weapon; d.state.face = ko.face;
    if (this.d.reduced?.()) d.state.alpha = KO_FADED_ALPHA;   // same end state as the reduced koBlast crossfade
    d.flush();
  }

  private finishStep(f: Fighter): void {
    const a = f.active!; const job = a.job;
    if (!job) return;                       // idle loops never complete
    if (++job.idx < job.steps.length) { this.run(f, job); return; }
    if (job.reset) { resetPose(f.h.driver); f.h.driver.setFacing(f.h.slot.facing); f.pos.x = f.h.slot.x; f.pos.y = f.h.slot.y; f.h.place(f.pos.x, f.pos.y); }
    if (job.hold) { f.held = job.hold; f.blasted = job.hold === 'ko'; }
    f.active = null;
    this.next(f);
  }

  /** Advance all timelines by dtMs (wall time). No-op while paused. */
  tick(dtMs: number): void {
    if (!this.d.playing()) return;
    const sp = this.d.speed(), dt = (Math.min(dtMs, 100) / 1000) * sp;
    const respeed = sp !== this.lastScale; this.lastScale = sp;
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const f = list[i]!, a = f.active;
      if (!a) continue;
      if (this.frozen.size) {
        const z = this.frozen.get(f.h.id);
        if (z !== undefined) { if (z > dt * 1000) { this.frozen.set(f.h.id, z - dt * 1000); continue; } this.frozen.delete(f.h.id); }
      }
      const tl = a.tl;
      if (respeed) tl.timeScale(sp);
      tl.totalTime(tl.totalTime() + dt);
      if (a.job && tl.totalTime() >= tl.totalDuration() - 1e-6) this.finishStep(f);
    }
  }

  /** Hit-stop (PRD §10.5, FC-F-124): freeze these fighters' timelines for `ms` of game time. VFX (A-07) calls it at impact. */
  hitStop(ms: number, ids: readonly FighterId[]): void {
    for (const id of ids) if (this.fighters.has(id)) this.frozen.set(id, Math.max(ms, this.frozen.get(id) ?? 0));
  }

  // ---- cue intake ----
  handle(cue: ArenaCue): void {
    const st = this.stats[cue.kind]!; st.received++;
    this.d.hooks?.onCue?.(cue);
    const fighter = 'fighter' in cue ? this.fighters.get(cue.fighter) : undefined;
    if (!fighter) { st.hooked++; return; }          // global cue or no rig on stage: hook only
    if (this.shouldDrop(cue, fighter)) { st.dropped++; this.d.hooks?.onDrop?.(cue); return; }
    const job = this.buildJob(cue, fighter);
    if (!job) { st.hooked++; return; }             // no clip yet (VFX / labels)
    if (NEVER_DROP.has(cue.kind) && fighter.queue.length >= QUEUE_LIMIT) this.purge(fighter);
    st.played++;
    this.enqueue(fighter, job);
  }

  private shouldDrop(cue: ArenaCue, f: Fighter): boolean {
    if (!DROPPABLE.has(cue.kind)) return false;
    if (this.d.speed() > 1 || f.queue.length >= QUEUE_LIMIT) return true;       // FC-F-123 + §10.5: speed>1 sheds think/toolUse first
    return cue.kind === 'think' && (f.active?.name === 'think' || f.queue.some((j) => j.kind === 'think'));   // already thinking
  }
  /** Overloaded queue: evict queued droppables so scoring cues are never starved. */
  private purge(f: Fighter): void {
    f.queue = f.queue.filter((j) => {
      if (j.cue && DROPPABLE.has(j.kind as CueKind)) { this.stats[j.kind]!.dropped++; this.stats[j.kind]!.played--; this.d.hooks?.onDrop?.(j.cue); return false; }
      return true;
    });
  }

  private shorten(f: Fighter): number { return f.queue.length > QUEUE_LIMIT || this.d.speed() >= 4 ? 0.5 : 1; }

  private buildJob(cue: ArenaCue, f: Fighter): Job | null {
    const one = (name: ClipName, p: (f: Fighter) => ClipParams = () => ({})): Step => (ff) => this.clip(name, ff, p(ff));
    const mk = (kind: CueKind, steps: Step[], o: Partial<Job> = {}): Job => ({ kind, cue, steps, idx: 0, soft: false, reset: false, ...o });
    const face = f.h.slot.facing;
    switch (cue.kind) {
      case 'dropIn': return mk('dropIn', [one('dropIn', () => ({ facing: face }))]);
      case 'think': return mk('think', [one('think', () => ({ facing: face }))], { soft: true });
      case 'toolUse': return mk('toolUse', [one('toolUse', () => ({ tool: cue.tool === 'other' ? 'run' : cue.tool }))]);
      case 'done': return mk('done', [one('taunt', () => ({ facing: face }))]);
      case 'card': return mk('card', [one('cardReact', () => ({ color: cue.color }))]);
      case 'out': return mk('out', [one('stagger'), one('koBlast', () => ({ distance: 200 }))], { hold: 'ko' });
      case 'ko': return mk('ko', [one('koBlast')], { hold: 'ko' });
      case 'victory': return mk('victory', [one('victory', () => ({ facing: face }))], { hold: 'victory' });
      case 'whiff': {
        const dir = this.dirTo(f, cue.target);
        return mk('whiff', [one('whiff', () => ({ facing: dir }))], { reset: true });
      }
      case 'attack': {
        const dir = this.dirTo(f, cue.target), tgt = this.fighters.get(cue.target);
        const gap = tgt ? Math.max(0, Math.abs(tgt.h.slot.x - f.h.slot.x) - DASH_STOP_GAP) : 160;
        const dy = tgt ? tgt.h.slot.y - f.h.slot.y : 0;
        const power: ClipPower = cue.power;
        const slash: ClipName = power === 'light' ? 'slashLight' : power === 'heavy' ? 'slashHeavy' : 'special';
        const dash = (dist: (ff: Fighter) => number, toY: number): Step => (ff) => {
          const tl = this.clip('dash', ff, { facing: dir, distance: dist(ff) });
          const from = { y: ff.pos.y };
          tl.to(from, { y: ff.h.slot.y + toY, duration: tl.duration(), ease: 'power2.out', onUpdate: () => { ff.pos.y = from.y; ff.h.place(ff.pos.x, ff.pos.y); } }, 0);
          return tl;
        };
        return mk('attack', [
          dash(() => gap * this.shorten(f), dy),
          one(slash, () => ({ facing: dir, power, onImpact: () => { this.impact(cue, f, false); }, onImpact2: () => { this.impact(cue, f, true); } })),
          dash((ff) => -ff.h.driver.state.x, 0),
        ], { reset: true });
      }
      default: return null;   // say, potion, countdown, timeup, var, coin, void: VFX/labels (A-07/A-08); counted via onCue
    }
  }

  private dirTo(f: Fighter, target: FighterId): 1 | -1 {
    const t = this.fighters.get(target);
    return t ? (t.h.slot.x >= f.h.slot.x ? 1 : -1) : f.h.slot.facing;
  }

  /** Contact frame: reserve the victim and fire its reaction. */
  private impact(cue: Extract<ArenaCue, { kind: 'attack' }>, atk: Fighter, second: boolean): void {
    const v = this.fighters.get(cue.target);
    if (v && !second) this.react(v, atk, cue);
    this.d.hooks?.onImpact?.(cue, second);
  }

  private react(v: Fighter, atk: Fighter, cue: Extract<ArenaCue, { kind: 'attack' }>): void {
    if (v.held) return;
    const dir = atk.h.slot.x >= v.h.slot.x ? 1 : -1;
    const pct = this.d.fighterState(v.h.id)?.damagePct ?? 0;
    const name: ClipName = cue.power === 'light' ? 'hitReact' : 'knockback';
    const job: Job = { kind: 'reaction', cue: null, soft: false, reset: true, idx: 0,
      steps: [(ff) => this.clip(name, ff, { facing: dir, damagePct: pct, power: cue.power })] };
    const cur = v.active;
    if (cur && cur.job && PROTECTED.has(cur.job.kind)) { v.pendingReact = job; return; }   // reserved: plays as soon as its own clip ends
    this.kill(v);
    this.start(v, job);
  }

  /** Test/inspection helpers. */
  fighter(id: FighterId): Fighter | undefined { return this.fighters.get(id); }
  summary(): string { return CUE_KINDS.map((k) => { const s = this.stats[k]!; return `${k}=${s.received}${s.dropped ? `(drop ${s.dropped})` : ''}`; }).join(' '); }
}
