# backend — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O3-local decisions here.
-->

## appendEvent is the only writer of fight_event; applyLedger the only wr
**Date:** 2026-10-25
**Call:** appendEvent is the only writer of fight_event; applyLedger the only writer of balances.
**Why:** gapless seq and auditable money.

## Views are public (SDK 2.13 requires it) and filter on ctx.sender
**Date:** 2026-10-25
**Call:** Views are public (SDK 2.13 requires it) and filter on ctx.sender.
**Why:** SDK constraint.

## Module does not import @fc/contracts/zod; runner validates with parseR
**Date:** 2026-10-25
**Call:** Module does not import @fc/contracts/zod; runner validates with parseRunnerPostable before posting.
**Why:** unknown bundling of workspace packages.

