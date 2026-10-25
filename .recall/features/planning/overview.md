# planning

**Status:** active
**Paths:** `docs/PRD.md`, `docs/{status,requests}/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring,candidates}.ts`, `apps/runner/src/control/**`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, root configs
**Last touched:** 2026-10-25

## What this is
The PRD and the HEAD orchestrator (O0) domain: product scope, contracts, the pure engine (reducer, cues, parimutuel, Elo, stats, commit-reveal), the web data layer and bridge, the runner skeleton, fixtures, repo scaffold, integration gates and merges. Every other feature (workstream) builds from `docs/PRD.md`.

## Current state

- A3 challenge build is committed and pushed as ws/challenges @ 6a3b1d2, based on main/origin/main 638e598. User now explicitly requested “Do a recall dump and then, merge.” Dump precedes the authorized challenge merge; see the latest L1/current overview for completion status.
- PRD v1.3.0 §21 and shared contracts expose integrals, code, speed-math, logic, chess puzzles, trivia, web and squads on the existing lifecycle/event/ledger backend. All catalog tabs are active; Director selects a category and season scheduling cycles them.
- Full challenge revision typecheck and production web build pass; 624 package tests pass (contracts36, engine83, web249, runner179, module77). Separate opt-in two-client real SDK integration passes. Later streaming fetch hardening and pre-create schema validation also passed focused tests and full typecheck.
- Dedicated local fightcard-challenges module was published without data deletion. All8 explicit MOCK reference-backend matches passed actual two-bettor ledger/reveal checks. Seven genuine four-Droid new-category matches also settled with persisted histories verified after reconnect.
- Baseline Maincloud/public deployment was completed in another thread on the earlier revision; the A3 revision has only local deployment evidence. Public runner/web/module cutover must use one matching revision.
- Parallel ws/personas work exists in fc-merge and is unmerged. Do not merge it under the challenge-only instruction or overwrite its worktree/environment.

## Open threads

- [ ] Perform the now-authorized ws/challenges merge and verify/push main; capture exact merge revision in L1/L2.
- [ ] Deploy the additive module and matching A3 runner/web together when carrying out deployment work; never delete production data.
- [ ] Community candidate/debut/rotation loading still needs work. Category Elo/settlement history reload is now implemented, so do not report that entire old persistence gap as untouched.
- [ ] Golden VAR/upset/red-card recordings, sustained season/restart acceptance, recompute --apply, live Forge preview, arena name-tag overlap, phone-cellular acceptance and final submission remain separate tasks.

## Key files

- docs/status/HEAD.md — final A3 evidence and exact match IDs.
- docs/PRD.md §21; packages/contracts/src/categories.ts — amended scope/catalog.
- apps/runner/src/wiring.ts and stdb.ts — category selection, startup and persisted history.
- .arena/worktrees/fc-challenges — clean implementation worktree with installed deps and ignored bindings.

## Recent sessions

- [2026-10-25-challenge-categories](sessions/2026-10-25-challenge-categories.md) — A3 challenge build, real evidence and pre-merge handoff [deep]
- [2026-10-25-merge-all](sessions/2026-10-25-merge-all.md) — merged all 8 branches into main, regression green, pushed 638e598
- [2026-10-25-verified-build-handoff](sessions/2026-10-25-verified-build-handoff.md) — verified build, unmerged branch evidence and remaining work [deep]
- 2026-10-25-a1-money-keys-setup — keys/tooling, PRD Amendment A1 (real currency, cheap models, library audio) [deep]
- 2026-10-25-prd-baseline — direction chosen, PRD v1.0.0 written, vendor docs verified, recall initialized [deep]
