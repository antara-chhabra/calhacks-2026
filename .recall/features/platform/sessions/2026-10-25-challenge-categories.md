# 2026-10-25 — platform/challenge-categories

**Session ID:** 2026-10-25-a3-challenge-build
**Repo state:** dump written on main @638e598,22 dirty memory status entries before dump; implementation ws/challenges @6a3b1d2,0 dirty and origin agrees. No code merge has occurred at dump time.
**Assignment:** Uses the user-confirmed workstream split from the preceding recall dump. The user now authorized merging after saving memory.

## Goal

Save the completed A3 challenge build and its evidence before the authorized merge into main.

## What happened

- A3 on ws/challenges @ 6a3b1d2 enables all eight catalog routes/leaderboard tabs and Director category selection. Season2 walls and nonintegral integral-preview substitution are removed.
- Lobby poster, odds, results and bet feed filter by category; empty categories show honest mechanics/activity copy. Category-specific leaderboard rows use category stats or an unrated1000 baseline; their card data matches the selected category.
- Squad labels use recorded slots (0/1 TeamA, 2/3 TeamB), not shuffled candidate order. Results show the authoritative settled team_winner result and combined score; individual standings remain visible.
- Revealed nonintegral prompts render as plain text once; accepted answers/hidden code cases/reference are visible only after reveal. Legacy integral-only details are hidden for other modes.
- Web249 tests/typecheck/build pass. Brave verified eight-category nav, actual Code Duel filtering and persisted Code leaderboard Elo with integral records remaining unrated. Later full visual pass was interrupted by browser connection changes; squad fixes have targeted regression evidence. Impeccable checks reported no findings.

## Files touched

Branch diff against main638e598 (routed slice; full set71 paths):

- `apps/web/src/pages/Markets.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/director/client.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/director/panel.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/leaderboard/LeaderboardScreen.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/leaderboard/selectors.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/lobby/selectors.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/match/model.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/match/results.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/match/screen.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/mock.ts` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/receipt/screen.tsx` — A3 implementation/evidence reviewed.
- `apps/web/src/ui/widgets.tsx` — A3 implementation/evidence reviewed.
- `apps/web/test/ui-director.test.ts` — A3 implementation/evidence reviewed.
- `apps/web/test/ui-leaderboard.test.ts` — A3 implementation/evidence reviewed.
- `apps/web/test/ui-lobby.test.ts` — A3 implementation/evidence reviewed.
- `docs/status/O2.md` — A3 implementation/evidence reviewed.

Memory evidence read: `.recall/{tree,recent,project,config}.md`, this feature’s overview, `AGENTS.md`, challenge HEAD rollup and recall template. This dump updates the feature overview/decisions and adds this session; L1 is updated across the split.

## Decisions made

- **Use category-specific data throughout the page:** A category route must not display another category’s matches or borrow its competitive stats.
- **Use recorded slots and settled team outcomes:** Scheduler candidate order is shuffled; team identities and winners must agree with backend settlement.

## Open threads at end of session

- [ ] Merge/publish matching A3 revision and validate public/mobile category flows after cutover.
- [ ] Resolve existing arena floating-name overlap and live Forge preview separately.

## Gotchas

- This session is the pre-merge snapshot. Future merge completion/regression is recorded in L1/current overviews; do not treat “pending merge” here as newer than those summaries.
- `.env`, generated module_bindings and `.arena/` helpers/identities/results are ignored; never print or commit private values.
- Local challenge preview last observed on web5182, admin/public8791/8792, database fightcard-challenges on port3000. Verify liveness; automatic season is OFF.
- A3 is not a Maincloud/public deployment. The independent ws/personas branch and its serving processes must not be overwritten.

## Related workstreams

[planning](../../planning/sessions/2026-10-25-challenge-categories.md), [backend](../../backend/sessions/2026-10-25-challenge-categories.md), [runtime](../../runtime/sessions/2026-10-25-challenge-categories.md), [fighters](../../fighters/sessions/2026-10-25-challenge-categories.md), [ship](../../ship/sessions/2026-10-25-challenge-categories.md)
