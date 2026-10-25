# 2026-10-25 — fighters/mock-and-personas

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Unblock O4 with a mock backend and draft house personas.

## What happened
- F-02 mock backend with §11.3 profiles (answerFor injected by caller), registered in fighters/registry.ts by HEAD.
- F-05 agents/rules.md + 6 personas/strategies/lines (strategies follow PRD §11.2).

## Files touched
- apps/runner/src/fighters/{mock,mock-profiles}.ts, registry.ts
- agents/rules.md, agents/house/*

## Decisions made
- Mock gets correct answers only via injected answerFor. Why: FighterProblem has no reference and types are frozen.

## Open threads at end of session
- [ ] F-01 Droid spike, F-03 droid backend, F-04 referee + sandbox, F-07 validation, F-06 direct, F-08 BYO (DV1277 lane D)
- [ ] Founder review of personas

## Gotchas
- droid CLI and Factory key are on DV1277's machine only.
