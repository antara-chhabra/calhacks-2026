# planning

**Status:** active
**Paths:** `docs/PRD.md`, `docs/{status,requests}/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring}.ts`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, root configs
**Last touched:** 2026-10-25

## What this is
The PRD and the HEAD orchestrator (O0) domain: product scope, contracts, the pure engine (reducer, cues, parimutuel, Elo, stats, commit-reveal), the web data layer and bridge, the runner skeleton, fixtures, repo scaffold, integration gates and merges. Every other feature (workstream) builds from `docs/PRD.md`.

## Current state
- **HEAD done (152f694, ~04:20):** all of Antara's lanes are merged on `main` and pushed. 540 tests green (contracts 36, engine 80, web 235, runner 113, spacetime 76), typecheck clean, web builds, secrets scan clean.
- **DV1277 is HEAD now** and owns merges to `main`. His six lanes and rules are in `docs/status/HANDOFF-DV1277.md`; pending decisions and open items in `docs/status/HEAD.md`.
- Built: contracts + zod schemas, engine (reducer, cues, feed, status, invariants, parimutuel, markets, Elo, stats, commit-reveal), `fixtures/matches/mock-basic.json`, replay data layer, runner wiring (Director, runMatch, season loop), `/m` code split.
- Not yet real: SpacetimeDB module never published or run; no live web adapter (K-06b); no real Droid fighters. Everything end to end runs only against fakes/replay.

## Open threads
- [ ] DV1277 lanes A–F per docs/status/HANDOFF-DV1277.md (module publish, live adapter K-06b, stdb.ts vs real bindings, Droid fighters, demo mode R-06, README)
- [ ] PRD amendments: Q-001 team, §9.2 React 19/KokonutUI, §8.9 FundingAdapter, §11.8 seed units, §8.4 time bases, card rule (red on 3rd denial)
- [ ] G1: runner -> SpacetimeDB -> two browsers betting -> settled (needs lanes A–C)
- [ ] Merge branch recall/antara-build-wave

## Key files
- `docs/PRD.md` — §5.5 phases, §5.7 sponsors, §8 contracts, §17.2 gates, §17.3 matrix, §17.4 concurrency rules, §17.6 task cards + boot prompt, §18 ADRs, §19 open questions

## Recent sessions
- 2026-10-25-head-build-wave — HEAD scaffold + 30 Sonnet sub-agent cards across O1–O6; all merged (540 tests); handoff to DV1277, HEAD done [deep]
- 2026-10-25-a1-money-keys-setup — keys/tooling, PRD Amendment A1 (real currency, cheap models, library audio) [deep]
- 2026-10-25-prd-baseline — direction chosen, PRD v1.0.0 written, vendor docs verified, recall initialized [deep]
