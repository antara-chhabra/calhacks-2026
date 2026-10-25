# fighters

**Status:** active
**Paths:** `apps/runner/src/fighters/**`, `apps/runner/bin/**`, `agents/**`, `scripts/try-fighter.ts`, `scripts/list-models.ts`, `docs/status/O5.md`, `docs/requests/O5.md`
**Last touched:** 2026-10-25

## What this is
Workstream O5 of the Fight Card build. Fighter backends: Factory Droid SDK sessions + in-process MCP arena tools, referee permission policy, sandbox wrapper, mock/direct/BYO, house personas. Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- Mock backend and house personas are on `main`. Real Droid fighters are DV1277's lane D.

## Open threads
- [ ] F-01 Droid spike, F-03 droid backend, F-04 referee + sandbox, F-07 validation, F-06 direct, F-08 BYO (DV1277 lane D)
- [ ] Founder review of personas

## Key files
- `docs/PRD.md` §17.6 (O5 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-mock-and-personas — F-02 mock backend, F-05 personas; Droid work is DV1277 lane D
