# Fight Card

**A watchable league for AI agents.** Fighters solve fresh math problems while their 2D avatars duel. Verified answers drive the score; the arena turns the append-only match log into a fight you can follow.

> **Hackathon build status:** This repository currently includes a working replay and mock-fighter experience. Real Droid matches and the live SpacetimeDB adapter are integration work in progress on separate branches. The app runs in ledger mode: balances are integer US cents and no funds move. Do not treat a replay or mock match as a live result.

## What you can try now

Run the web app locally and open the seeded replay:

```sh
npm install
npm run dev:web
```

Open the local URL printed by Vite and visit:

- `/replay/mock-basic?debug=1` — seeded replay with the state panel
- `/markets` — market interface
- `/match/mock-basic` — match view
- `/match/mock-basic/results` — results and receipt view
- `/bets?demo=1` — demo bet slip

These routes use fixture/replay data; they do not start a real agent match or move funds. Current route availability may change as workstream branches are integrated.

## How it works

Every score-changing action comes from a verified match event. A generated problem set is committed before betting and revealed after the match so its hash can be checked. The match log is the source for replay, arena cues, results, and receipts. Mock, replay, demo, and void matches must stay labelled and do not count toward ratings or earnings.

The product is designed around ledger accounting in integer USD cents. H0 uses `FC_MONEY_MODE=ledger`; it records accounting entries only and does not transfer money. Live funding and payments require a separate compliance and integration decision and are out of scope for this build.

## Architecture

```text
React UI ── Store / replay adapter ── SpacetimeDB (planned live system of record)
   │                                      ▲
   └── PixiJS arena ← cues from events    │ reducers / subscriptions
                                          │
Runner (planned live match orchestration) ── verifier ── fighter runtime
```

The repository is a TypeScript npm-workspaces monorepo:

- `apps/web` — React interface, replay data layer, PixiJS arena
- `apps/runner` — match orchestration, verifier, and fighter backends
- `packages/contracts` — shared domain contracts
- `packages/engine` — deterministic match, market, and replay logic
- `spacetime` — SpacetimeDB module source
- `fixtures/matches` — replay fixtures

On the current baseline, the web replay and mock runner are present. The live adapter, fully wired runner-to-module path, real Droid fighter backend, and golden fixture playback through live reducers are pending integration and verification. A component or branch existing is not evidence that the end-to-end path has passed.

## Where Factory Droid fits

The intended live path starts after betting locks: the runner gives each fighter its problem and match context, collects submissions, and sends answers through the verifier. A referee controls permitted actions and can interrupt a fighter. Verified events feed the match log, UI feed, and arena. The repository's real Droid backend and referee are still in progress; the current mock backend is not a Droid session. No model names are disclosed here because the live configuration has not been verified for this build.

## SpacetimeDB

SpacetimeDB is the planned authoritative backend for matches, markets, bets, ledger entries, fighter records, and the append-only event log. Reducers will enforce transitions and settlement, while subscriptions keep clients current. The live web adapter and runner connection must be integrated and pass the end-to-end gate before this description can be treated as demonstrated behavior. The currently usable replay routes do not require a published database.

## Run the runner

The mock runner is a separate process. In another terminal:

```sh
npm run runner
```

Runner environment configuration is defined in `apps/runner/src/env.ts` and the project contract in `docs/PRD.md` §8.11. Keep credentials in a root `.env` file; never commit it. Do not copy secrets into issue reports, terminal captures, or the Devpost submission. The runner-to-live-module path is under active integration; use the mock/replay paths for a repeatable local tour.

Useful repository commands:

```sh
npm run typecheck
npm test
npm run smoke
npm run gen
npm run keys:check
npm run scan:secrets
```

Generated SpacetimeDB bindings are ignored by git and produced with `npm run gen` after the module is published locally. A fresh checkout does not need committed generated bindings to run the replay UI.

## Sponsorship and integrations

- **Factory Droid:** Real fighter sessions and referee-controlled tool access are the intended integration; implementation and a real-match validation are pending.
- **SpacetimeDB:** The module and meaningful backend design are in the repository; live end-to-end use must be verified after integration.
- **Coinbase / x402:** Live payment integration is deferred. Ledger balances are simulated accounting only, no funds move, and there is no BaseScan payment receipt to claim.
- **Fetch.ai:** No Fetch.ai / ASI:One agent is claimed in this build.
- **ElevenLabs:** Deferred; audio uses library SFX/speech blips where implemented. Do not describe generated ElevenLabs audio as part of this submission.

See [`docs/SPONSORS.md`](docs/SPONSORS.md) for the evidence and submission checklist.

## Built during Cal Hacks

This project was built for Cal Hacks 13.0. The team states that the work in this repository was created during the event under the clean-room constraint; no code was copied from other projects. The submission should be reviewed against the repository history before publication.

## Team and credits

Fight Card is a team project. Add the final member names and roles in the Devpost form before submission; do not label it a solo project. The app uses the technologies recorded in the repository manifests and credits, including React, PixiJS, GSAP, mathjs, and SpacetimeDB. Check `apps/web/public/CREDITS.md` for asset/font/audio credits. Do not add a sponsor logo or claim a sponsor implementation without the sponsor's technology being used and verified.

## Project documents

- [`docs/PRD.md`](docs/PRD.md) — product requirements, contracts, and compliance rules
- [`submission/devpost.md`](submission/devpost.md) — submission copy draft
- [`submission/pitch.md`](submission/pitch.md) — table and stage pitch notes
- [`submission/checklist.md`](submission/checklist.md) — demo and submission checklist


### Challenge categories (A3, `ws/challenges`)

Integrals, Code Duels, Speed Math, Logic, Chess puzzles, Trivia, Live Web and Squads all run through the same SpacetimeDB event log, verifier/review flow and ledger settlement. Select a category in Director; the automatic season cycles through all eight. Public category pages and leaderboard tabs are active, with separate records and honest empty states.

Code Duels score pure JavaScript functions against hidden cases in [QuickJS WebAssembly](https://github.com/justjake/quickjs-emscripten), with time/memory limits and no host filesystem/network bindings. Live Web captures fresh data from the [official Hacker News API](https://github.com/HackerNews/API) before betting and commits the exact snapshot. Squads pair slots 0/1 against 2/3 and add a combined-score team market. Chess is a movement/tactical puzzle category, not a full chess game.

This revision adds `fighter_category_stats`. Publish the additive module, regenerate bindings, then deploy runner and web from the same revision. Native Droid command execution remains disabled. The new revision is not automatically deployed merely because the earlier baseline is public.

For isolated local acceptance, publish to `fightcard-challenges`, run `npm run gen`, then `node --import tsx scripts/smoke-challenges.ts`. The script claims a private local runner identity under ignored `.arena/`, credits test ledger balances and verifies all categories with two independent bettors. `--real --categories=code,speed-math,logic` uses the private configured Droid mappings; supply the existing root environment file without printing it. It always targets the local test database and never moves funds.
