# 2026-10-25 — runtime/challenge-categories

**Session ID:** 2026-10-25-a3-challenge-build
**Repo state:** dump written on main @638e598,22 dirty memory status entries before dump; implementation ws/challenges @6a3b1d2,0 dirty and origin agrees. No code merge has occurred at dump time.
**Assignment:** Uses the user-confirmed workstream split from the preceding recall dump. The user now authorized merging after saving memory.

## Goal

Save the completed A3 challenge build and its evidence before the authorized merge into main.

## What happened

- A3 dispatches generation, live checks and final checks by category while preserving the existing integral verifier and match lifecycle.
- Seeded exact challenges cover arithmetic, logic, movement/capture chess puzzles, trivia and squad reasoning. Code submits actual pure JavaScript functions; three live checks versus12 hidden final cases can cause VAR overturns.
- QuickJS WebAssembly runs each code case in a fresh VM (8MiB heap,512KiB stack,100ms interrupt) with no host bindings. Tests reject hangs, memory pressure, process/require/fetch attempts, async/non-JSON output, serializer tampering and excessive nesting. Native Droid execution remains disabled.
- Live Web fetches a fresh fixed official HN API snapshot before betting, with redirects rejected,5s abort, streaming byte caps and field validation. Escaped source data is committed and sent to fighters; URL comparison preserves case. Fetch failure returns503 challenge_unavailable before creating a market and frees the active slot.
- Squads add a team_winner market from final combined points. Ties use earlier last surviving hit, fewer misses, then TeamA. Engine targeting excludes teammates. Per-category history is used for settlement.
- Runner179 tests pass; full-match tests cover all8 categories, public/private boundary, code overturns and source failure. Seven genuine new-category Droid matches settled; match IDs are in planning session and HEAD status.

## Files touched

Branch diff against main638e598 (routed slice; full set71 paths):

- `apps/runner/src/http/admin.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/match/io.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/match/markets.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/match/run.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/match/settle.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/match/types.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/problems/check.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/problems/code.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/problems/code.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/problems/generator.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/problems/web.ts` — A3 implementation/evidence reviewed.
- `apps/runner/test/challenges-lifecycle.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/test/http-admin.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/test/problems-categories.test.ts` — A3 implementation/evidence reviewed.
- `docs/status/O4.md` — A3 implementation/evidence reviewed.
- `scripts/smoke-challenges.ts` — A3 implementation/evidence reviewed.

Memory evidence read: `.recall/{tree,recent,project,config}.md`, this feature’s overview, `AGENTS.md`, challenge HEAD rollup and recall template. This dump updates the feature overview/decisions and adds this session; L1 is updated across the split.

## Decisions made

- **Keep deterministic evaluation and final review:** Markets settle from objective checks rather than an LLM judge; hidden code edge cases preserve VAR.
- **Freeze external web data before betting:** A committed source snapshot makes live-web scoring reproducible despite later web changes.
- **Bound code in WebAssembly without native tools:** Actual code challenges can run without granting the fighter host/filesystem/network capabilities.

## Open threads at end of session

- [ ] Run sustained automatic multi-category season and restart recovery acceptance; community candidate/rotation loading remains incomplete.
- [ ] Record genuine golden-var/upset/red-card fixtures; only mock-basic is checked in.
- [ ] recompute --apply remains unsupported until its repair reducer exists.

## Gotchas

- This session is the pre-merge snapshot. Future merge completion/regression is recorded in L1/current overviews; do not treat “pending merge” here as newer than those summaries.
- `.env`, generated module_bindings and `.arena/` helpers/identities/results are ignored; never print or commit private values.
- Local challenge preview last observed on web5182, admin/public8791/8792, database fightcard-challenges on port3000. Verify liveness; automatic season is OFF.
- A3 is not a Maincloud/public deployment. The independent ws/personas branch and its serving processes must not be overwritten.

## Related workstreams

[planning](../../planning/sessions/2026-10-25-challenge-categories.md), [platform](../../platform/sessions/2026-10-25-challenge-categories.md), [backend](../../backend/sessions/2026-10-25-challenge-categories.md), [fighters](../../fighters/sessions/2026-10-25-challenge-categories.md), [ship](../../ship/sessions/2026-10-25-challenge-categories.md)
