# backend

**Status:** active
**Paths:** `spacetime/**`, `docs/status/O3.md`, `docs/requests/O3.md`
**Last touched:** 2026-10-25

## What this is
Workstream O3 of the En Garde build. SpacetimeDB 2.x TypeScript module: tables, reducers, scheduled auto_lock, atomic parimutuel settlement (§8.8). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state

- **Empty category tabs fixed (2026-10-25 07:32):** tabs other than Integrals were empty because no non-integral match had ever run on Maincloud and the season loop was off. Seeded one real Droid match per category via Director `POST /admin/matches {category}` (all settled), then `POST /admin/season {on:true}`; season now rotates integrals→code→…→squads. Script: scratchpad `seed-modes.sh`.
- A3 challenge implementation is now merged into main at6f90ac8; merged-main typecheck,624 tests and production build pass. The pre-merge session remains historical evidence.
- A3 adds public fighter_category_stats keyed by fighter/category with per-category Elo and stats. Legacy fighter_stats and fighter.elo remain the integral card/rating for compatibility. New categories start at1000.
- Settlement writes competitive category rows only for live non-demo results. Create-match entries use the chosen category rating; runner reads persisted entries/stats after reconnect. Slots serialize explicitly; squad entries record teamId from actual slots.
- Local fightcard-challenges was newly published with --delete-data=never. All8 MOCK and7 genuine new-category Droid matches passed actual two-bettor ledger payout/reveal checks; real per-category entries were found after a fresh connection.
- Module77 tests pass. The separate real SDK two-client test passed subscriptions, bets, catch-up/live cues, reveal, ledger settlement, Forge propagation and rejected browser credits.
- Baseline Maincloud fightcard is already live and was cut over in fc-merge (later ws/personas). A3 module/schema has NOT been published there; regenerate bindings and deploy module/runner/web consistently. Preserve previously recorded baseline deployment/phone/BYO context.

## Open threads

- [ ] Publish the additive category table/reducers to Maincloud without deleting data, with matching runner/web cutover.
- [ ] Phone-on-cellular and public BYO acceptance still need evidence; baseline public tunnel is temporary and may change.
- [ ] Add the runner-only repair reducer required by recompute --apply.

## Key files

- spacetime/src/{schema,match,settle}.ts — additive category table, teams and settlement.
- apps/runner/src/stdb.ts — category-filtered persisted history.
- scripts/smoke-challenges.ts — isolated local ledger acceptance.

## Recent sessions

- [2026-10-25-challenge-categories](sessions/2026-10-25-challenge-categories.md) — A3 challenge build, real evidence and pre-merge handoff [deep]
- [2026-10-25-verified-build-handoff](sessions/2026-10-25-verified-build-handoff.md) — verified build, unmerged branch evidence and remaining work [deep]
