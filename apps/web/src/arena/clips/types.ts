// Clip API (PRD §10.8, FC-F-122). Clips are GSAP timelines over a PoseDriver; no Pixi import, so they run in node.

export type Archetype = 'brawler' | 'scholar' | 'trickster' | 'tank' | 'speedster';
export type ClipPower = 'light' | 'heavy' | 'special';

/** Mutable animated state. Rig space: px, y down, +x = the fighter's facing, degrees clockwise. Bone and weapon values are ABSOLUTE
 *  angles (the driver starts them at the idle pose); x/y/rot/sx/sy describe the whole rig about the feet midpoint. */
export interface PoseState {
  x: number; y: number;            // offset from the slot in rig space (forward = +x, up = -y)
  rot: number;                     // whole-rig rotation about the hips
  sx: number; sy: number;          // squash/stretch about the feet
  alpha: number;
  grounded: boolean;               // false while airborne/launched (disables foot-grounding)
  weapon: number;                  // weapon world angle
  bones: Record<string, number>;   // bone-id → local rotation, same ids on lean/standard/heavy
  face: string;                    // expression name
}
export interface PoseRef { bones: Record<string, number>; weapon: number; face: string }

export interface PoseDriver {
  readonly state: PoseState;
  /** Idle reference (clips tween deltas from it) and the other reference poses. */
  readonly base: PoseRef;
  readonly poses: { attack: PoseRef; ko: PoseRef; victory: PoseRef };
  setFacing(dir: 1 | -1): void;
  /** Push `state` to the renderer. Timelines call it every update. */
  flush(): void;
}

export interface ClipParams {
  /** Mirror the rig (1 = right, -1 = left). Applied at t=0. Clips never flip mid-way. */
  facing?: 1 | -1;
  /** Slash/special/attack power. Slash clips are fixed per name; used by `counter`/`knockback` scaling only. */
  power?: ClipPower;
  archetype?: Archetype;
  /** Reduced motion (art bible §6): 2-pose swaps (steps snap, no easing), no shake/wobble/spin; durations and labels unchanged. */
  reduced?: boolean;
  /** dash / koBlast: forward (dash, +x toward target) or launch distance in rig px. dash default 200, koBlast 900. Negative dash = retreat. */
  distance?: number;
  /** knockback: target's damage % after the hit; slide = 60 + 1.2·pct, clamped to 60..180 px. */
  damagePct?: number;
  /** toolUse variant. */
  tool?: 'read' | 'write' | 'run';
  /** cardReact: yellow = shrug, red = slump. */
  color?: 'yellow' | 'red';
  /** Looping clips (idle, think, victory) repeat forever unless false. */
  loop?: boolean;
  /** Attack clips call this once at the contact frame (label `impact`); the cue player reserves the victim with it. */
  onImpact?: () => void;
  /** Special only: second arc contact (label `impact2`). */
  onImpact2?: () => void;
}

export type ClipTimeline = GSAPTimeline;   // global gsap.core.Timeline alias from gsap's typings
/** Returns a PAUSED timeline starting from the driver's current state. Durations are in seconds (PRD ms / 1000). */
export type Clip = (rig: PoseDriver, params?: ClipParams) => ClipTimeline;

export const IMPACT = 'impact';
export const IMPACT2 = 'impact2';
