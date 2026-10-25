// PoseDriver over the Pixi Rig, in a new file so rig.ts stays untouched. Adds per-bone rotation overrides, whole-rig squash/stretch,
// y/x lift and an ungrounded mode on top of Rig.setPose(PoseDef). (No per-node translation offsets exist: only rotations.)
import type { Rig } from '../rig';
import { resolvePose, worldTransforms, type PoseDef } from '../manifest';
import type { PoseDriver, PoseRef, PoseState } from './types';

const ref = (p: PoseDef): PoseRef => ({ bones: { ...p.rot }, weapon: p.weaponWorld, face: p.face });

export function createPoseDriver(rig: Rig): PoseDriver {
  const m = rig.parts.manifest;
  const idle = resolvePose(m, 'idle');
  const base = ref(idle);
  const state: PoseState = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: base.weapon, bones: { ...base.bones }, face: base.face };
  let facing: 1 | -1 = 1;
  // Hip height of the grounded idle, so airborne (ungrounded) mode starts from the same stance.
  const hipsG = worldTransforms(m, idle).hips!.y;
  const hipsU = worldTransforms(m, { ...idle, grounded: false }).hips!.y;
  const lift = hipsG - hipsU;

  const driver: PoseDriver = {
    state, base,
    poses: { attack: ref(m.poses.attack), ko: ref(m.poses.ko), victory: ref(resolvePose(m, 'victory')) },
    setFacing(dir) { facing = dir; rig.root.scale.x = dir * state.sx; },
    flush() {
      const pose: PoseDef = {
        ...idle, face: state.face, grounded: state.grounded, weaponWorld: state.weapon, rot: { ...state.bones },
        root: { x: 0, y: state.grounded ? 0 : lift, rot: state.rot },
      };
      rig.setPose(pose);
      rig.root.pivot.set(-state.x, -state.y);     // shifts the content in rig space; mirrors correctly with facing
      rig.root.scale.set(facing * state.sx, state.sy);
      rig.root.alpha = state.alpha;
    },
  };
  return driver;
}

/** Put the animated state back to the idle reference (call before replaying a clip from the start). */
export function resetPose(d: PoseDriver): void {
  Object.assign(d.state, { x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, grounded: true, weapon: d.base.weapon, face: d.base.face });
  for (const k of Object.keys(d.base.bones)) d.state.bones[k] = d.base.bones[k]!;
  d.flush();
}
