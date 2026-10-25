# backend

**Status:** active
**Paths:** `spacetime/**`, `docs/status/O3.md`, `docs/requests/O3.md`
**Last touched:** 2026-10-25

## What this is
Workstream O3 of the Fight Card build. SpacetimeDB 2.x TypeScript module: tables, reducers, scheduled auto_lock, atomic parimutuel settlement (§8.8). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- Module B-01…B-05 is written and merged (76 pure-logic tests), **never published** — the `spacetime` CLI is only on DV1277's machine (lane A in the handoff).

## Open threads
- [ ] DV1277 lane A: first publish (K-08), fix build errors, B-06 auth matrix + Maincloud runbook
- [ ] Possible spacetime.json / entry config for SDK 2.13
- [ ] config.moneyMode column if live mode ever matters
- [ ] A runner-only reducer to write fighter_stats/elo for recompute --apply

## Key files
- `docs/PRD.md` §17.6 (O3 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-module-reducers — B-01…B-05 written, typechecked only; publish is DV1277 lane A
