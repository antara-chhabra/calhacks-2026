# 2026-10-25 — planning/verified-build-handoff

**Session ID:** 2026-10-25-dv1277-build-integration
**Repo state:** main @ b55297c, 0 dirty before memory dump; origin/main @ 152f694. Memory edits are the only new root changes. Implementation anchors: `ws/o0-live` @ `7524320` (origin agrees); `ws/head-integration` @ `fa2c0ac` (origin agrees); `ws/spec-sync` @ `84e7d78` (origin agrees).
**Assignment:** User confirmed splitting this build into workstream features. This is one logical session shared across six files.

## Goal

Integrate and verify the remaining En Garde workstreams while preserving the user’s instruction to merge later.

## What happened

- DV1277 is HEAD after Antara’s handoff on origin/main at 152f694. Local main remains b55297c; none of this build’s branches were merged. All eight implementation branches are pushed; see the resume map below.
- Live data adapter, binding generation and runner subscription/serialization fixes are on ws/o0-live. Connected clients receive validated catch-up silently and then live cues, ledger odds/settlement, and Forge updates.
- ws/head-integration wires real Droid/direct/HTTP factories, effort configuration, shared live/demo/season concurrency guards, kill switch, Director demo/cancel controls, awaited shutdown and startup registration of all six house fighters.
- ws/spec-sync contains PRD v1.2.0 A2: actual React 19/Tailwind/KokonutUI stack, FundingAdapter, cents/seed units, event time bases, team entry and fail-closed native execution. Implementation remains unmerged; do not describe main as fully integrated.
- Ignored .arena/combined is a source-only assembly of origin/main plus branch snapshots, not a Git merge. Full assembled typecheck and production web build passed. Package suites: contracts 36, engine 80, web 246, runner 148, module 76 = 586 aggregate passing tests; a separate opt-in live adapter test also passed.
- Two independent live client identities verified shared odds/stakes, catch-up/live cues, real ledger settlement, Forge propagation and rejected browser credits. Normal runner boots stdb=ok and registers six house fighters. Authenticated Director HTTP checks: unavailable fixture 404, demo start 204, concurrent match 409, cancel 204 and slot release.
- Real local four-Droid match real_mvnqmsz4 has 80 gapless valid events, verified reveal, four submitting fighters, settlement and persisted Elo/history. VEX/SAGE/BRICK scored 150 each, QUILL 30. Browser cold results load verified correct standings, four matching markets, LIVE label, ledger disclosure and fair-check success.
- Private configuration: user approved verified Standard for GLITCH/PIP; all six house and both tier mappings available. QUILL low effort configured. No actual model values or secrets belong in memory. Source/bundle scan covered 278 files without private-value hits.

## Files touched

### ws/o0-live @ 7524320

Compared with merge-base `b55297c` against origin/main; paths changed/read for implementation and verification:

- `apps/runner/src/stdb.ts`
- `apps/web/src/data/README.md`
- `apps/web/src/data/live.ts`
- `apps/web/src/data/store.ts`
- `apps/web/test/data-live-integration.test.ts`
- `apps/web/test/data-live.test.ts`
- `docs/requests/HEAD.md`
- `scripts/gen-bindings.mjs`
### ws/head-integration @ fa2c0ac

Compared with merge-base `152f694` against origin/main; paths changed/read for implementation and verification:

- `apps/runner/src/candidates.ts`
- `apps/runner/src/control/director.ts`
- `apps/runner/src/env.ts`
- `apps/runner/src/fighters/registry.ts`
- `apps/runner/src/wiring.ts`
- `apps/runner/test/candidates.test.ts`
- `apps/runner/test/env.test.ts`
- `apps/runner/test/wiring.test.ts`
- `docs/status/HEAD.md`
### ws/spec-sync @ 84e7d78

Compared with merge-base `152f694` against origin/main; paths changed/read for implementation and verification:

- `docs/PRD.md`

Memory inputs/edits: `.recall/tree.md`, `recent.md`, `project.md`, `config.md`; this feature’s `overview.md`, `decisions.md`, and this new session. HEAD rollup and PRD A2 read for integration context. Branch manifests record build source paths; ignored verification helpers/assemblies are local-only.

## Decisions made

- **Keep all work unmerged:** The user explicitly said “We will merge everything later”; validation uses an ignored source assembly and does not alter main’s code.
- **Use nested worktrees and a source assembly:** Keep work under the authorized repository root; .arena/worktrees holds branches and .arena/combined holds disposable integration evidence.
- **Register the public house roster on runner startup:** All six configured fighters must exist publicly before rotation; fail startup if registration fails rather than running against an incomplete roster.
- **Use a shared active-match guard:** Director live/demo and season starts must not overlap; cancellation/shutdown must release the slot and await cleanup.
- **Model remap approved privately:** The user approved the verified Standard model for GLITCH/PIP; keep values only in ignored environment configuration.

## Open threads at end of session

- [ ] Community/BYO candidate loading and automatic debut/rotation; reload persisted candidate history/Elo after restart (apps/runner/src/candidates.ts still has database TODO).
- [ ] Run at least three unattended real season matches and restart recovery; capture real golden-var/upset/red-card recordings. Only mock-basic is currently a checked-in fixture.
- [ ] Maincloud/public deployment and QR /m betting/settlement from a phone on cellular.
- [ ] When the user authorizes merging: integrate branches, regenerate ignored bindings, and rerun final regression on the actual merged revision.
- [ ] Finish submission/media and remaining arena/Forge polish; recompute --apply needs a runner-only write reducer. Native execution stays disabled until verified OS containment exists.

## Gotchas

- Root main is older than origin/main. A clean root tree does not mean the build is absent: use the worktrees/branches below. Do not pull/merge as an automatic resume step; user postponed merges.
- .arena/combined contains links for root and nested workspace node_modules, ignored generated bindings and root .env. It is local-only and should be rebuilt from branch snapshots, not treated as the source of truth.
- .arena/assemble.py assembles snapshots; .arena/scan-assembled.mjs scans source/bundle for actual private values without printing them. Never copy .env contents into recall.
- Local services last observed: SpacetimeDB 127.0.0.1:3000, database fightcard-o3, data .arena/spacetime-local; runner admin/public 8787/8788; Vite 5179. Check liveness before relying on them; process session IDs are not durable.
- Historical HEAD status includes Antara-machine CLI blockers that are obsolete on DV1277’s machine. Read the final “DV1277 integration follow-up — verified, unmerged” section.
- The final full workspace test run had 585 tests before the last market-scope regression; the complete web suite was then rerun at 246. The 586 figure is the final aggregate package count, not a claim of a later single full-workspace run.
- Arena/integrations recall overviews predate this session and were not refreshed because this build did not own their source changes. origin/main/status are authoritative for Antara’s merged work.

## Related workstreams

- [platform/verified-build-handoff](../../platform/sessions/2026-10-25-verified-build-handoff.md)
- [backend/verified-build-handoff](../../backend/sessions/2026-10-25-verified-build-handoff.md)
- [runtime/verified-build-handoff](../../runtime/sessions/2026-10-25-verified-build-handoff.md)
- [fighters/verified-build-handoff](../../fighters/sessions/2026-10-25-verified-build-handoff.md)
- [ship/verified-build-handoff](../../ship/sessions/2026-10-25-verified-build-handoff.md)

## Resume map

- `ws/o0-live` @ `7524320` — `.arena/worktrees/fc-o0` (local and origin agree).
- `ws/head-integration` @ `fa2c0ac` — `.arena/worktrees/fc-head` (local and origin agree).
- `ws/spec-sync` @ `84e7d78` — `.arena/worktrees/fc-spec` (local and origin agree).
- `ws/ui-integration` @ `3ce1301` — `.arena/worktrees/fc-ui` (local and origin agree).
- `ws/o3` @ `fcdf90c` — `.arena/worktrees/fc-o3` (local and origin agree).
- `ws/o4` @ `4797f33` — `.arena/worktrees/fc-o4` (local and origin agree).
- `ws/o5` @ `068ef41` — `.arena/worktrees/fc-o5` (local and origin agree).
- `ws/o7` @ `6d099d3` — `.arena/worktrees/fc-o7` (local and origin agree).

Read this feature’s overview first; source truth remains each branch and the HEAD status final rollup. The source assembly is disposable. User approval to merge has not been given.
