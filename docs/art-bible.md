# En Garde — Arena Art Bible

Owner: O1 (arena). Source of truth for the arena only. Requirement IDs: FC-D-002, FC-D-003, FC-F-120–125, -128, -130. Decision: ADR-026.
Everything outside the arena canvas (lobby, bet slip, cards screens, Forge UI, mobile page) is a separate UI track and is not specified here.

Style reference (this file only, never shipped copy): the flat-vector platform-fighter look popularised by Brawlhalla. We borrow the style, never assets, names, logos, fonts or sounds.

## 1. Style in one paragraph

**"Saturday-morning platform fighter at dusk."** Chunky flat-vector fighters with thick dark outlines, oversized swords and big readable faces, standing on floating stone platforms above a violet-to-orange sky. Characters are loud and saturated; the world behind them is cooler, lower in contrast and softly gradient, so a fighter is always the brightest thing on screen. Motion is snappy: short anticipation, a hard release, a long settle. Every hit gets a spark, a screen-space punch and a sound within the same frame.

## 2. Principles

1. **Readable at 120 px.** Each fighter is identifiable as a black silhouette: distinct head shape, weapon and build.
2. **Fighters pop, world recedes.** Backgrounds are cooler and ~30% lower contrast than any character.
3. **Truth over spectacle.** Visuals dramatise verified events. A hit shows only when `verdict.live{ok:true}` exists; an overturn visibly un-does it (VAR). Never animate an outcome the log does not contain.
4. **Identity colour only.** A fighter's colour marks who they are (plate, trail, name tag). Green/red/amber are reserved for verdicts and referee cards.
5. **Motion has a budget.** 60 fps on a 2021 laptop with 4 fighters, crowd and VFX; reduced-motion swaps shakes and flashes for fades and static poses.
6. **Cheap new fighters.** One skeleton, skins as data. A new fighter is a palette, a head, a weapon and an emblem, not new drawings.

## 3. Palette and tokens (arena)

| Token | Value | Use |
|---|---|---|
| `--outline` | `#14121F` | Every closed shape, 4 px at 1× |
| `--sky-top` | `#2B1B5A` | Sky gradient top |
| `--sky-horizon` | `#FF8A5B` | Sky gradient bottom |
| `--cloud-far` | `#6C5BA8` @ 60% | Far clouds |
| `--cloud-near` | `#F3C9B5` @ 85% | Foreground clouds |
| `--stone-lit` | `#8F86A8` | Platform top |
| `--stone-shade` | `#4A4466` | Platform side and underside |
| `--gold` | `#F2C14E` | Jumbotron trim, victory sparks, EN GARDE banner |
| `--ok` / `--bad` / `--warn` | `#2EC4A6` / `#E5383B` / `#F2C14E` | Verdicts and cards only |

Fighter palettes live in `HOUSE_ROSTER` (`packages/contracts/src/roster.ts`). Characters use flat fills plus one hard shadow shape (fill darkened 25%, multiply) on the side away from the top-left key light, and one small white highlight (35%) on helmets and blades. No gradients on characters.

## 4. Shape language (normative)

| Rule | Spec |
|---|---|
| Outline | 4 px at 1×, round joins, scale with the part |
| Proportions | Head ≈ 1/4.5 height; wide torso and shoulders; oversized hands and forearms; short legs; chunky feet |
| Height on stage | 300 units (heavy 320, lean 285) |
| Weapons | 1.1–1.4× fighter height; greatsword longest, wooden sword shortest; one blade highlight stripe |
| Faces | Big eyes (white sclera, black pupils), heavy brows; five swappable expressions: neutral, focus, smug, hurt, ko |
| Emblems | Stamped on shield or pauldron; one per fighter; flat, two colours max |

## 5. Arena components

Build order and time boxes follow tasks A-01 → A-10 in the PRD. Each component names its inputs from the event log or cue stream, so it can be built against the `mock-basic` fixture with no network.

| # | Component | What it is | Driven by | Notes |
|---|---|---|---|---|
| 1 | **Stage** | 1920×1080 logical canvas: sky, far clouds, colosseum ring silhouette, server-pillar glow, crowd row, four platform slots, foreground clouds, KO blast zones | static + parallax (0.15 / 0.3 / 0.5 / 1.2) | Slot feet anchors in PRD §10.6; letterbox to fit |
| 2 | **Platforms** | Main platform (slots 1, 2) and two floats (slots 0, 3), stone with hanging chains | static | Underside art doubles as a bounce surface for knockback clips |
| 3 | **Jumbotron** | Match number, five problem gems, clock, hand-drawn EN GARDE banner | `match.*`, `verdict.*` | Gems show stars and points only until reveal |
| 4 | **Crowd** | Row of bobbing silhouettes, reacts to hits, overturns, KOs | cues | Cheap: 3 sprite poses, tinted |
| 5 | **Fighter rig** | One skeleton: hips root, torso, head, two arms (back arm 20% darker), two legs, weapon socket | `FighterPublic.skin` | Parts as SVG rasterised at 2×, recoloured by placeholder fills (`#FF00FF`, `#00FFFF`, `#FFFF00`, `#FFAA88`) |
| 6 | **Weapon library** | greatsword, katana, sawblade, rapier, cleaver, wooden_sword | skin | Grip at the file's `data-socket` |
| 7 | **Head and emblem libraries** | Eight heads/helmets, eight emblems | skin | Drawn over `head.svg` and torso anchor |
| 8 | **Clip set** | idle, think, toolUse, dash, slashLight/Heavy, special, whiff, counter, hitReact, knockback, stagger, koBlast, victory, taunt, dropIn, cardReact | cue player | GSAP timelines, parameterised by `{power, facing, archetype}` |
| 9 | **In-canvas labels** | Name tag, damage-style score %, speech bubble (always shows, doubles as caption), problem-solved pips | state + `fighter.taunt` | Bubble ≤ 80 chars; text rendered as text, never HTML from a fighter |
| 10 | **VFX kit** | Hit spark, slash trail (fighter colour), whiff dust, dash streak, KO blast ring, victory confetti, VAR scan-line | cues | Pool and reuse; cap particles at 200 |
| 11 | **Referee drone** | Whistle-bot that flies in for yellow/red cards and the VAR | `referee.*`, `verdict.final` | Card held up in `--warn` / `--bad` |
| 12 | **VAR overlay** | Freeze, desaturate the stage, scan line over the disputed hit, then reverse or confirm | `verdict.final` | The signature moment: must read from the back of a room |
| 13 | **Camera** | Slow zoom to midpoint, hit-stop (60–90 ms), shake on KO and overturn | cues | All three disabled under reduced motion |
| 14 | **Portrait renderer** | `<FighterPortrait/>`: static SVG of any skin in any pose | skin + pose | Shared with cards and the Forge preview |

## 6. Motion rules

- Anticipation 80–140 ms, release 60–100 ms, settle 200–400 ms. Heavier archetypes lengthen anticipation, speedsters shorten all durations ×0.8.
- Hit-stop on every confirmed hit: freeze both fighters 60 ms, then release into `hitReact`.
- Squash and stretch only on `dropIn`, `dash` landing and `koBlast`.
- One thing animates per beat: when the VAR overlay plays, crowd and clouds pause.
- Reduced motion: no shake, no hit-stop zoom, no flashes; clips become 2-pose swaps; the VAR shows a static strike-through and a label.

## 7. Files and formats

| Path | Contents |
|---|---|
| `apps/web/public/art/builds/<build>/` | Body templates `lean`, `standard`, `heavy` (A-03b): `parts.json` + `torso`, `upperArm`, `forearm`, `hand`, `thigh`, `shin`, `foot`. Skins resolve their body by `skin.build`, never by fighter id. |
| `apps/web/public/art/builds/common/` | `head.svg` and the 15 expression parts, shared by every build (referenced as `../common/...` in each `parts.json`) |
| `apps/web/public/art/fighters/vex/` | A-01 original of the heavy template, kept for the reference composites; `builds/heavy` is identical and is what the rig loads |
| `apps/web/public/art/weapons/`, `heads/`, `emblems/` | Shared libraries, SVG, sockets declared as `data-*` attributes |
| `apps/web/public/art/stage/` | Layered sky, clouds, ring, crowd, platforms (SVG; backdrop painting may be raster) |
| `apps/web/public/art/vfx/` | Spark, trail, dust, confetti sprites |
| `apps/web/src/arena/**` | Pixi scene, rig, clips, cue player |

Generated art (image models) is allowed only for the stage backdrop painting, poster backgrounds and Devpost art. Fighters, animation, labels and cards are SVG and code.

### 7.1 Part conventions (recorded in A-01, VEX)

- **Origin = pivot.** Every part SVG places its pivot at the SVG origin (0,0); the `viewBox` starts at negative coordinates. Anchor in Pixi = `-viewBox.x / width, -viewBox.y / height`. Rig space: px at 1×, y down, +x is facing, feet midpoint = (0,0), rotation in degrees clockwise.
- **Manifest.** `fighters/<skinKey>/parts.json` lists each part's `viewBox`/`pivot`/`anchors`, every rig node (`id`, `part`, `parent`, `pos` in the parent's space, `z`, `tint`) and three reference poses. Part names follow PRD §10.7; `eyes|mouth|brows` resolve to `<part>-<expression>.svg`.
- **Placeholders.** Exactly four fills, upper-case, whole-token, case-sensitive string replace: `#FF00FF` primary, `#00FFFF` secondary, `#FFFF00` accent, `#FFAA88` skin. They appear only as `fill` values, never in comments or ids. Fixed (never substituted): outline `#14121F`, white `#FFFFFF`, blade steel `#C9CEDB`, KO tongue `#FF6F7D`.
- **Shading is palette-independent.** Hard shadow = `#14121F` at `fill-opacity` 0.25, clipped to the part; highlight = `#FFFFFF` at 0.35 (helm and blade only). Back arm and leg nodes (`tint: back`) multiply the four substituted colours by 0.8.
- **Strokes.** 4 px, round joins, on every closed shape; facial features and emblem details use 3 px (they are small and scale with the part).
- **Stage size.** Heavy build is 320 units to the helm top (horn tips about +12). Greatsword is 440 units long (1.375x). Head about 71 units (1/4.5).
- **Z-order (back to front).** footB, shinB, thighB, upperArmB, forearmB, handB, footF, shinF, thighF, torso, emblem, head, helm, eyes, mouth, brows, upperArmF, forearmF, weapon, handF (the fist wraps the grip).
- **Slots.** Weapon `data-socket="0,0"` is the grip centre, blade along -y; the rig sets weapon rotation so the blade reaches a wanted world angle. Helm is drawn over `head.svg` at the same pivot; emblem is placed at the torso's `data-emblem` anchor.
- **Reference evidence.** `public/art/reference/vex-{idle,attack,ko}.svg`, PNGs in `docs/status/img/A-01-vex-*.png`.

## 7.5 Pixel-art parts (A-11, 2026-10-25)

The fighters are now pixel art. The skeleton, pivots, node positions, poses, clips and z-order are unchanged; only the part art and how the arena draws it changed.

- **Grid.** 1 art pixel = 4 rig units = 4 stage px. Every part SVG is `<rect>` runs on the 4-unit grid with `shape-rendering="crispEdges"` and carries `data-pixel="4"`; viewBoxes sit on the grid.
- **Rendering.** `rig.ts` rasterises a `data-pixel` part at one texel per art pixel with nearest sampling. `ArenaCanvas.tsx` draws the rigs into a 480×270 render texture and upscales it 4× with nearest sampling, so rotated limbs land on one shared pixel grid. Stage, VFX and labels stay full resolution.
- **Colour.** Each palette slot has a 4-shade ramp: base (`#FF00FF`, `#00FFFF`, `#FFFF00`, `#FFAA88`) plus light / shadow / deep placeholders (`palette.ts` `RAMP_PLACEHOLDERS`). `ramp()` derives them from the skin colour: highlights shift warm (sunset), shadows shift violet (the arena sky). Fixed colours: outline `#14121F`, steel `#EEF3FA` / `#A9B3C8` / `#626B86` / `#3B4058`, wood `#B9824A` / `#7E522E` / `#4E2F1C`, gold `#F7CF5A` / `#B5802C`, cloth white `#F7F1E3` / `#C9C1D8`, mouth `#C2364E` / `#6E1C30`.
- **Style rules** (after Innkeep's "Eight ways to improve your pixel art"): the face is the brightest area, with a dark band under the chin; helmets stop at the brow line (great helm shows the eyes through its visor slit and the mouth through its grille); few colours per part, clean clusters; folds on the tunic and skirt; 1 px outline per part.
- **Source.** `apps/web/src/arena/dev/pixel-art/pixel.js` draws every part; `export.mjs` writes the SVGs and updates only the `viewBox` of each part in the `parts.json` manifests: `node apps/web/src/arena/dev/pixel-art/export.mjs $PWD/apps/web/public/art`. Demo sheets: `submission/design/pixel-roster-uiux-demo.html` (pixel) and `submission/design/ui-ux-old.html` (the earlier vector art).

## 8. Reference and acceptance

- **Drawn reference: VEX** (heavy brawler, horned helm, greatsword, skull emblem). Draw him fully first; every other fighter inherits his template.
- Silhouette test: all six house fighters distinguishable as black shapes at 120 px.
- A fixture replay (`/replay/mock-basic`) plays through the stage with all clips firing in the right order and no console errors.
- 60 fps on a 2021 laptop with four fighters and the VFX cap.
- Reduced-motion mode passes the checklist in §6.

## 9. Out of scope here

Lobby, match HUD outside the canvas, bet slip, cards screens, Forge UI, mobile `/m`, onboarding and every other platform surface. Those are specified and built on the separate UI track. The arena only exposes its canvas, the `<FighterPortrait/>` renderer and the cue stream.
