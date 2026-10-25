# En Garde (Cal Hacks 13.0)

<!--
Project-level facts that don't belong to any single feature.
Keep dense; this is for orientation, not docs. Source of truth for everything: docs/PRD.md.
-->

## What it is
- A league where humans bet integer USD-cent ledger balances **on** AI agents (never with them); H0 is ledger-only, “Ledger mode · no funds moved”. Persona agents with hidden models solve category challenges (integrals, code, speed math, logic, chess puzzles, trivia, frozen live-web data and squads); a 2D sword fight renders verified hits/misses; a strict final check (VAR) can overturn hits; FIFA-style cards come from real match history; anyone can forge a fighter.
- Event: Cal Hacks 13.0, Palace of Fine Arts SF. Devpost due **Sun Oct 25 09:00 PDT** (team target 08:45); table judging 10:30–12:30, 5 min per judge. **Team** (not solo; Best Solo N/A).
- Clean-room: no code from `~/LA-Hacks-2026` or any prior repo (Cal Hacks disqualifies prior work).

## Repository
- GitHub: https://github.com/antara-chhabra/calhacks-2026 (public, owner Antara Chhabra; DV1277 has push). Default branch `main`.
- Local: `/Users/DV/Cal-Hacks-2026`. main includes A3 challenge merge `6f90ac8` after recall snapshot `1e5913b`; implementation branch `ws/challenges` is `6a3b1d2`. Earlier eight workstreams merged at638e598. Worktrees under ignored `.arena/worktrees/` (`fc-merge` has installed deps + bindings); `.arena/combined` is obsolete.

## Stack (implemented branches; PRD §9.2)

- TypeScript strict, Node ≥ 22.9, npm workspaces (`@fc/contracts`, `@fc/engine`, `apps/web`, `apps/runner`, `spacetime`). Scaffold/dependencies exist.
- Web: React 19.1, Vite 5.4, Tailwind 4.1, react-router 6.30, zustand, KokonutUI black platform; PixiJS 8 + GSAP arena, KaTeX. PRD v1.3 A3 on `ws/challenges` records the category expansion and actual stack.
- SpacetimeDB 2.x TypeScript module is the system of record. Baseline published to local `fightcard-o3` and Maincloud `fightcard`. A3 published separately to local `fightcard-challenges`; public A3 schema/runner/web cutover is pending.
- Factory Droid SDK + CLI, mathjs live/final verifier; direct and HTTP BYO backends implemented. Native filesystem/discovery/Execute tools and Python verification are disabled pending verified OS isolation. The launcher only sanitizes environment.
- Integer US cents, `FC_MONEY_MODE=ledger` only in H0; `FundingAdapter` isolates funding. Coinbase/x402/CDP, ElevenLabs and Fetch.ai are deferred; no actual moved-funds claim.
- Earlier baseline is publicly served from the independent deployment/persona workstream. The A3 revision has local acceptance only; do not imply it has replaced that public build.

## Entry points

- Run against the intended revision; `.arena/combined` is obsolete. ws/challenges is merged into main6f90ac8; merged revision has installed deps and regenerated ignored bindings. Independent ws/personas remains separate.
- Dev: `npm run dev:web`, `npm run runner`, `spacetime start`.
- Checks: `npm run typecheck`, `npm test`, web production build, `npm run smoke`.
- Bindings: `npm run gen` (ignored output); module auth acceptance: `spacetime/test/auth-live.ts`.
- Ops: `npm run claim-runner`, `npm run record -- <matchId> <name>`, `npm run scan:secrets`, `npm run keys:check`.
- Local services last observed at SpacetimeDB `127.0.0.1:3000` / `fightcard-o3`, assembled runner admin/public `8787/8788`, Vite `5179`; check liveness. Durable data is under ignored `.arena/spacetime-local`.
- Challenge acceptance: `node --import tsx scripts/smoke-challenges.ts` (only local fightcard-challenges); `--real` uses private configured low-cost Droid mappings. Preview last observed at5182, challenge runner8791/8792, seasonOFF. Its test identity/helpers/results are ignored under the challenge worktree `.arena/`.

## Conventions
- PRD is the single source of truth; only HEAD edits it; requests go to `docs/requests/<ws>.md`.
- One git worktree per orchestrator (current machine: `.arena/worktrees/fc-*`, branch `ws/*`), one owner per file. HEAD merge order: O3→O4→O5→HEAD→O1→O2→O7, then bindings and final regression (done once at 638e598).
- Commits `[TaskID] summary`, owned paths only, never `git add -A`.
- Requirement IDs `FC-F/N/D-xxx`, ADRs `ADR-0xx`, task cards K/A/U/B/R/F/I/D-xx.
- Model IDs live only in `.env` (`FC_MODEL_*`); never in DB, events, bundle, fixtures or repo.

## External services

- Available locally: Factory Droid SDK/CLI (private API key in ignored `.env`), SpacetimeDB CLI/server with a claimed runner identity.
- User-approved GLITCH/PIP mapping uses verified Standard; all six house and both tier mappings available. Actual model IDs remain private. QUILL low reasoning effort configured.
- Baseline Maincloud/public hosting exists; A3 challenge cutover, public runner BYO acceptance and phone-on-cellular flow remain pending. Coinbase/x402, ElevenLabs and Fetch.ai remain deferred.

## Challenge evaluator boundary (A3)

- One event/ledger backend for all8 categories. Code: QuickJS WebAssembly, fresh VM per case,8MiB memory,512KiB stack,100ms interruption, no host bindings;3 live cases versus12 final cases. Native Droid execution still disabled.
- LiveWeb: fixed official HN API, fresh frozen source committed before betting, bounded fetch, deterministic extraction; failure prevents a market opening. Squads: public slots0/1 vs2/3, combined-score team market, no teammate targeting.
- Additive fighter_category_stats persists each category’s stats/Elo. Legacy fighter_stats/fighter.elo stay integral; category history reload is implemented. Community candidate/debut/rotation loading remains pending.
