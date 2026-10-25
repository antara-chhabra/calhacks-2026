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

## Keep submission claims evidence-based
**Date:** 2026-10-25
**Call / why:** Drafts must distinguish real/local evidence from pending public deployment and optional sponsor integrations.

## Leave submission and publication pending
**Date:** 2026-10-25
**Call / why:** This build prepared reviewable artifacts; it did not submit Devpost or publish the web app.

## Describe the implemented challenge boundaries accurately
**Date:** 2026-10-25
**Call / why:** Expose every mode without claiming full chess games, native sandboxing or a public A3 cutover that has not happened.
