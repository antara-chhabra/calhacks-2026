# Fight Card (Cal Hacks 13.0)

Last touched: 2026-10-25

## Features

- **planning** [active] — PRD v1.0.0 baselined (docs/PRD.md); HEAD (O0) owns PRD, contracts, engine, data layer, scaffold; build not started
  - paths: `docs/PRD.md`, `docs/status/HEAD.md`, `docs/requests/HEAD.md`, `packages/**`, `fixtures/**`, `apps/web/src/data/**`, `apps/web/src/{main,App,config}.tsx`, `apps/web/src/bridge.ts`, `apps/runner/src/{index,env,stdb,wiring}.ts`, `apps/runner/src/http/app.ts`, `apps/runner/src/fighters/{types,registry}.ts`, `scripts/*.mjs`, `scripts/{claim-runner.ts,scan-secrets.sh}`, `package.json`, `tsconfig*.json`, `.env.example`, `CLAUDE.md`, `AGENTS.md`
  - last: 2026-10-25 (prd-baseline)
- **arena** [active] — O1: Pixi SVG-rig sword-fight renderer; not started (P0: A-01, A-02)
  - paths: `apps/web/src/arena/**`, `apps/web/public/art/**`, `docs/art-bible.md`, `docs/{status,requests}/O1.md`
  - last: 2026-10-25 (initial)
- **platform** [active] — O2: React UI, FIFA cards, Forge, /m mobile; not started (P0: U-01)
  - paths: `apps/web/src/ui/**`, `apps/web/src/styles/**`, `docs/{status,requests}/O2.md`
  - last: 2026-10-25 (initial)
- **backend** [active] — O3: SpacetimeDB 2.x module (markets, bets, fight log, settlement); not started (P0: B-01)
  - paths: `spacetime/**`, `docs/{status,requests}/O3.md`
  - last: 2026-10-25 (initial)
- **runtime** [active] — O4: problem generator/verifier, match lifecycle, VAR, season loop; not started (P0: R-01)
  - paths: `apps/runner/src/{match,problems,season}/**`, `apps/runner/src/http/{admin,byo}.ts`, `scripts/{smoke,record,recompute,try-problems}.ts`, `docs/{status,requests}/O4.md`
  - last: 2026-10-25 (initial)
- **fighters** [active] — O5: Droid SDK fighters, referee, personas, mock/direct/BYO; not started (P0: F-01 spike)
  - paths: `apps/runner/src/fighters/**`, `apps/runner/bin/**`, `agents/**`, `scripts/{try-fighter,list-models}.ts`, `docs/{status,requests}/O5.md`
  - last: 2026-10-25 (initial)
- **integrations** [active] — O6: x402/CDP wallets, audio + ElevenLabs, Fetch.ai (COULD); not started (P0: I-01 spike)
  - paths: `apps/runner/src/payments/**`, `apps/runner/src/http/public-bookie.ts`, `apps/web/src/audio/**`, `apps/web/public/audio/**`, `services/fetch-agent/**`, `scripts/{gen-barks,try-x402}.ts`, `submission/coinbase.md`, `docs/{status,requests}/O6.md`
  - last: 2026-10-25 (initial)
- **ship** [active] — O7: README, Devpost, pitch, sponsor artifacts; starts at G3
  - paths: `README.md`, `submission/**`, `docs/SPONSORS.md`, `docs/{status,requests}/O7.md`
  - last: 2026-10-25 (initial)
