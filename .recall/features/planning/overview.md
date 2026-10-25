# planning

**Status:** active
**Paths:** `docs/PRD.md`, `docs/{status,requests}/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring}.ts`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, root configs
**Last touched:** 2026-10-25

## What this is
The PRD and the HEAD orchestrator (O0) domain: product scope, contracts, the pure engine (reducer, cues, parimutuel, Elo, stats, commit-reveal), the web data layer and bridge, the runner skeleton, fixtures, repo scaffold, integration gates and merges. Every other feature (workstream) builds from `docs/PRD.md`.

## Current state
- `docs/PRD.md` v1.0.0 is baselined (2,565 lines): 18 epics, MoSCoW scope with cut order, sponsor register, frozen contracts (§8), architecture, design (stage, rig, clips, FIFA card, Forge, mobile), agent architecture, pitch, testing, build plan with ~60 task cards and an orchestrator boot prompt.
- Team confirmed (not solo). The PRD's Q-001 is still marked open; update it to "team".
- No code, no git repo, no `package.json` yet. Gates assume a 01:00 PDT kickoff on Oct 25: G-1 01:30 · G0 02:15 · G1 04:00 · G2 05:30 · G3 06:45 · freeze 07:45 · submitted 08:45.

## Open threads
- [ ] K-01 scaffold (git init, workspaces, deps per §9.2, stubs per §8.7/§8.9, worktrees `../fc-<ws>`, `CLAUDE.md`/`AGENTS.md`, commit `.recall/`)
- [ ] K-02 contracts → K-03/K-04 engine → K-05 `mock-basic` fixture → K-07 runner skeleton → K-08 vendor-engine check (all P0, by G0)
- [ ] PRD patch: Q-001 resolved (team); H-07 assign humans to O1–O7
- [ ] Human setup: H-01 Factory key + droid CLI + sympy + model IDs; H-02 SpacetimeDB login/Maincloud; H-03 Coinbase/CDP + faucet
- [ ] Decide Fetch.ai (Q-006) at G3

## Key files
- `docs/PRD.md` — §5.5 phases, §5.7 sponsors, §8 contracts, §17.2 gates, §17.3 matrix, §17.4 concurrency rules, §17.6 task cards + boot prompt, §18 ADRs, §19 open questions

## Recent sessions
- 2026-10-25-prd-baseline — direction chosen, PRD v1.0.0 written, vendor docs verified, recall initialized [deep]
