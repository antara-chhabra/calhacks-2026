# 2026-10-25 — backend/challenge-categories

**Session ID:** 2026-10-25-a3-challenge-build
**Repo state:** dump written on main @638e598,22 dirty memory status entries before dump; implementation ws/challenges @6a3b1d2,0 dirty and origin agrees. No code merge has occurred at dump time.
**Assignment:** Uses the user-confirmed workstream split from the preceding recall dump. The user now authorized merging after saving memory.

## Goal

Save the completed A3 challenge build and its evidence before the authorized merge into main.

## What happened

- A3 adds public fighter_category_stats keyed by fighter/category with per-category Elo and stats. Legacy fighter_stats and fighter.elo remain the integral card/rating for compatibility. New categories start at1000.
- Settlement writes competitive category rows only for live non-demo results. Create-match entries use the chosen category rating; runner reads persisted entries/stats after reconnect. Slots serialize explicitly; squad entries record teamId from actual slots.
- Local fightcard-challenges was newly published with --delete-data=never. All8 MOCK and7 genuine new-category Droid matches passed actual two-bettor ledger payout/reveal checks; real per-category entries were found after a fresh connection.
- Module77 tests pass. The separate real SDK two-client test passed subscriptions, bets, catch-up/live cues, reveal, ledger settlement, Forge propagation and rejected browser credits.
- Baseline Maincloud fightcard is already live and was cut over in fc-merge (later ws/personas). A3 module/schema has NOT been published there; regenerate bindings and deploy module/runner/web consistently. Preserve previously recorded baseline deployment/phone/BYO context.

## Files touched

Branch diff against main638e598 (routed slice; full set71 paths):

- `docs/status/O3.md` — A3 implementation/evidence reviewed.
- `spacetime/src/logic/match.ts` — A3 implementation/evidence reviewed.
- `spacetime/src/match.ts` — A3 implementation/evidence reviewed.
- `spacetime/src/schema.ts` — A3 implementation/evidence reviewed.
- `spacetime/src/settle.ts` — A3 implementation/evidence reviewed.
- `spacetime/test/match.test.ts` — A3 implementation/evidence reviewed.

Memory evidence read: `.recall/{tree,recent,project,config}.md`, this feature’s overview, `AGENTS.md`, challenge HEAD rollup and recall template. This dump updates the feature overview/decisions and adds this session; L1 is updated across the split.

## Decisions made

- **Add category rows without replacing integral storage:** Preserves existing integral records and compatibility while enabling independent category progression.
- **Read persisted category history on reconnect:** Ratings and stats must not reset or mix categories when the runner restarts.

## Open threads at end of session

- [ ] Publish the additive category table/reducers to Maincloud without deleting data, with matching runner/web cutover.
- [ ] Phone-on-cellular and public BYO acceptance still need evidence; baseline public tunnel is temporary and may change.
- [ ] Add the runner-only repair reducer required by recompute --apply.

## Gotchas

- This session is the pre-merge snapshot. Future merge completion/regression is recorded in L1/current overviews; do not treat “pending merge” here as newer than those summaries.
- `.env`, generated module_bindings and `.arena/` helpers/identities/results are ignored; never print or commit private values.
- Local challenge preview last observed on web5182, admin/public8791/8792, database fightcard-challenges on port3000. Verify liveness; automatic season is OFF.
- A3 is not a Maincloud/public deployment. The independent ws/personas branch and its serving processes must not be overwritten.

## Related workstreams

[planning](../../planning/sessions/2026-10-25-challenge-categories.md), [platform](../../platform/sessions/2026-10-25-challenge-categories.md), [runtime](../../runtime/sessions/2026-10-25-challenge-categories.md), [fighters](../../fighters/sessions/2026-10-25-challenge-categories.md), [ship](../../ship/sessions/2026-10-25-challenge-categories.md)
