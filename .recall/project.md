# Fight Card (Cal Hacks 13.0)

<!--
Project-level facts that don't belong to any single feature.
Keep dense; this is for orientation, not docs. Source of truth for everything: docs/PRD.md.
-->

## What it is
- A league where humans bet play-money chips **on** AI agents (never with them). Persona agents with hidden models solve integrals; a 2D sword fight renders verified hits/misses; a strict final check (VAR) can overturn hits; FIFA-style cards come from real match history; anyone can forge a fighter.
- Event: Cal Hacks 13.0, Palace of Fine Arts SF. Devpost due **Sun Oct 25 09:00 PDT** (team target 08:45); table judging 10:30–12:30, 5 min per judge. **Team** (not solo; Best Solo N/A).
- Clean-room: no code from `~/LA-Hacks-2026` or any prior repo (Cal Hacks disqualifies prior work).

## Repository
- GitHub: https://github.com/antara-chhabra/calhacks-2026 (public, owner Antara Chhabra; DV1277 has push). Default branch `main`.
- Local: `~/Cal-Hacks-2026` tracks `origin/main`. Workstream branches will be `ws/<ws>` (PRD §17.4).

## Stack (planned, PRD §9.2)
- Language: TypeScript strict, Node ≥ 22.9, npm workspaces (`@fc/contracts`, `@fc/engine`, `apps/web`, `apps/runner`, `spacetime`)
- Web: React 18.3.1 + Vite 5.4 + zustand 4.5; arena PixiJS 8 + GSAP 3.13; KaTeX; react-router 6
- Datastore: SpacetimeDB 2.x TypeScript module (system of record + realtime), Maincloud primary, local `spacetime start` fallback
- Agents: Factory Droid SDK (`@factory/droid-sdk/node`) + `droid` CLI; mathjs verifier in the runner
- Payments: `@coinbase/cdp-sdk` + `@x402/*` on Base Sepolia (`eip155:84532`), testnet only
- Deploy target: runner on presenter laptop; web on Vercel or cloudflared tunnel; public runner port via cloudflared

## Entry points (planned; created by K-01)
- Dev: `npm run dev:web`, `npm run runner`, `spacetime start`
- Tests: `npm run typecheck`, `npm test`, `npm run smoke`
- Codegen: `npm run gen` (SpacetimeDB bindings, gitignored)
- Ops: `npm run claim-runner`, `npm run record -- <matchId> <name>`, `npm run scan:secrets`

## Conventions
- PRD is the single source of truth; only HEAD edits it; requests go to `docs/requests/<ws>.md`.
- One git worktree per orchestrator (`../fc-<ws>`, branch `ws/<ws>`), one owner per file, HEAD merges at gates in order O3→O4→O5→O6→O1→O2→O7.
- Commits `[TaskID] summary`, owned paths only, never `git add -A`.
- Requirement IDs `FC-F/N/D-xxx`, ADRs `ADR-0xx`, task cards K/A/U/B/R/F/I/D-xx.
- Model IDs live only in `.env` (`FC_MODEL_*`); never in DB, events, bundle, fixtures or repo.

## External services
- Factory (Droid SDK, `FACTORY_API_KEY`), SpacetimeDB Maincloud, Coinbase CDP + x402 facilitator, ElevenLabs, Fetch.ai Agentverse/ASI:One (COULD).
