# 2026-10-25 — fighters/challenge-categories

**Session ID:** 2026-10-25-a3-challenge-build
**Repo state:** dump written on main @638e598,22 dirty memory status entries before dump; implementation ws/challenges @6a3b1d2,0 dirty and origin agrees. No code merge has occurred at dump time.
**Assignment:** Uses the user-confirmed workstream split from the preceding recall dump. The user now authorized merging after saving memory.

## Goal

Save the completed A3 challenge build and its evidence before the authorized merge into main.

## What happened

- A3 Droid/direct/HTTP prompts and payloads are category-aware. Public problem fields are explicitly whitelisted; reference answers/evaluator test cases stay private until reveal.
- The backwards-compatible antiderivative transport key carries any category answer. Integrals retain400 characters; nonintegrals allow bounded10k answers. Code instructions require a pure JS function expression, without Markdown/JSON wrapper.
- Seven four-Droid live, non-demo matches settled: Code, SpeedMath, Logic, Chess, Trivia, LiveWeb and Squads, each with verified reveal/two ledger bettors and persisted category records. Most scored150; Chess SAGE/QUILL150, VEX145, BRICK140.
- Private approved Standard remap for GLITCH/PIP and QUILL low effort remain; do not store actual model IDs, API keys or runner tokens. Native Read/Glob/Grep/LS/Execute and Python remain disabled; QuickJS is a separate bounded evaluator, not a native OS-containment claim.
- Parallel persona work: ws/personas @5d9b6c4 in fc-merge is unmerged and has custom Factory droids under .factory/droids, a persona lock/version gate and external temporary sandboxes to prevent project/persona leakage. Its Maincloud runner was separately restarted. Preserve that work; it has not been integrated with A3 here.

## Files touched

Branch diff against main638e598 (routed slice; full set71 paths):

- `agents/rules.md` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/direct.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/direct.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/droid/backend.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/droid/index.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/droid/prompts.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/http.test.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/http.ts` — A3 implementation/evidence reviewed.
- `apps/runner/src/fighters/mock.ts` — A3 implementation/evidence reviewed.
- `apps/runner/test/fighters-mock.test.ts` — A3 implementation/evidence reviewed.
- `docs/status/O5.md` — A3 implementation/evidence reviewed.

Memory evidence read: `.recall/{tree,recent,project,config}.md`, this feature’s overview, `AGENTS.md`, challenge HEAD rollup and recall template. This dump updates the feature overview/decisions and adds this session; L1 is updated across the split.

## Decisions made

- **Keep public payloads explicit:** Changing categories must not leak committed answer keys or hidden code tests to real fighters.
- **Retain the transport key:** Existing clients and tool schemas can submit other category answers without a breaking endpoint rename.

## Open threads at end of session

- [ ] Integrate/review ws/personas separately; it overlaps prompt/rules changes and was not included in the challenge-only merge authorization.
- [ ] Verified OS containment before any native command/read enablement.
- [ ] Full direct-provider/public HTTP BYO acceptance remains separate from the tested category-aware payloads.

## Gotchas

- This session is the pre-merge snapshot. Future merge completion/regression is recorded in L1/current overviews; do not treat “pending merge” here as newer than those summaries.
- `.env`, generated module_bindings and `.arena/` helpers/identities/results are ignored; never print or commit private values.
- Local challenge preview last observed on web5182, admin/public8791/8792, database fightcard-challenges on port3000. Verify liveness; automatic season is OFF.
- A3 is not a Maincloud/public deployment. The independent ws/personas branch and its serving processes must not be overwritten.

## Related workstreams

[planning](../../planning/sessions/2026-10-25-challenge-categories.md), [platform](../../platform/sessions/2026-10-25-challenge-categories.md), [backend](../../backend/sessions/2026-10-25-challenge-categories.md), [runtime](../../runtime/sessions/2026-10-25-challenge-categories.md), [ship](../../ship/sessions/2026-10-25-challenge-categories.md)
