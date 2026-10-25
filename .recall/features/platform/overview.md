# platform

**Status:** active
**Paths:** `apps/web/src/ui/**`, `apps/web/src/styles/**`, `apps/web/src/pages/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/src/index.css`, `apps/web/{index.html,components.json,vite.config.ts,tsconfig.json,package.json}`, `docs/status/O2.md`, `docs/requests/O2.md`
**Last touched:** 2026-10-25

## What this is
Workstream O2 of the Fight Card build. React UI: lobby, match HUD, bet slip, results, FIFA cards, profiles, leaderboard, Forge, /m mobile, Director (E08, E09, E11 UI, E12). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state

- A3 challenge implementation is now merged into main at6f90ac8; merged-main typecheck,624 tests and production build pass. The pre-merge session remains historical evidence.
- A3 on ws/challenges @ 6a3b1d2 enables all eight catalog routes/leaderboard tabs and Director category selection. Season2 walls and nonintegral integral-preview substitution are removed.
- Lobby poster, odds, results and bet feed filter by category; empty categories show honest mechanics/activity copy. Category-specific leaderboard rows use category stats or an unrated1000 baseline; their card data matches the selected category.
- Squad labels use recorded slots (0/1 TeamA, 2/3 TeamB), not shuffled candidate order. Results show the authoritative settled team_winner result and combined score; individual standings remain visible.
- Revealed nonintegral prompts render as plain text once; accepted answers/hidden code cases/reference are visible only after reveal. Legacy integral-only details are hidden for other modes.
- Web249 tests/typecheck/build pass. Brave verified eight-category nav, actual Code Duel filtering and persisted Code leaderboard Elo with integral records remaining unrated. Later full visual pass was interrupted by browser connection changes; squad fixes have targeted regression evidence. Impeccable checks reported no findings.

## Open threads

- [ ] Publish matching A3 module/runner/web revision and validate public/mobile category flows; code merge is complete.
- [ ] Resolve existing arena floating-name overlap and live Forge preview separately.

## Key files

- apps/web/src/pages/Markets.tsx; ui/lobby/selectors.ts — active category routes and filtered data.
- apps/web/src/ui/{director,leaderboard,match,receipt}/** — controls, records, team results and reveal.
- apps/web/src/data/{store,live,board}.ts — category/slot/categoryStats public mapping.

## Recent sessions

- [2026-10-25-challenge-categories](sessions/2026-10-25-challenge-categories.md) — A3 challenge build, real evidence and pre-merge handoff [deep]
- [2026-10-25-verified-build-handoff](sessions/2026-10-25-verified-build-handoff.md) — verified build, unmerged branch evidence and remaining work [deep]
- 2026-10-25-kokonut-market-ui — Figma v1/v2 design, then KokonutUI market UI in code [deep]
