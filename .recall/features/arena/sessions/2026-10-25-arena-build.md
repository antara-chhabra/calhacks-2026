# 2026-10-25 — arena/arena-build

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Build the O1 arena end to end with sub-agents (A-01…A-09).

## What happened
- A-01 VEX drawn as SVG parts + parts.json manifest + 3 poses.
- A-02 rig system (palette placeholders #FF00FF/#00FFFF/#FFFF00/#FFAA88), Pixi rigs, static SVG FighterPortrait.
- A-03 heads x7, emblems x7, weapons x5, lean/standard/heavy body templates (public/art/builds/**); all 6 house skins render.
- A-04 Sky Colosseum stage + SLOTS + jumbotron (gems, clock, MATCH #n). A-05 17 PRD clips as GSAP timelines over a PoseDriver with impact labels.
- A-06 cue player (queues, dash/slash/return, victim reservation at impact, drop rules, snap). A-07 VFX (arcs, sparks, hit-stop, shake, pops, KO blast, VAR sequence, referee drone, coins, countdown). A-08 labels (name tags, damage %, hit labels, bubbles) integrated by HEAD. A-09 intro/outro + podium handoff + reduced motion.
- Verified in the browser pane on /replay/mock-basic: fights, labels, countdown, outro "SAGE WINS!".

## Files touched
- apps/web/src/arena/** (rig, manifest, palette, assets, stage/, clips/, cues/, vfx/, labels/, sequences/, ArenaCanvas.tsx)
- apps/web/public/art/** (fighters/vex, builds/{lean,standard,heavy,common}, heads, weapons, emblems, reference)
- docs/art-bible.md §7/§7.1
- docs/status/img/A-0*.png

## Decisions made
- Bones are flat zIndex-sorted holders driven by worldTransforms (not nested Containers). Why: art-bible z-order interleaves branches.
- Body resolved by skin.build from builds/<build>/; fighters/vex kept as a byte-identical copy of heavy. Why: tests and reference composites still read it.
- Podium handoff via window CustomEvent fc:podium + subscribePodium(). Why: ArenaCanvas signature is frozen.

## Open threads at end of session
- [ ] Match screen (O2) should listen to fc:podium to reveal results
- [ ] Jumbotron covers name tags on floating slots 0 and 3
- [ ] A-10 parallax/crowd + perf pass (≥55 fps p95)
- [ ] Forge needs an arena preview export for real idle/slashHeavy clips
- [ ] fighters/vex can be deleted once tests/reference point at builds/heavy

## Gotchas
- Headless Chrome gives black WebGL frames; use the in-app browser pane.
- Rig has no per-node translation; head bob is a small nod.
