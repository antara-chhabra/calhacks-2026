# runtime

**Status:** active
**Paths:** `apps/runner/src/match/**`, `apps/runner/src/problems/**`, `apps/runner/src/season/**`, `apps/runner/src/http/admin.ts`, `apps/runner/src/http/byo.ts`, `scripts/smoke.ts`, `scripts/record.ts`, `scripts/recompute.ts`, `scripts/try-problems.ts`, `docs/status/O4.md`, `docs/requests/O4.md`
**Last touched:** 2026-10-25

## What this is
Workstream O4 of the En Garde build. Runner match runtime: integral generator + mathjs whitelist verifier, match lifecycle, FighterIO, VAR, commit-reveal, season loop, admin/BYO HTTP. Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state

- A3 challenge implementation is now merged into main at6f90ac8; merged-main typecheck,624 tests and production build pass. The pre-merge session remains historical evidence.
- A3 dispatches generation, live checks and final checks by category while preserving the existing integral verifier and match lifecycle.
- Seeded exact challenges cover arithmetic, logic, movement/capture chess puzzles, trivia and squad reasoning. Code submits actual pure JavaScript functions; three live checks versus12 hidden final cases can cause VAR overturns.
- QuickJS WebAssembly runs each code case in a fresh VM (8MiB heap,512KiB stack,100ms interrupt) with no host bindings. Tests reject hangs, memory pressure, process/require/fetch attempts, async/non-JSON output, serializer tampering and excessive nesting. Native Droid execution remains disabled.
- Live Web fetches a fresh fixed official HN API snapshot before betting, with redirects rejected,5s abort, streaming byte caps and field validation. Escaped source data is committed and sent to fighters; URL comparison preserves case. Fetch failure returns503 challenge_unavailable before creating a market and frees the active slot.
- Squads add a team_winner market from final combined points. Ties use earlier last surviving hit, fewer misses, then TeamA. Engine targeting excludes teammates. Per-category history is used for settlement.
- Runner179 tests pass; full-match tests cover all8 categories, public/private boundary, code overturns and source failure. Seven genuine new-category Droid matches settled; match IDs are in planning session and HEAD status.

## Open threads

- [ ] Run sustained automatic multi-category season and restart recovery acceptance; community candidate/rotation loading remains incomplete.
- [ ] Record genuine golden-var/upset/red-card fixtures; only mock-basic is checked in.
- [ ] recompute --apply remains unsupported until its repair reducer exists.

## Key files

- apps/runner/src/problems/{generator,check,code,web}.ts — category generation/scoring.
- apps/runner/src/match/{run,io,markets,settle}.ts — shared flow and category payloads.
- scripts/smoke-challenges.ts — all-category actual-database smoke.

## Recent sessions

- [2026-10-25-challenge-categories](sessions/2026-10-25-challenge-categories.md) — A3 challenge build, real evidence and pre-merge handoff [deep]
- [2026-10-25-verified-build-handoff](sessions/2026-10-25-verified-build-handoff.md) — verified build, unmerged branch evidence and remaining work [deep]
