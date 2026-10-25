# fighters

**Status:** active
**Paths:** `apps/runner/src/fighters/**`, `apps/runner/bin/**`, `agents/**`, `scripts/try-fighter.ts`, `scripts/list-models.ts`, `docs/status/O5.md`, `docs/requests/O5.md`
**Last touched:** 2026-10-25

## What this is
Workstream O5 of the Fight Card build. Fighter backends: Factory Droid SDK sessions + in-process MCP arena tools, referee permission policy, sandbox wrapper, mock/direct/BYO, house personas. Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state

- A3 challenge implementation is now merged into main at6f90ac8; merged-main typecheck,624 tests and production build pass. The pre-merge session remains historical evidence.
- A3 Droid/direct/HTTP prompts and payloads are category-aware. Public problem fields are explicitly whitelisted; reference answers/evaluator test cases stay private until reveal.
- The backwards-compatible antiderivative transport key carries any category answer. Integrals retain400 characters; nonintegrals allow bounded10k answers. Code instructions require a pure JS function expression, without Markdown/JSON wrapper.
- Seven four-Droid live, non-demo matches settled: Code, SpeedMath, Logic, Chess, Trivia, LiveWeb and Squads, each with verified reveal/two ledger bettors and persisted category records. Most scored150; Chess SAGE/QUILL150, VEX145, BRICK140.
- Private approved Standard remap for GLITCH/PIP and QUILL low effort remain; do not store actual model IDs, API keys or runner tokens. Native Read/Glob/Grep/LS/Execute and Python remain disabled; QuickJS is a separate bounded evaluator, not a native OS-containment claim.
- Parallel persona work: ws/personas @5d9b6c4 in fc-merge is unmerged and has custom Factory droids under .factory/droids, a persona lock/version gate and external temporary sandboxes to prevent project/persona leakage. Its Maincloud runner was separately restarted. Preserve that work; it has not been integrated with A3 here.

## Open threads

- [ ] Integrate/review ws/personas separately; it overlaps prompt/rules changes and was not included in the challenge-only merge authorization.
- [ ] Verified OS containment before any native command/read enablement.
- [ ] Full direct-provider/public HTTP BYO acceptance remains separate from the tested category-aware payloads.

## Key files

- apps/runner/src/fighters/droid/{index,prompts}.ts — category instructions/tools.
- apps/runner/src/fighters/{direct,http,mock}.ts — category payloads/format handling.
- agents/rules.md — category placeholders; ws/personas has separate overlapping work.

## Recent sessions

- [2026-10-25-challenge-categories](sessions/2026-10-25-challenge-categories.md) — A3 challenge build, real evidence and pre-merge handoff [deep]
- [2026-10-25-verified-build-handoff](sessions/2026-10-25-verified-build-handoff.md) — verified build, unmerged branch evidence and remaining work [deep]
