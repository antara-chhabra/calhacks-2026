# 2026-10-25 — runtime/verified-build-handoff

**Session ID:** 2026-10-25-dv1277-build-integration
**Repo state:** main @ b55297c, 0 dirty before memory dump; origin/main @ 152f694. Memory edits are the only new root changes. Implementation anchors: `ws/o4` @ `4797f33` (origin agrees).
**Assignment:** User confirmed splitting this build into workstream features. This is one logical session shared across six files.

## Goal

Implement honest original-timing demo playback through live reducers, enforce BYO limits, and verify match lifecycle with real ledger clients.

## What happened

- ws/o4 at 4797f33 is pushed and unmerged. Demo playback creates fresh IDs and replays original timing through live reducers, without recording competitive history.
- FC_MODE=demo and Director demos are wired by the planning/head branch. Missing golden recordings fail visibly with fixture_unavailable; no silent mock substitution.
- BYO submit/say authentication and per-match 20/min throttling are implemented; sandbox work directories resolve from repository root. Smoke CLI follows actual SDK shapes.
- Original-timing local demo smoke passed with 137 events, two ledger bettors, correct balances and no model sessions/history changes. Normal smoke passed at 174 events, six bets/two bettors.
- Final combined runner suite has 148 passing tests across runtime/fighters/head work. Director concurrency/cancel/kill-switch behavior verified using authenticated real HTTP calls.

## Files touched

### ws/o4 @ 4797f33

Compared with merge-base `b55297c` against origin/main; paths changed/read for implementation and verification:

- `apps/runner/src/http/admin.ts`
- `apps/runner/src/http/byo.ts`
- `apps/runner/src/match/byo-limit.test.ts`
- `apps/runner/src/match/demo.test.ts`
- `apps/runner/src/match/demo.ts`
- `apps/runner/src/match/index.ts`
- `apps/runner/src/match/lifecycle.ts`
- `apps/runner/src/match/run.ts`
- `docs/requests/O4.md`
- `docs/status/O4.md`
- `scripts/smoke.ts`

Memory inputs/edits: `.recall/tree.md`, `recent.md`, `project.md`, `config.md`; this feature’s `overview.md`, `decisions.md`, and this new session. HEAD rollup and PRD A2 read for integration context. Branch manifests record build source paths; ignored verification helpers/assemblies are local-only.

## Decisions made

- **Replay demos through the real reducers:** Demonstrates actual ledger/event flow while using fresh match IDs and preserving competitive history.
- **Reject unavailable recordings explicitly:** A missing golden recording must surface as fixture_unavailable, not masquerade as a real recorded match.
- **Throttle authenticated BYO messages:** Apply the configured 20/min boundary to authenticated per-match traffic to prevent message floods.

## Open threads at end of session

- [ ] Load community/BYO candidates and persisted history/Elo in the HEAD candidate source before claiming automatic community debut or restart-safe rotation.
- [ ] Run three consecutive unattended real season matches and restart recovery acceptance.
- [ ] Record genuine golden-var/upset/red-card fixtures; only mock-basic currently exists in fixtures/matches.
- [ ] Implement recompute --apply once a runner-only repair reducer exists.
- [ ] Validate an entire public HTTP BYO match after a public runner URL is available.

## Gotchas

- Season loop implementation exists; unattended real-season and restart acceptance remain incomplete.
- scripts/recompute.ts dry run works; --apply is deliberately unsupported until a suitable write reducer is added.
- Mock/demo histories must not advance candidate rotation or real season counters. Shared single-match locking lives in ws/head-integration.

## Related workstreams

- [planning/verified-build-handoff](../../planning/sessions/2026-10-25-verified-build-handoff.md)
- [platform/verified-build-handoff](../../platform/sessions/2026-10-25-verified-build-handoff.md)
- [backend/verified-build-handoff](../../backend/sessions/2026-10-25-verified-build-handoff.md)
- [fighters/verified-build-handoff](../../fighters/sessions/2026-10-25-verified-build-handoff.md)
- [ship/verified-build-handoff](../../ship/sessions/2026-10-25-verified-build-handoff.md)
