# 2026-10-25 — arena/arena-art-bible

**Session ID:** 2026-10-25-a1-setup  (main slice: `features/planning/sessions/2026-10-25-a1-money-keys-setup.md`)
**Repo state:** main @ 05a70df, 4 dirty (before commit)

## Goal
Think through the arena's UI components and art style and put them in their own document, apart from the rest of the UI.

## What happened
- Wrote `docs/art-bible.md`: style ("Saturday-morning platform fighter at dusk"), principles, arena palette tokens, shape language, 14 arena components with their event/cue inputs, motion rules, file layout, VEX as drawn reference, acceptance, and an explicit out-of-scope list.
- PRD FC-D-002 extended and FC-D-003 added to split arena from platform UI (ADR-026).

## Files touched
- `docs/art-bible.md` (new, 9 sections)

## Decisions made
- Arena art lives in `docs/art-bible.md` (O1); platform UI is a separate track.

## Open threads at end of session
- [ ] A-01: draw VEX against the bible; A-02 rig system

## Gotchas
- "Brawlhalla" is allowed in the bible as a style reference only, never in shipped copy.
