# ship — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O7-local decisions here.
-->

## Honest running stage log
**Date:** 2026-10-25
**Call:** `submission/figma-stage-log.md` is append-only and records non-Figma tools, rework, plan limits and the stop on Figma for UI.
**Why:** The Figma track judges "honest about friction" and repeatability; summaries are written from the log at G4.

## Design demo pages in submission/design
**Date:** 2026-10-25
**Call:** Demo HTML (pixel roster, old vector roster) lives in `submission/design/`.
**Why:** It is judging/demo material, which O7 owns.
