# runtime

**Status:** active
**Paths:** `apps/runner/src/match/**`, `apps/runner/src/problems/**`, `apps/runner/src/season/**`, `apps/runner/src/http/admin.ts`, `apps/runner/src/http/byo.ts`, `scripts/smoke.ts`, `scripts/record.ts`, `scripts/recompute.ts`, `scripts/try-problems.ts`, `docs/status/O4.md`, `docs/requests/O4.md`
**Last touched:** 2026-10-25

## What this is
Workstream O4 of the Fight Card build. Runner match runtime: integral generator + mathjs whitelist verifier, match lifecycle, FighterIO, VAR, commit-reveal, season loop, admin/BYO HTTP. Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- Not started. Defined in `docs/PRD.md` only; no code exists yet (repo not initialized).

## Open threads
- [ ] Task cards: R-01 problems (P0) · R-02a/R-02b lifecycle + R-05 smoke (P1) · R-03 admin API + R-04 season loop (P2) · R-06 demo mode (P3)
- [ ] Read first: PRD §1.4, §4, §8, §9.3, §17; then PRD E01, E02, E05, E13, E14, §11.4–11.5, §8.9–8.10

## Key files
- `docs/PRD.md` §17.6 (O4 task cards) and §17.5 (charter)

## Recent sessions
- (none yet; planning context is in `features/planning/`)
