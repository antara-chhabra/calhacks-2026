# 2026-10-25 — planning/head-build-wave

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Run the HEAD (O0) orchestrator: scaffold, contracts, engine, data layer, runner wiring, merges; fan out Sonnet sub-agents across workstreams.

## What happened
- Loaded L1+L2, pulled A1 (PRD 1.1.0). Started HEAD since H-07 (workstream assignment) was open and K-01 blocked everyone.
- K-01 scaffold (538dded): npm workspaces (@fc/contracts, @fc/engine, @fc/web, @fc/runner, @fc/spacetime), typed stubs for §8.7/§8.9, CLAUDE.md/AGENTS.md, docs/requests+status per ws, worktrees ../fc-o1..o7 on ws/o1..o7.
- Sonnet sub-agents (medium) per task card, each with a WRITE list; HEAD verified Done-when and committed per card, merged ws/* in rule-7 order.
- K-02 schemas, K-03 reducer/cues/feed/invariants, K-04 parimutuel/markets/elo/stats/fair, K-05 mock-basic fixture (142 events), K-06a replay data layer + /replay/:name?debug=1, K-07 runner skeleton + full wiring (Director, runMatch, season loop, candidates, orphan recovery).
- Caught/fixed cross-agent bugs: beat_clock measured from match.created not the bell; module seeds x100 (seeds are cents); match.intro gate; settle left markets without results stranded; flaky runner test (serialized files); admin CORS only :5173; /m loaded 439 kB (split entry -> ~71 kB).
- User chose: DV1277 publishes the module (no spacetime/droid CLI on Antara's Mac). Pushed main + ws/*; wrote docs/status/HANDOFF-DV1277.md with six disjoint lanes; posted "HEAD done" (152f694). DV1277 is HEAD now.

## Files touched
- package.json, tsconfig.base.json, CLAUDE.md, AGENTS.md — scaffold
- packages/contracts/** , packages/engine/** — contracts + engine (agents)
- fixtures/matches/mock-basic.json, scripts/gen-mock-basic.ts — K-05
- apps/web/src/{data/**,App.tsx,main.tsx,mobile-entry.tsx,bridge.ts,config.ts} — HEAD web
- apps/runner/src/{index,env,stdb,wiring,candidates,funding}.ts, http/app.ts, fighters/{types,registry}.ts — HEAD runner
- scripts/{gen-bindings,vendor-engine}.mjs, scan-secrets.sh, claim-runner.ts
- docs/status/HEAD.md, docs/status/HANDOFF-DV1277.md

## Decisions made
- Seed totals in §11.8 are dollars -> cents x100 (winner 20000, score_line 10000, beat_clock 10000, first_blood 20000), floor 50¢; MarketSpec.seeds are cents end to end. Why: A1 moved to cents without rescaling; §8.3 says min 50.
- apps/web stays React 19 + Tailwind 4 + KokonutUI (PRD §9.2 amendment pending). Why: platform direction already built on it.
- FundingAdapter stub in packages/contracts/src/money.ts + apps/runner/src/funding.ts. Why: A1 names it, §8.9 never defines it.
- Time base: envelope t and solved[p].atMs are ms since match.created; bell-relative values subtract startedT. Why: §8.4 is silent; beat_clock bug came from this.
- Route registry: apps/web/src/ui/routes/*.tsx via import.meta.glob (order export). Why: §17.4 rule 13 append-only screens; let 5 UI agents work in parallel.
- /m has its own entry (main.tsx dynamic import of mobile-entry vs App). Why: FC-F-222 cellular budget; App pulls Pixi.
- Runner tests run with --no-file-parallelism. Why: F-02 determinism test is wall-clock sensitive.
- DV1277 is HEAD after 152f694; .recall dumps go on branches for him to merge. Why: single writer to main.

## Open threads at end of session
- [ ] DV1277 lanes A–F per docs/status/HANDOFF-DV1277.md (module publish, live adapter K-06b, stdb.ts vs real bindings, Droid fighters, demo mode R-06, README)
- [ ] PRD amendments: Q-001 team, §9.2 React 19/KokonutUI, §8.9 FundingAdapter, §11.8 seed units, §8.4 time bases, card rule (red on 3rd denial)
- [ ] G1: runner -> SpacetimeDB -> two browsers betting -> settled (needs lanes A–C)
- [ ] Merge branch recall/antara-build-wave

## Gotchas
- rm/mv are aliased interactive on this Mac: use /bin/rm -f, /bin/mv -f in scripts.
- spacetime and droid CLIs are NOT installed on Antara's Mac.
- Headless Chrome renders WebGL black; verify arena in the in-app browser pane. Root .claude/launch.json has "web" (main checkout) and "o1-web" (fc-o1, port 5184).
- Google Fonts are unreachable from this machine (harmless console errors).
