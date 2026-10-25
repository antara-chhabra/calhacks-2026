# 2026-10-25 — backend/verified-build-handoff

**Session ID:** 2026-10-25-dv1277-build-integration
**Repo state:** main @ b55297c, 0 dirty before memory dump; origin/main @ 152f694. Memory edits are the only new root changes. Implementation anchors: `ws/o3` @ `fcdf90c` (origin agrees).
**Assignment:** User confirmed splitting this build into workstream features. This is one logical session shared across six files.

## Goal

Publish and exercise the local SpacetimeDB module, harden demo/mock history exclusion and validate real authorization/settlement.

## What happened

- Local module published to fightcard-o3 on SpacetimeDB 127.0.0.1:3000; generated web/runner bindings stay ignored. Runner identity was claimed using private root environment configuration.
- ws/o3 at fcdf90c is pushed and unmerged: slot serialization fixed with Array.from(Uint8Array), demo/mock statistics protections and shared ledger refunds verified.
- Module suite: 76 passing tests. Real live auth matrix checks 13 privileged reducers deny a player identity; private views filter correctly, scheduled timer locks, and settlement agrees with the engine.
- Two-client live integration verifies shared ledger bets, settlement balances, Forge propagation and rejection of browser credit attempts. Normal live mock smoke had 174 events, 6 bets and 2 bettors with hashes/invariants/conservation passing.

## Files touched

### ws/o3 @ fcdf90c

Compared with merge-base `b55297c` against origin/main; paths changed/read for implementation and verification:

- `docs/requests/O3.md`
- `docs/status/O3.md`
- `spacetime/.gitignore`
- `spacetime/README.md`
- `spacetime/src/match.ts`
- `spacetime/src/settle.ts`
- `spacetime/test/auth-live.ts`
- `spacetime/test/match.test.ts`

Memory inputs/edits: `.recall/tree.md`, `recent.md`, `project.md`, `config.md`; this feature’s `overview.md`, `decisions.md`, and this new session. HEAD rollup and PRD A2 read for integration context. Branch manifests record build source paths; ignored verification helpers/assemblies are local-only.

## Decisions made

- **Exclude demo/mock from competitive history:** Only real non-demo results should change public ratings/card statistics.
- **Serialize slot bytes explicitly:** The SDK returns Uint8Array; JSON.stringify alone produces an object instead of the expected slot array.
- **Keep refund arithmetic shared:** Void/refund paths must conserve the same integer-cent ledger amounts as normal settlement.

## Open threads at end of session

- [ ] Publish final module to Maincloud/public environment only after final revision is selected.
- [ ] Add a runner-only stats/Elo repair reducer to support recompute --apply.
- [ ] Regenerate ignored bindings after the eventual merges and repeat real-module smoke.

## Gotchas

- A local published module is not Maincloud deployment; no public-hosting acceptance is claimed.
- The SDK requires public:true on views; privacy comes from ctx.sender filtering. Verify actual private-view behavior with separate identities.
- Native SDK bindings are generated and ignored; do not commit them or private identity tokens.

## Related workstreams

- [planning/verified-build-handoff](../../planning/sessions/2026-10-25-verified-build-handoff.md)
- [platform/verified-build-handoff](../../platform/sessions/2026-10-25-verified-build-handoff.md)
- [runtime/verified-build-handoff](../../runtime/sessions/2026-10-25-verified-build-handoff.md)
- [fighters/verified-build-handoff](../../fighters/sessions/2026-10-25-verified-build-handoff.md)
- [ship/verified-build-handoff](../../ship/sessions/2026-10-25-verified-build-handoff.md)
