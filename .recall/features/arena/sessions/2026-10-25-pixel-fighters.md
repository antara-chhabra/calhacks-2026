# 2026-10-25 — arena/pixel-fighters

**Session ID:** S-2026-10-25-pixel-fighters  (split dump: arena + ship/design-demo-pages)
**Repo state:** ws/pixel-fighters @ 0911654, 0 dirty (pushed to origin; based on main 638e598). Dump on branch recall/antara-pixel-fighters.

## Goal
Arena + UI polish: redraw the fighters as pixel art without touching gameplay or wiring, and stop the scoreboard from overlapping the fighters.

## What happened
- Pulled main (+26 commits from DV1277's lanes; now 638e598). Found the jumbotron (top band, 380..1540 x 120..260) covering heads, names, damage % and bubbles of the floating-slot fighters (slots 0 and 3).
- Read the founder's reference (innkeepgame.com "Eight ways to improve your pixel art"; the Browser pane blocks that site, WebFetch worked): contrast, bright face + dark neck, hue-shifted ramps, few colours/clusters, contrapposto, angled feet, folds, confident pose.
- Built a draft part library (scratch `pixel.js`: painter with directional shading + 1 px outline) that draws every rig part on a 4-unit grid, composed on the real skeleton/poses at native res with nearest sampling. First pass hid faces under helmets and heads were small; second pass: chibi 22 px head, two-eyed 3/4 faces, helmets cleared below the brow line, chest/skirt folds; per-fighter touches on the helm layer (VEX goatee, QUILL moustache, PIP freckles).
- Founder reviewed the draft artifact (https://claude.ai/artifact/TTJrVKBxjs8AD9o6iatyWS) and approved.
- Build: exporter writes 59 pixel SVGs (3 builds, common head + 15 faces, 8 heads incl. crown/hood, 6 weapons, 8 emblems incl. eye/flame) and edits only part viewBoxes in the 4 parts.json files; fighters/vex stays a byte copy of heavy.
- `palette.ts`: `RAMP_PLACEHOLDERS` + `ramp()` (light/shadow/deep per slot, warm highlights, violet shadows). `rig.ts`: `pixelSize()`; `data-pixel` parts rasterise at 1 texel per art px, nearest. `ArenaCanvas.tsx`: rigs live in an off-stage container rendered each tick into a 480x270 RenderTexture (nearest), shown as a 4x Sprite in `stage.fighters`.
- Jumbotron moved to `JUMBO = {x:600,y:922,w:720,h:132}` (bottom centre under the main platform) in `stage/layout.ts`; Stage.ts lays out gems/clock/banner relative to it.
- Verified: /replay/mock-basic full fight (no console errors), fighter card + leaderboard portraits. typecheck clean, 589 tests green, scan clean. Commits 8c8fa66 [A-11], 0911654 [D-07]; branch pushed for DV1277.

## Files touched
- apps/web/public/art/** — all fighter part SVGs regenerated as pixel art; parts.json viewBoxes only
- apps/web/src/arena/palette.ts — ramp tokens + `ramp()`
- apps/web/src/arena/rig.ts — pixel rasterise path (`pixelSize`, nearest)
- apps/web/src/arena/ArenaCanvas.tsx — quarter-res fighters render texture (`ART_PIXEL = 4`)
- apps/web/src/arena/stage/layout.ts, stage/Stage.ts — `JUMBO` + relocated jumbotron
- apps/web/src/arena/dev/pixel-art/{pixel.js,export.mjs} — art source + exporter
- apps/web/test/arena-{assets,palette,stage}.test.ts — katana viewBox on 4-grid, pixel fixed colours allowed for weapons, ramp tests, jumbotron-clear test
- docs/art-bible.md §7.5, docs/status/O1.md (A-11)

## Decisions made
- Pixel art keeps the cut-out rig: parts are redrawn at the same pivots; clips/poses/manifest nodes untouched (founder: no gameplay or wiring change).
- 1 art pixel = 4 units = 4 stage px; viewBoxes on the 4-unit grid; fighters render through a quarter-res nearest texture so rotated limbs share one pixel grid.
- Shading comes from 12 extra palette placeholders derived by `ramp()`, not from per-skin art, so any SkinSpec (Forge) gets shaded pixel art.
- Jumbotron lives below the main platform; nothing that draws over fighters may sit above a slot's feet.

## Open threads at end of session
- [ ] DV1277 to merge ws/pixel-fighters (pushed; no PR opened)
- [ ] Match page shows the arena at ~1/3 size, so 1 art px ≈ 1.3 screen px (uneven); consider snapping the canvas to an integer art-pixel scale
- [ ] public/art/reference/vex-*.svg are still the old vector composites
- [ ] Top speech bubbles of floating fighters can clip at the stage's top edge (pre-existing)

## Gotchas
- `rm` is aliased to interactive in the user's shell: use `command rm -f`.
- The Browser pane serves launch configs from `~/calhacks/.claude/launch.json` (workspace root), not the repo; a python static server there was unreachable, so drafts were served via a temp symlink under apps/web/public (removed before commit).
- Pixi v8 `renderer.render({container, target, transform})` ignores the container's own transform when `transform` is given; the container must stay off-stage or it draws twice.
- Leaderboard logs a nested `<a>` hydration warning (platform code, pre-existing).
