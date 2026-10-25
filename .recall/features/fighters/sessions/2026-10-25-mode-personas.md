# 2026-10-25 — fighters/mode-personas

**Repo state:** main @ 44922fa (merge of ws/personas e6c633b onto A3 main 3de53f2), pushed. Deploy from `.arena/worktrees/fc-merge` (branch ws/personas == main content).

## Goal
Make the Droid personas work with A3's eight challenge modes, keep them static, then dump, merge, deploy.

## What happened
- Merged origin/main (A3) into ws/personas; conflicts in `droid/prompts.ts` (kept A3 category rendering + `characterReminder`) and `docs/status/O5.md` (kept both).
- Rewrote all six `.factory/droids/fc-<id>.md`: integral-only wording generalized; added `# By mode (fixed for every challenge)` with one line per category (Integrals, Code duels, Speed math, Logic, Chess, Trivia, Live web, Squads). Relocked.
- `characterReminder` now names the mode and points at the By-mode line. persona.test asserts every CATEGORY_CATALOG label has a line. `try-fighter --category`, public problem fields mirror match/run.ts (`evaluation.prompt/format`).
- Live: 6 fighters × {integrals, code, logic, chess} = 24/24 runs 5/5, all survived, signatures intact.
- Regression: typecheck; tests 36/83/249(+1 skip)/186/77 = 631; web build; local smoke PASS; secrets scan clean.
- Merged `--no-ff` into main 44922fa, pushed.
- Deploy: Maincloud `fightcard` republished (additive: `fighter_category_stats`; runner claim + 6 fighters intact); runner on 127.0.0.1:8797 / public 8798 (`stdb=ok`); web build served by scratchpad `spa-serve.mjs` on :4173 via quick tunnel https://ist-colleagues-twisted-variations.trycloudflare.com; `.env`/`.env.local` in fc-merge updated to that URL. Maincloud demo smoke PASS (137 events, 2 bettors). Chrome: /markets shows LIVE, all 8 category tabs, no console errors.

## Decisions made
- Personas stay one fixed character across modes; mode differences are pinned per-category lines inside the same locked file, not separate personas.

## Gotchas
- Smoke from fc-merge needs `FC_STDB_URI=ws://127.0.0.1:3000 FC_STDB_TOKEN=` (its .env points at Maincloud).
- Quick-tunnel URL changes on restart → update VITE_PUBLIC_WEB_URL + FC_PUBLIC_WEB_URL, rebuild web, restart runner.
- Runner public port 8798 tunnel was previously blocked by the auto-mode classifier (BYO only).
