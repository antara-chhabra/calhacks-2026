# fighters — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O5-local decisions here.
-->

## Fail closed on native tools
**Date:** 2026-10-25
**Call / why:** The wrapper only sanitizes environment; without verified OS isolation, native filesystem and execution capabilities remain disabled.

## Use the user-approved Standard mapping for GLITCH/PIP
**Date:** 2026-10-25
**Call / why:** Their old configured choices were unavailable; the user explicitly chose the already-verified low-cost Standard mapping.

## Configure reasoning effort per fighter
**Date:** 2026-10-25
**Call / why:** QUILL low effort is a private runtime configuration used by the demonstrated real match, forwarded by the candidate/registry path.

## Keep public payloads explicit
**Date:** 2026-10-25
**Call / why:** Changing categories must not leak committed answer keys or hidden code tests to real fighters.

## Retain the transport key
**Date:** 2026-10-25
**Call / why:** Existing clients and tool schemas can submit other category answers without a breaking endpoint rename.
