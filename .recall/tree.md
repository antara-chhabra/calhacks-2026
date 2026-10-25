# Fight Card (Cal Hacks 13.0)

Last touched: 2026-10-25

## Features

- **planning** [active] — HEAD done (152f694): scaffold, contracts, engine, replay, runner wiring all on main, 540 tests; DV1277 is HEAD with 6 lanes (docs/status/HANDOFF-DV1277.md)
  - paths: `docs/PRD.md`, `docs/status/HEAD.md`, `docs/requests/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring}.ts`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, `package.json`, `tsconfig*.json`, `.env.example`, `CLAUDE.md`, `AGENTS.md`
  - last: 2026-10-25 (head-build-wave)
- **arena** [active] — O1: A-01…A-09 done — 6 fighters, stage, clips, cue player, VFX, labels, intro/outro; full fight on /replay/mock-basic
  - paths: `apps/web/src/arena/**`, `apps/web/public/art/**`, `docs/art-bible.md`, `docs/{status,requests}/O1.md`
  - last: 2026-10-25 (arena-build)
- **platform** [active] — O2: U-01…U-09 on store data (KokonutUI black): lobby, match/results, bet slip, cards, leaderboard, Forge, /m, Director, receipt
  - paths: `apps/web/src/{ui,styles,pages,components,lib}/**`, `apps/web/src/index.css`, `apps/web/{index.html,components.json,vite.config.ts,tsconfig.json,package.json}`, `docs/{status,requests}/O2.md`
  - last: 2026-10-25 (platform-screens)
- **backend** [active] — O3: module B-01…B-05 written, typechecked only — never published (DV1277 lane A)
  - paths: `spacetime/**`, `docs/{status,requests}/O3.md`
  - last: 2026-10-25 (module-reducers)
- **runtime** [active] — O4: R-01…R-05 — problems/VAR, full lifecycle, admin/BYO, season, smoke PASS (fake stdb)
  - paths: `apps/runner/src/{match,problems,season}/**`, `apps/runner/src/http/{admin,byo}.ts`, `scripts/{smoke,record,recompute,try-problems}.ts`, `docs/{status,requests}/O4.md`
  - last: 2026-10-25 (match-runtime)
- **fighters** [active] — O5: mock backend + personas done; real Droid fighters are DV1277 lane D
  - paths: `apps/runner/src/fighters/**`, `apps/runner/bin/**`, `agents/**`, `scripts/{try-fighter,list-models}.ts`, `docs/{status,requests}/O5.md`
  - last: 2026-10-25 (mock-and-personas)
- **integrations** [active] — O6: I-03 procedural WebAudio SFX installed; payments/ElevenLabs/Fetch deferred
  - paths: `apps/runner/src/payments/**`, `apps/runner/src/http/public-bookie.ts`, `apps/web/src/audio/**`, `apps/web/public/audio/**`, `services/fetch-agent/**`, `scripts/{gen-barks,try-x402}.ts`, `submission/coinbase.md`, `docs/{status,requests}/O6.md`
  - last: 2026-10-25 (procedural-sfx)
- **ship** [active] — O7: README, Devpost, pitch, sponsor artifacts; Figma-track stage log running (`submission/figma-stage-log.md`)
  - paths: `README.md`, `submission/**`, `docs/SPONSORS.md`, `docs/{status,requests}/O7.md`
  - last: 2026-10-25 (figma-stage-log)
