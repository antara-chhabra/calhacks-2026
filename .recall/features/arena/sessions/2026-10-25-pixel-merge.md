# 2026-10-25 — arena/pixel-merge

**Repo state:** main @ 36d96f4 (pushed). Vector snapshot: branch `built-with-vector-art` @ e08ea40.

## Goal
Compare current vector vs proposed pixel fighters, verify the non-integral modes, adopt pixel art with fixes, keep vector on its own branch, deploy.

## What happened
- Side-by-side in Chrome (same replay at 1:51 and /dev/cards): pixel sprites with 4-shade ramps on the same rig; jumbotron moved to bottom (fixes vector's covered VEX/PIP heads); BRICK redesigned to a grey knight helm with an orange plume, GLITCH visor. Issues found: jumbotron banner overlapping gem 5, VEX bubble clipped at the stage top, stray arm pixels at zoom, ~1.3 px/art-px at match-page size.
- User chose pixel. Pushed `built-with-vector-art` = main e08ea40. `ws/pixel-final` = ws/pixel-fighters + main (no conflicts) + fixes 57cb693 (banner position; bubble beside the head when clamped).
- Mode verification (user asked before merging): `scripts/smoke-challenges.ts --real --categories=code,speed-math,logic,chess,trivia,web,squads` on local `fightcard-challenges` (token reused from `.arena/challenges-runner.json`): all 7 live real-Droid matches settled; ledger + reveal pass; 4 markets each (squads 5). Scores near-saturated (150/150 mostly; trivia/squads 145).
- Regression on the merge: typecheck; tests 36/83/252(+1)/186/77 = 634; web build; local smoke; secrets scan clean. Merged → main 36d96f4, pushed.
- Deploy: fc-merge switched to detached main, web rebuilt (Maincloud + tunnel URL baked in); spa-serve/tunnel/runner kept running. Public replay shows pixel art and the fixes.

## Gotchas
- smoke-challenges claims the runner on first use; reuse `.arena/challenges-runner.json` from the worktree that claimed it, or you get `runner_already_set`.
- Antara's recall branch `recall/antara-pixel-fighters` is based on 152f694; only the arena files and the ship design-demo session were taken (its tree/recent/platform/runtime would revert newer state).
