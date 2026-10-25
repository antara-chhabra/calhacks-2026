# runtime

**Status:** active
**Paths:** `apps/runner/src/match/**`, `apps/runner/src/problems/**`, `apps/runner/src/season/**`, `apps/runner/src/http/admin.ts`, `apps/runner/src/http/byo.ts`, `scripts/smoke.ts`, `scripts/record.ts`, `scripts/recompute.ts`, `scripts/try-problems.ts`, `docs/status/O4.md`, `docs/requests/O4.md`
**Last touched:** 2026-10-25

## What this is
Workstream O4 of the Fight Card build. Runner match runtime: integral generator + mathjs whitelist verifier, match lifecycle, FighterIO, VAR, commit-reveal, season loop, admin/BYO HTTP. Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- O4 R-01…R-05 merged; the runner runs full matches end to end against the fake stdb; `npm run smoke` PASS (fake mode). Live mode untested (no module running).

## Open threads
- [ ] R-06 demo mode (DV1277 lane E)
- [ ] smoke --live once the module is published
- [ ] wonAtOdds null at settle (upset frame never triggers from runner path)

## Key files
- `docs/PRD.md` §17.6 (O4 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-match-runtime — R-01…R-05; full mock match to settled; smoke PASS (fake)
