# 2026-10-25 — ship/design-demo-pages

**Session ID:** S-2026-10-25-pixel-fighters  (split dump: arena/pixel-fighters + ship)
**Repo state:** ws/pixel-fighters @ 0911654, 0 dirty (pushed). Dump on branch recall/antara-pixel-fighters.

## Goal
Keep the pixel-roster review page as a demo asset and archive the earlier vector art as a page.

## What happened
- `submission/design/pixel-roster-uiux-demo.html`: standalone copy of the approved review page (live renders: animated swing, poses, expressions, colour ramps). Same content as the artifact https://claude.ai/artifact/TTJrVKBxjs8AD9o6iatyWS (private; share from its menu).
- `submission/design/ui-ux-old.html`: no "ui-ux-old" file existed; built it from the vector fighters at 638e598 using the arena's own `composePortrait` (hero, idle, victory, ko per fighter). Founder may have meant another file — unconfirmed.
- Committed as 0911654 [D-07] on ws/pixel-fighters.

## Files touched
- submission/design/pixel-roster-uiux-demo.html — pixel roster demo
- submission/design/ui-ux-old.html — vector roster archive

## Decisions made
- Demo pages live in `submission/design/` (O7 path; demo material for judging).

## Open threads at end of session
- [ ] Confirm `ui-ux-old.html` is what the founder meant
- [ ] Use the pixel roster page in the pitch/demo video

## Gotchas
- The pixel demo inlines its renderer (~50 KB); regenerate it from `apps/web/src/arena/dev/pixel-art/pixel.js` if the art changes.
