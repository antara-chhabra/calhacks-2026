// Clip registry (PRD §10.8). Names match the PRD exactly; per-archetype flavor is by ClipParams.archetype, not separate clips.
import { cardReact } from './cardReact';
import { counter } from './counter';
import { dash } from './dash';
import { dropIn } from './dropIn';
import { hitReact } from './hitReact';
import { idle } from './idle';
import { knockback } from './knockback';
import { koBlast } from './koBlast';
import { slashHeavy } from './slashHeavy';
import { slashLight } from './slashLight';
import { special } from './special';
import { stagger } from './stagger';
import { taunt } from './taunt';
import { think } from './think';
import { toolUse } from './toolUse';
import { victory } from './victory';
import { whiff } from './whiff';
import type { Clip } from './types';

export const CLIPS = {
  idle, think, toolUse, dash, slashLight, slashHeavy, special, whiff, counter,
  hitReact, knockback, stagger, koBlast, victory, taunt, dropIn, cardReact,
} as const satisfies Record<string, Clip>;
export type ClipName = keyof typeof CLIPS;

/** Nominal duration in ms at default params (loops: one cycle). knockback = 300 slide + 400 return. */
export const CLIP_MS: Record<ClipName, number> = {
  idle: 1200, think: 1600, toolUse: 450, dash: 260, slashLight: 220, slashHeavy: 340, special: 520, whiff: 420, counter: 160,
  hitReact: 200, knockback: 700, stagger: 500, koBlast: 700, victory: 2400, taunt: 900, dropIn: 450, cardReact: 600,
};
/** Clips that fire `onImpact` at label `impact`. */
export const ATTACK_CLIPS: readonly ClipName[] = ['slashLight', 'slashHeavy', 'special'];
export const LOOPING_CLIPS: readonly ClipName[] = ['idle', 'think', 'victory'];

export * from './types';
export { createPoseDriver, resetPose } from "./pose-driver";
