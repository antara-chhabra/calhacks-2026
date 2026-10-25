# arena

**Status:** active
**Paths:** `apps/web/src/arena/**`, `apps/web/public/art/**`, `docs/art-bible.md`, `docs/status/O1.md`, `docs/requests/O1.md`
**Last touched:** 2026-10-25

## What this is
Workstream O1 of the Fight Card build. Pixi v8 arena: pixel-art cut-out rigs (SVG parts), GSAP clips, cue player, VFX, FighterPortrait (E07, FC-F-130). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- O1 A-01…A-09 on `main`. **A-11 pixel-art fighters** on branch `ws/pixel-fighters` (8c8fa66, pushed, awaiting DV1277 merge): every part redrawn as pixel art (1 art px = 4 units) on the unchanged skeleton/poses/clips; 4-shade palette ramps (`palette.ts` `ramp`, `RAMP_PLACEHOLDERS`); pixel parts rasterised nearest (`rig.ts`); rigs render through a 480x270 nearest render texture (`ArenaCanvas.tsx`, `ART_PIXEL`).
- Jumbotron moved to bottom centre under the main platform (`JUMBO` in `stage/layout.ts`); nothing overlaps the fighters any more.
- Art source + exporter: `apps/web/src/arena/dev/pixel-art/` (art bible §7.5). Verified on /replay/mock-basic; 173 arena tests, 589 total green.

## Open threads
- [ ] DV1277 merges ws/pixel-fighters
- [ ] Match screen (O2) should listen to fc:podium to reveal results
- [ ] Match page arena ~1/3 size → 1 art px ≈ 1.3 screen px; snap to an integer scale?
- [ ] public/art/reference/vex-*.svg still vector (history only)
- [ ] A-10 parallax/crowd + perf pass (≥55 fps p95)
- [ ] Forge needs an arena preview export for real idle/slashHeavy clips
- [ ] fighters/vex can be deleted once tests/reference point at builds/heavy

## Key files
- `docs/PRD.md` §17.6 (O1 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-pixel-fighters — pixel-art redesign approved and built; jumbotron moved off the fighters [deep]
- 2026-10-25-arena-build — A-01…A-09 via sub-agents; full fight plays on /replay/mock-basic
- 2026-10-25-arena-art-bible — wrote docs/art-bible.md
