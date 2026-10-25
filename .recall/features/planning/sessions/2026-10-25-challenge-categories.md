# 2026-10-25 — planning/challenge-categories

**Session ID:** 2026-10-25-a3-challenge-build
**Repo state:** dump written on main @638e598,22 dirty memory status entries before dump; implementation ws/challenges @6a3b1d2,0 dirty and origin agrees. No code merge has occurred at dump time.
**Assignment:** Uses the user-confirmed workstream split from the preceding recall dump. The user now authorized merging after saving memory.

## Goal

Save the completed A3 challenge build and its evidence before the authorized merge into main.

## What happened

- A3 challenge build is committed and pushed as ws/challenges @ 6a3b1d2, based on main/origin/main 638e598. User now explicitly requested “Do a recall dump and then, merge.” Dump precedes the authorized challenge merge; see the latest L1/current overview for completion status.
- PRD v1.3.0 §21 and shared contracts expose integrals, code, speed-math, logic, chess puzzles, trivia, web and squads on the existing lifecycle/event/ledger backend. All catalog tabs are active; Director selects a category and season scheduling cycles them.
- Full challenge revision typecheck and production web build pass; 624 package tests pass (contracts36, engine83, web249, runner179, module77). Separate opt-in two-client real SDK integration passes. Later streaming fetch hardening and pre-create schema validation also passed focused tests and full typecheck.
- Dedicated local fightcard-challenges module was published without data deletion. All8 explicit MOCK reference-backend matches passed actual two-bettor ledger/reveal checks. Seven genuine four-Droid new-category matches also settled with persisted histories verified after reconnect.
- Baseline Maincloud/public deployment was completed in another thread on the earlier revision; the A3 revision has only local deployment evidence. Public runner/web/module cutover must use one matching revision.
- Parallel ws/personas work exists in fc-merge and is unmerged. Do not merge it under the challenge-only instruction or overwrite its worktree/environment.

## Files touched

Branch diff against main638e598 (routed slice; full set71 paths):

- `apps/runner/package.json` — A3 implementation/evidence reviewed.
- `apps/runner/src/control/director.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/types.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/stdb.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/wiring.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/data/board.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/data/live.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/data/store.ts` — A3 implementation/evidence reviewed.
- `apps/web/test/data-live.test.ts` — A3 implementation/evidence reviewed.
- `docs/PRD.md` — A3 implementation/evidence reviewed.
- `docs/requests/HEAD.md` — A3 implementation/evidence reviewed.
- `docs/status/HEAD.md` — A3 implementation/evidence reviewed.
- `package-lock.json` — A3 implementation/evidence reviewed.
- `packages/contracts/src/categories.ts` — A3 implementation/evidence reviewed.
- `packages/contracts/src/domain.ts` — A3 implementation/evidence reviewed.
- `packages/contracts/src/index.ts` — A3 implementation/evidence reviewed.
- `packages/contracts/src/schemas.ts` — A3 implementation/evidence reviewed.
- `packages/engine/src/markets.ts` — A3 implementation/evidence reviewed.
- `packages/engine/src/target.ts` — A3 implementation/evidence reviewed.
- `packages/engine/test/markets.test.ts` — A3 implementation/evidence reviewed.
- `packages/engine/test/target.test.ts` — A3 implementation/evidence reviewed.

Memory evidence read: `.recall/{tree,recent,project,config}.md`, this feature’s overview, `AGENTS.md`, challenge HEAD rollup and recall template. This dump updates the feature overview/decisions and adds this session; L1 is updated across the split.

## Decisions made

- **Expose the entire catalog:** User explicitly expanded scope and rejected preview/Season2 walls; preserve the same match and ledger backend.
- **Keep deployment separate from merging:** The user authorized a recall dump then a merge; the live Maincloud/persona deployment is a separate ongoing workstream.
- **Use a dedicated local acceptance database:** fightcard-challenges isolates seeded/mock and genuine-model verification from existing local/Maincloud data.

## Open threads at end of session

- [ ] Perform the now-authorized ws/challenges merge and verify/push main; capture exact merge revision in L1/L2.
- [ ] Deploy the additive module and matching A3 runner/web together when carrying out deployment work; never delete production data.
- [ ] Community candidate/debut/rotation loading still needs work. Category Elo/settlement history reload is now implemented, so do not report that entire old persistence gap as untouched.
- [ ] Golden VAR/upset/red-card recordings, sustained season/restart acceptance, recompute --apply, live Forge preview, arena name-tag overlap, phone-cellular acceptance and final submission remain separate tasks.

## Gotchas

- This session is the pre-merge snapshot. Future merge completion/regression is recorded in L1/current overviews; do not treat “pending merge” here as newer than those summaries.
- `.env`, generated module_bindings and `.arena/` helpers/identities/results are ignored; never print or commit private values.
- Local challenge preview last observed on web5182, admin/public8791/8792, database fightcard-challenges on port3000. Verify liveness; automatic season is OFF.
- A3 is not a Maincloud/public deployment. The independent ws/personas branch and its serving processes must not be overwritten.

## Related workstreams

[platform](../../platform/sessions/2026-10-25-challenge-categories.md), [backend](../../backend/sessions/2026-10-25-challenge-categories.md), [runtime](../../runtime/sessions/2026-10-25-challenge-categories.md), [fighters](../../fighters/sessions/2026-10-25-challenge-categories.md), [ship](../../ship/sessions/2026-10-25-challenge-categories.md)

## Genuine live category evidence

All used VEX/SAGE/BRICK/QUILL, mode live/isDemo false, independent ledger bettors, verified hash/reveal and persisted history after reconnect:

- code: challenge_code_mvnup37h,90 events, all150.
- speed-math: challenge_speed-math_mvnupd3s,86 events, all150.
- logic: challenge_logic_mvnupknh,86 events, all150.
- chess: challenge_chess_mvnus3x3,118 events; SAGE/QUILL150, VEX145, BRICK140.
- trivia: challenge_trivia_mvnut33l,94 events, all150.
- web: challenge_web_mvnuthzu,87 events, all150.
- squads: challenge_squads_mvnutr6m,87 events, all150;5 markets.

Ignored core/remaining batch reports are in fc-challenges/.arena/challenges-smoke-core-live.json and challenges-smoke-live.json. New local test identity is in .arena/challenges-runner.json (private). Source and bundle private-value scan passed. No Maincloud changes were made by this build.
