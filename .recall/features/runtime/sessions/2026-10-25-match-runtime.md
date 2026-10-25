# 2026-10-25 — runtime/match-runtime

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Build O4: problems, match lifecycle, admin/BYO, season, scripts.

## What happened
- R-01 17 seeded families + whitelist parser + live/final checks; final check also requires F finite/real (catches missing abs). 1500 problems: all references pass, 509/509 traps caught.
- R-02a lifecycle to review, R-02b final checks/standings/finalize/reveal/settle/void/orphan recovery, R-03 Director + BYO routes, R-04 season loop + budget guard, R-05 smoke/record/recompute.
- HEAD wired it all in apps/runner/src/wiring.ts; POST /admin/matches runs a full mock match to settled against the fake stdb.

## Files touched
- apps/runner/src/{problems,match,season,control}/**, http/{admin,byo}.ts
- scripts/{smoke,record,recompute,try-problems}.ts
- apps/runner/test/fakes/fake-stdb.ts

## Decisions made
- Red card on the 3rd referee denial (2 yellows first). Why: FC-F-061 over the task card.
- Standings tiebreak: points, earlier lastScoreMs, fewer misses, lower slot. Why: FC-F-025 plus unique ranks.
- Mock/demo matches leave Elo unchanged. Why: §16.2 #8.

## Open threads at end of session
- [ ] R-06 demo mode (DV1277 lane E)
- [ ] smoke --live once the module is published
- [ ] wonAtOdds null at settle (upset frame never triggers from runner path)

## Gotchas
- Mock backend timeScale needs remainingMs scaled too (smoke wraps it).
