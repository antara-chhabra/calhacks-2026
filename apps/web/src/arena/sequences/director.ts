// Sequence director (A-09, FC-F-127/128, PRD §8.6/§10.5). Sits between the cue stream and the CuePlayer:
// it re-times intro/outro cues (drop-ins staggered in slot order, countdown after the last landing, KOs in rank order 4→2, victory after
// the last KO) and emits visual "beats" for the sequence layer (spotlight, name banners, confetti, winner banner) plus the podium handoff.
// Pure TS (no Pixi): the host feeds update(dtMs) with the same clock as the cue player (wall dt × speed, only while playing).
// Catch-up (snap): pending steps are dropped and the end state is shown directly. The intro never replays after a seek.
import type { ArenaCue } from '@fc/engine';
import type { FighterId } from '@fc/contracts';
import { COUNTDOWN, INTRO, OUTRO, introLand, introStagger, koDelay } from './pure';
import { setPodium, type PodiumInfo } from './podium';

export type Beat =
  | { kind: 'introLand'; fighter: FighterId; spotlight: boolean }     // spotlight beam + lower-third name banner
  | { kind: 'victory'; fighter: FighterId; confetti: boolean }        // dim + spotlight + confetti + winner banner
  | { kind: 'podium'; fighter: FighterId }                            // outro done: results may be revealed
  | { kind: 'ended'; fighter: FighterId | null }                      // snap: static end state (winner banner only)
  | { kind: 'clear' };                                                // snap: remove every sequence visual

export interface DirectorDeps {
  reduced(): boolean;
  /** Re-timed cue, ready for CuePlayer.handle (the VFX/label hooks hang off the player's onCue). */
  emit(cue: ArenaCue): void;
  onBeat?(b: Beat): void;
  matchId?(): string | null;
  /** Test seam; defaults to the global podium store + 'fc:podium' DOM event. */
  podium?(p: PodiumInfo): void;
}

interface Item { at: number; seq: number; run(): void }

export class SequenceDirector {
  private now = 0;
  private seq = 0;
  private items: Item[] = [];
  private hidden = new Set<FighterId>();
  private introIdx = 0;
  private lastDrop = -Infinity;
  private introEnd = 0;       // clock time when the last drop-in has settled
  private gateAt = 0;         // clock time when FIGHT! lands; gameplay cues wait for it
  private koMax = 0;          // longest KO delay in the current outro
  constructor(private readonly d: DirectorDeps) {}

  /** True while a fighter is waiting for its drop-in (the host hides the rig and its label). */
  isHidden(id: FighterId): boolean { return this.hidden.has(id); }
  get pending(): number { return this.items.length; }

  private at(delay: number, run: () => void): void {
    this.items.push({ at: this.now + Math.max(0, delay), seq: this.seq++, run });
    if (delay <= 0) this.flushDue();
  }

  /** Cue intake: replaces `player.handle(cue)` in the host. */
  push(cue: ArenaCue): void {
    const red = this.d.reduced();
    switch (cue.kind) {
      case 'dropIn': {
        if (this.now - this.lastDrop > INTRO.groupGapMs) this.introIdx = 0;
        this.lastDrop = this.now;
        const delay = this.introIdx++ * introStagger(red), land = delay + introLand(red);
        if (delay > 0) this.hidden.add(cue.fighter);
        this.at(delay, () => { this.hidden.delete(cue.fighter); this.d.emit(cue); });
        this.at(land, () => { this.d.onBeat?.({ kind: 'introLand', fighter: cue.fighter, spotlight: true }); });
        const line = cue.line?.trim();
        if (line) this.at(land + INTRO.bubbleLagMs, () => { this.d.emit({ kind: 'say', fighter: cue.fighter, text: line }); });
        this.introEnd = Math.max(this.introEnd, this.now + land + (red ? 300 : INTRO.settleMs));
        return;
      }
      case 'countdown': {
        const wait = Math.max(0, this.introEnd - this.now);
        this.gateAt = this.now + wait + COUNTDOWN.fightAtMs;
        this.introIdx = 0;
        this.at(wait, () => { this.d.emit(cue); });
        return;
      }
      case 'ko': {
        const delay = koDelay(cue.order, red);
        this.koMax = Math.max(this.koMax, delay);
        this.at(delay, () => { this.d.emit(cue); });
        return;
      }
      case 'victory': {
        const delay = this.koMax > 0 ? this.koMax + (red ? OUTRO.reducedVictoryGapMs : OUTRO.victoryGapMs) : 0;
        this.koMax = 0;
        this.at(delay, () => {
          this.d.emit(cue);
          this.d.onBeat?.({ kind: 'victory', fighter: cue.fighter, confetti: !this.d.reduced() });
        });
        this.at(delay + (red ? OUTRO.reducedPodiumDelayMs : OUTRO.podiumDelayMs), () => {
          this.d.onBeat?.({ kind: 'podium', fighter: cue.fighter });
          (this.d.podium ?? setPodium)({ revealed: true, winner: cue.fighter, matchId: this.d.matchId?.() ?? null, instant: false });
        });
        return;
      }
      case 'timeup': case 'void': this.at(0, () => { this.d.emit(cue); }); return;
      default:
        // Gameplay cues wait for FIGHT!; order among them is preserved by the (at, seq) sort.
        this.at(Math.max(0, this.gateAt - this.now), () => { this.d.emit(cue); });
    }
  }

  private flushDue(): void {
    for (;;) {
      let best = -1;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i]!;
        if (it.at <= this.now && (best < 0 || it.at < this.items[best]!.at || (it.at === this.items[best]!.at && it.seq < this.items[best]!.seq))) best = i;
      }
      if (best < 0) return;
      const [it] = this.items.splice(best, 1);
      it!.run();
    }
  }

  /** Advance the sequence clock by dtMs (game time). */
  update(dtMs: number): void { this.now += dtMs; this.flushDue(); }

  /** Catch-up rule (PRD §8.7): drop everything pending and show the end state directly. `winner` = the winner if the match is over. */
  snap(ended: { winner: FighterId | null; matchId: string | null } | null): void {
    this.items.length = 0; this.hidden.clear();
    this.introIdx = 0; this.lastDrop = -Infinity; this.introEnd = this.now; this.gateAt = this.now; this.koMax = 0;
    this.d.onBeat?.({ kind: 'clear' });
    if (ended?.winner) {
      this.d.onBeat?.({ kind: 'ended', fighter: ended.winner });
      (this.d.podium ?? setPodium)({ revealed: true, winner: ended.winner, matchId: ended.matchId, instant: true });
    } else {
      (this.d.podium ?? setPodium)({ revealed: false, winner: null, matchId: null, instant: false });
    }
  }

  destroy(): void { this.items.length = 0; this.hidden.clear(); }
}
