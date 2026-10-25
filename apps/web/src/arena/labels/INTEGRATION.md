# Label layer integration (A-08) — lines for HEAD to add to ArenaCanvas.tsx

```ts
import { createLabelLayer } from './labels';
// 1. after the stage is created (and rigs built; `heads` = Map<FighterId, rig head anchor in stage px>):
const labels = createLabelLayer({
  parent: stage.world, reducedMotion,
  getAnchor: (id) => { const r = rigs.get(id); return r ? r.headAnchor() : null; },   // world-space px, read every frame
  getState: () => useStore.getState().watch.state,
  getName: (id) => useStore.getState().fighters[id]?.name ?? id,
  getSpeed: () => useStore.getState().watch.speed,
});
// 2. in CuePlayer hooks (compose with the VFX hook): onCue: (cue) => { vfx.onCue?.(cue); labels.onCue(cue); }
// 3. in the Pixi ticker:            labels.update(ticker.deltaMS);
// 4. on revision / catch-up snap:   labels.snap();   // next to cuePlayer.snap()
// 5. cleanup:                       labels.destroy();
```
Notes: the layer adds its own Container above the fighters (add it after `stage.fighters`/before `vfx` if ordering matters).
`onCue` is synchronous and creates the hit label in the same tick the cue arrives (AC-07.3). Bubbles are one per fighter, 3.0 s, replaced by the next `say`.
