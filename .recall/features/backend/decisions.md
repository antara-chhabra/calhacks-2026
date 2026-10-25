# backend — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O3-local decisions here.
-->

## Exclude demo/mock from competitive history
**Date:** 2026-10-25
**Call / why:** Only real non-demo results should change public ratings/card statistics.

## Serialize slot bytes explicitly
**Date:** 2026-10-25
**Call / why:** The SDK returns Uint8Array; JSON.stringify alone produces an object instead of the expected slot array.

## Keep refund arithmetic shared
**Date:** 2026-10-25
**Call / why:** Void/refund paths must conserve the same integer-cent ledger amounts as normal settlement.

## Add category rows without replacing integral storage
**Date:** 2026-10-25
**Call / why:** Preserves existing integral records and compatibility while enabling independent category progression.

## Read persisted category history on reconnect
**Date:** 2026-10-25
**Call / why:** Ratings and stats must not reset or mix categories when the runner restarts.
