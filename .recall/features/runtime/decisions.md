# runtime — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O4-local decisions here.
-->

## Replay demos through the real reducers
**Date:** 2026-10-25
**Call / why:** Demonstrates actual ledger/event flow while using fresh match IDs and preserving competitive history.

## Reject unavailable recordings explicitly
**Date:** 2026-10-25
**Call / why:** A missing golden recording must surface as fixture_unavailable, not masquerade as a real recorded match.

## Throttle authenticated BYO messages
**Date:** 2026-10-25
**Call / why:** Apply the configured 20/min boundary to authenticated per-match traffic to prevent message floods.

## Keep deterministic evaluation and final review
**Date:** 2026-10-25
**Call / why:** Markets settle from objective checks rather than an LLM judge; hidden code edge cases preserve VAR.

## Freeze external web data before betting
**Date:** 2026-10-25
**Call / why:** A committed source snapshot makes live-web scoring reproducible despite later web changes.

## Bound code in WebAssembly without native tools
**Date:** 2026-10-25
**Call / why:** Actual code challenges can run without granting the fighter host/filesystem/network capabilities.
