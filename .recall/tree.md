# En Garde (Cal Hacks 13.0)

Last touched: 2026-10-25

## Features

- **planning** [active] — A3 all8 categories merged into main6f90ac8 after recall1e5913b;624 tests/typecheck/build pass on merged revision; public A3 cutover pending
  - paths: `docs/PRD.md`, `docs/status/HEAD.md`, `docs/requests/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring,candidates}.ts`, `apps/runner/src/control/**`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, `package.json`, `tsconfig*.json`, `.env.example`, `CLAUDE.md`, `AGENTS.md`
  - last: 2026-10-25 (challenge-categories)
- **arena** [active] — Pixel-art fighters live on main 36d96f4 (jumbotron + bubble fixes); vector look kept on branch built-with-vector-art
  - paths: `apps/web/src/arena/**`, `apps/web/public/art/**`, `docs/art-bible.md`, `docs/{status,requests}/O1.md`
  - last: 2026-10-25 (pixel-merge)
- **platform** [active] — All8 category tabs/leaderboards/Director active and filtered; shuffled squad slots/results and post-reveal prompts verified; merged main6f90ac8
  - paths: `apps/web/src/{ui,styles,pages,components,lib}/**`, `apps/web/src/index.css`, `apps/web/{index.html,components.json,vite.config.ts,tsconfig.json,package.json}`, `docs/{status,requests}/O2.md`
  - last: 2026-10-25 (challenge-categories)
- **backend** [active] — A3 module live on Maincloud `fightcard` (additive migration, runner claim intact); demo smoke PASS on Maincloud
  - paths: `spacetime/**`, `docs/{status,requests}/O3.md`
  - last: 2026-10-25 (challenge-categories)
- **runtime** [active] — Category-aware generation/live/final checks, actual bounded JS functions, fresh web snapshots and squad team markets; merged main6f90ac8
  - paths: `apps/runner/src/{match,problems,season}/**`, `apps/runner/src/http/{admin,byo}.ts`, `scripts/{smoke,smoke-challenges,record,recompute,try-problems}.ts`, `docs/{status,requests}/O4.md`
  - last: 2026-10-25 (challenge-categories)
- **fighters** [active] — Mode-aware locked Factory-droid personas merged (main 44922fa); 24/24 live persona runs across 4 modes; sandboxes outside repo; native tools disabled
  - paths: `apps/runner/src/fighters/**`, `apps/runner/bin/**`, `agents/**`, `scripts/{try-fighter,list-models}.ts`, `docs/{status,requests}/O5.md`
  - last: 2026-10-25 (mode-personas)
- **integrations** [active] — O6: x402/CDP wallets, audio + ElevenLabs, Fetch.ai (COULD); not started (P0: I-01 spike)
  - paths: `apps/runner/src/payments/**`, `apps/runner/src/http/public-bookie.ts`, `apps/web/src/audio/**`, `apps/web/public/audio/**`, `services/fetch-agent/**`, `scripts/{gen-barks,try-x402}.ts`, `submission/coinbase.md`, `docs/{status,requests}/O6.md`
  - last: 2026-10-25 (initial)
- **ship** [active] — A3 README/evidence ready; final Devpost/pitch/media and public challenge revision refresh remain pending
  - paths: `README.md`, `submission/**`, `docs/SPONSORS.md`, `docs/{status,requests}/O7.md`
  - last: 2026-10-25 (challenge-categories)

## Resume warning

main = origin/main = `36d96f4` (A3 categories + mode-aware personas + pixel fighters). Vector art snapshot: branch `built-with-vector-art`. Live deploy from `.arena/worktrees/fc-merge` (detached main): runner :8797/:8798 on Maincloud `fightcard`, web https://ist-colleagues-twisted-variations.trycloudflare.com (quick tunnel; changes on restart). All 7 non-integral modes verified with real Droid matches (local), then seeded on Maincloud (one real settled match each, 07:23–07:32) and the season loop turned on (rotates all 8 categories; `FC_SEASON=on` in fc-merge `.env`). Integrations summary is older than merged I-03 work.