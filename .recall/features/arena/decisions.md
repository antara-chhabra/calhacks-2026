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
