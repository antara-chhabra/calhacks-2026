# 2026-10-25 — backend/module-reducers

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Write the SpacetimeDB module (B-01…B-05) without a spacetime CLI on this machine.

## What happened
- B-01 all §8.8 tables, init, claim_runner, register_player, views. HEAD split reducers one file per card and added auth.ts (requireRunner/requirePlayer) and events.ts (appendEvent).
- B-02 match lifecycle, B-03 betting + applyLedger, B-04 settlement via vendored parimutuel (matches mock-basic payouts exactly), B-05 forge.
- HEAD fixes: seeds are cents (no x100), match.intro postable only while locked, settle voids+refunds markets with no result.

## Files touched
- spacetime/src/{schema,types,auth,events,reducers,match,bets,settle,forge}.ts, logic/**, vendor/parimutuel.ts
- spacetime/test/*.test.ts (76)
- docs/requests/O3.md

## Decisions made
- appendEvent is the only writer of fight_event; applyLedger the only writer of balances. Why: gapless seq and auditable money.
- Views are public (SDK 2.13 requires it) and filter on ctx.sender. Why: SDK constraint.
- Module does not import @fc/contracts/zod; runner validates with parseRunnerPostable before posting. Why: unknown bundling of workspace packages.

## Open threads at end of session
- [ ] DV1277 lane A: first publish (K-08), fix build errors, B-06 auth matrix + Maincloud runbook
- [ ] Possible spacetime.json / entry config for SDK 2.13
- [ ] config.moneyMode column if live mode ever matters
- [ ] A runner-only reducer to write fighter_stats/elo for recompute --apply

## Gotchas
- Typechecked only — never built or run. Expect first-publish errors.
