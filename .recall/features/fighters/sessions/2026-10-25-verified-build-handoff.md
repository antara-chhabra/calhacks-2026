# 2026-10-25 — fighters/verified-build-handoff

**Session ID:** 2026-10-25-dv1277-build-integration
**Repo state:** main @ b55297c, 0 dirty before memory dump; origin/main @ 152f694. Memory edits are the only new root changes. Implementation anchors: `ws/o5` @ `068ef41` (origin agrees).
**Assignment:** User confirmed splitting this build into workstream features. This is one logical session shared across six files.

## Goal

Deliver real Droid fighters and safe fallback/BYO backends, verify actual model availability, and run a complete four-agent match.

## What happened

- ws/o5 at 068ef41 is pushed and unmerged (implementation c14b9e5, final docs/model availability follow-up 068ef41). Real Droid SDK backend supports in-process arena MCP, streamed activity, referee decisions, cleanup/abort and usage reporting.
- Direct fallback and SSRF-protected HTTP BYO backend plus example agent are implemented and unit tested. Registry construction is supplied by ws/head-integration.
- Native Read/Glob/Grep/LS and Execute are disabled. The launcher sanitizes the environment but is not a verified OS containment boundary. Python verification stays disabled; no hostile OS isolation or AC-04.1 claim.
- User explicitly approved the verified Standard model for GLITCH/PIP. Ignored root .env was updated privately. Catalog had 68 selectable entries; all six house and both tier mappings verified available. GLITCH/PIP had no preexisting public rows/history, so initial registration is version 1. QUILL uses low reasoning effort.
- Actual match real_mvnqmsz4 ran four real Droid fighters, mode live/isDemo false: 80 gapless valid events, verified reveal and real Elo/history settlement. VEX/SAGE/BRICK each scored 150 (5 hits), QUILL 30 (2 hits). A separate standalone harness had 20/20 hits; it is not the same match evidence.

## Files touched

### ws/o5 @ 068ef41

Compared with merge-base `b55297c` against origin/main; paths changed/read for implementation and verification:

- `agents/byo-example/README.md`
- `agents/byo-example/server.mjs`
- `agents/rules.md`
- `apps/runner/bin/droid-sandboxed`
- `apps/runner/src/fighters/direct.test.ts`
- `apps/runner/src/fighters/direct.ts`
- `apps/runner/src/fighters/droid/backend.test.ts`
- `apps/runner/src/fighters/droid/index.ts`
- `apps/runner/src/fighters/droid/prompts.ts`
- `apps/runner/src/fighters/droid/referee.ts`
- `apps/runner/src/fighters/droid/sandbox.ts`
- `apps/runner/src/fighters/http.test.ts`
- `apps/runner/src/fighters/http.ts`
- `apps/runner/src/fighters/speech.ts`
- `docs/requests/O5.md`
- `docs/status/O5.md`
- `scripts/list-models.ts`
- `scripts/try-fighter.ts`

Memory inputs/edits: `.recall/tree.md`, `recent.md`, `project.md`, `config.md`; this feature’s `overview.md`, `decisions.md`, and this new session. HEAD rollup and PRD A2 read for integration context. Branch manifests record build source paths; ignored verification helpers/assemblies are local-only.

## Decisions made

- **Fail closed on native tools:** The wrapper only sanitizes environment; without verified OS isolation, native filesystem and execution capabilities remain disabled.
- **Use the user-approved Standard mapping for GLITCH/PIP:** Their old configured choices were unavailable; the user explicitly chose the already-verified low-cost Standard mapping.
- **Configure reasoning effort per fighter:** QUILL low effort is a private runtime configuration used by the demonstrated real match, forwarded by the candidate/registry path.

## Open threads at end of session

- [ ] Verified OS-isolated executor and hostile-input acceptance before enabling native commands/reads or Python.
- [ ] Optional full live direct-provider match once endpoint credentials/model are configured.
- [ ] Full public BYO HTTP match; local example/ingress checks are not public end-to-end acceptance.
- [ ] Community tier/backend selection after database candidate loading is wired; founder persona review if still required by F-05.

## Gotchas

- Never print or store actual FC_MODEL_* values, API keys, runner tokens or private personas in recall, public rows, events or browser bundles.
- Older O5 or combined-tree notes may still claim GLITCH/PIP are blocked. The final ws/o5 docs and approved private remap supersede that stale text.
- Availability does not prove every house fighter has completed a real match: the recorded acceptance match used VEX/SAGE/BRICK/QUILL.

## Related workstreams

- [planning/verified-build-handoff](../../planning/sessions/2026-10-25-verified-build-handoff.md)
- [platform/verified-build-handoff](../../platform/sessions/2026-10-25-verified-build-handoff.md)
- [backend/verified-build-handoff](../../backend/sessions/2026-10-25-verified-build-handoff.md)
- [runtime/verified-build-handoff](../../runtime/sessions/2026-10-25-verified-build-handoff.md)
- [ship/verified-build-handoff](../../ship/sessions/2026-10-25-verified-build-handoff.md)
