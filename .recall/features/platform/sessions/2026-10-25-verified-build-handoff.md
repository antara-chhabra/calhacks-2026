# 2026-10-25 — platform/verified-build-handoff

**Session ID:** 2026-10-25-dv1277-build-integration
**Repo state:** main @ b55297c, 0 dirty before memory dump; origin/main @ 152f694. Memory edits are the only new root changes. Implementation anchors: `ws/ui-integration` @ `3ce1301` (origin agrees).
**Assignment:** User confirmed splitting this build into workstream features. This is one logical session shared across six files.

## Goal

Finish live match routing, results choreography and audio controls against the real data layer.

## What happened

- Antara’s platform screens are present on origin/main; the original mock-dashboard-only recall state is obsolete.
- ws/ui-integration at 3ce1301 is pushed and unmerged. Match deep links wait for database hydration, and only known fixture names select replay mode. Poster labels reflect the selected match mode.
- MuteToggle is mounted in AppShell. Results controller remains mounted through live-to-settled and waits for the correct arena podium event.
- Result markets are filtered to the watched match; a regression covers multiple matches in the store.
- Final web suite: 246 passing tests; assembled typecheck/build pass. Brave cold load /match/real_mvnqmsz4/results showed correct standings, four scoped markets, LIVE, ledger disclosure and Provably fair success; mute toggle worked.

## Files touched

### ws/ui-integration @ 3ce1301

Compared with merge-base `152f694` against origin/main; paths changed/read for implementation and verification:

- `apps/web/src/ui/lobby/selectors.ts`
- `apps/web/src/ui/match/model.ts`
- `apps/web/src/ui/match/results.tsx`
- `apps/web/src/ui/match/screen.tsx`
- `apps/web/src/ui/shell/index.tsx`
- `apps/web/src/ui/widgets.tsx`
- `apps/web/test/ui-lobby.test.ts`
- `apps/web/test/ui-match.test.ts`
- `docs/status/O2.md`

Memory inputs/edits: `.recall/tree.md`, `recent.md`, `project.md`, `config.md`; this feature’s `overview.md`, `decisions.md`, and this new session. HEAD rollup and PRD A2 read for integration context. Branch manifests record build source paths; ignored verification helpers/assemblies are local-only.

## Decisions made

- **Wait for hydration before selecting a source:** A cold real-match URL must not fall back to a mock fixture before the database snapshot arrives.
- **Keep results handoff state mounted:** Unmounting the controller during live play loses podium timing and reveals settled results too early.
- **Scope result markets by match:** The global store contains multiple matches; settled results must not show unrelated markets.

## Open threads at end of session

- [ ] Fix jumbotron overlap with floating-slot name tags (coordinate with arena).
- [ ] Replace static Forge poses with an exported live arena preview (coordinate with arena).
- [ ] Validate public /m QR betting and settlement from a phone on cellular after deployment.
- [ ] Merge later when authorized and rerun routing/podium/results regressions on the merged build.

## Gotchas

- Hydration and genuine fixture availability are separate checks; do not silently substitute mock-basic for an unavailable recorded fixture.
- The first podium implementation revealed immediately because its controller mounted only after settlement; 62c8414 fixes that, and 3ce1301 adds market isolation.

## Related workstreams

- [planning/verified-build-handoff](../../planning/sessions/2026-10-25-verified-build-handoff.md)
- [backend/verified-build-handoff](../../backend/sessions/2026-10-25-verified-build-handoff.md)
- [runtime/verified-build-handoff](../../runtime/sessions/2026-10-25-verified-build-handoff.md)
- [fighters/verified-build-handoff](../../fighters/sessions/2026-10-25-verified-build-handoff.md)
- [ship/verified-build-handoff](../../ship/sessions/2026-10-25-verified-build-handoff.md)
