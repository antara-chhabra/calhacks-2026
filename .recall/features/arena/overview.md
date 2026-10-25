# arena

**Status:** active
**Paths:** `apps/web/src/arena/**`, `apps/web/public/art/**`, `docs/art-bible.md`, `docs/status/O1.md`, `docs/requests/O1.md`
**Last touched:** 2026-10-25

## What this is
Workstream O1 of the Fight Card build. Pixi v8 arena: SVG cut-out rigs, GSAP clips, cue player, VFX, FighterPortrait (E07, FC-F-130). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- O1 is built through A-09 and merged on `main`: 6 house fighters (3 builds, 8 heads, 6 weapons, 8 emblems), Sky Colosseum stage + jumbotron, 17 clips, cue player, VFX, in-canvas labels, intro/outro with podium handoff, reduced motion. 170 arena tests.
- `/replay/mock-basic` plays a full fight with no console errors (verified in the browser pane).
- Remaining: A-10 (parallax, crowd, perf), a few layout nits.

## Open threads
- [ ] Match screen (O2) should listen to fc:podium to reveal results
- [ ] Jumbotron covers name tags on floating slots 0 and 3
- [ ] A-10 parallax/crowd + perf pass (≥55 fps p95)
- [ ] Forge needs an arena preview export for real idle/slashHeavy clips
- [ ] fighters/vex can be deleted once tests/reference point at builds/heavy

## Key files
- `docs/PRD.md` §17.6 (O1 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-arena-build — A-01…A-09 via sub-agents; full fight plays on /replay/mock-basic
- 2026-10-25-arena-art-bible — wrote docs/art-bible.md
