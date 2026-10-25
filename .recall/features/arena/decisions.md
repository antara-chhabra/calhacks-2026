# arena — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O1-local decisions here.
-->

## Arena art is its own document (A1, ADR-026)
**Date:** 2026-10-25
**Call:** `docs/art-bible.md` owns arena style and components; all other UI is a separate track.
**Why:** The arena is the signature surface with its own schedule; platform UI is built separately.

## Bones are flat zIndex-sorted holders driven by worldTransforms (not ne
**Date:** 2026-10-25
**Call:** Bones are flat zIndex-sorted holders driven by worldTransforms (not nested Containers).
**Why:** art-bible z-order interleaves branches.

## Body resolved by skin.build from builds/<build>/; fighters/vex kept as
**Date:** 2026-10-25
**Call:** Body resolved by skin.build from builds/<build>/; fighters/vex kept as a byte-identical copy of heavy.
**Why:** tests and reference composites still read it.

## Podium handoff via window CustomEvent fc:podium + subscribePodium()
**Date:** 2026-10-25
**Call:** Podium handoff via window CustomEvent fc:podium + subscribePodium().
**Why:** ArenaCanvas signature is frozen.


## Pixel art on the existing rig (A-11)
**Date:** 2026-10-25
**Call:** Redraw parts as pixel art at the same pivots; 1 art px = 4 units; fighters render through a quarter-res nearest texture.
**Why:** Founder wanted pixel-art agents with no gameplay or wiring change; one shared pixel grid keeps rotated limbs crisp.

## Shading via derived palette placeholders
**Date:** 2026-10-25
**Call:** 12 ramp placeholders (light/shadow/deep per slot) filled by `ramp()`: warm highlights, violet shadows.
**Why:** Any SkinSpec (including Forge fighters) gets shaded pixel art without per-skin art.

## Jumbotron below the main platform
**Date:** 2026-10-25
**Call:** `JUMBO` sits bottom centre; nothing drawn over fighters may sit above a slot's feet (test enforced).
**Why:** The top jumbotron covered the floating fighters' heads, names and bubbles.
