# 2026-10-25 — planning/prd-baseline

**Session ID:** 2026-10-25-a
**Repo state:** no git (folder holds only `docs/PRD.md` and `.recall/`)

## Goal
Pick the Cal Hacks 13.0 direction (an AI-agent betting marketplace), map it to sponsor tracks, and write an enterprise-grade PRD that parallel orchestrators and sub-agents can build from without merge conflicts.

## What happened
- Oct 24 ~22:58: the founder pitched a marketplace where humans bet **on** agents: agents with avatars and personalities sword-fight on screen while solving hard problems in the background; fair eval benchmark; prediction-style props ("villain ≥ 90%"); FIFA-style cards; user-built agents on a global leaderboard that earn money.
- Pulled prize data from `hive.hackberkeley.org/api/live/prizes` (58 prizes), the schedule JSON, the Coinbase challenge PDF (Drive), the Atlassian doc (needs a Forge app, so skipped), and the Fetch.ai hackpack.
- Brainstorm reply: name "Fight Card"; the core idea is "the sword fight is the progress bar"; integrals as the launch category with VAR overturns; parimutuel play money; commit-reveal; Spacetime + Factory core, x402/Fetch/ElevenLabs add-ons.
- Founder asked for a full PRD in the format of `~/LA-Hacks-2026/docs/PRD.md` (Headcount: 1) and `~/PetTalk/docs/PRD.md`, with Brawlhalla-style 2D vector art, sprites only, a well-designed FIFA card, a gamified UI, sponsor tech spelled out, pitch and demo, and a build split into scopes and phases for multiple orchestrators.
- Read both reference PRDs. Verified vendor facts from current docs: Droid TS SDK (`docs.factory.ai/sdk/typescript.md`), SpacetimeDB 2.x TS server/client agent skills + CLI skill, x402 seller/buyer quickstarts (`docs.cdp.coinbase.com`).
- Wrote the PRD in 8 parts in the scratchpad, cross-checked IDs (every FC-F/N/D, ADR, Q, task and AC reference resolves; code fences balanced; table pipes escaped), and assembled `docs/PRD.md` (v1.0.0, 2,565 lines, ~222 KB).
- Updated user-level memory (`~/.claude/projects/-Users-DV-HuHaHo/memory/cal-hacks-13.md` + MEMORY.md index).
- Founder confirmed: **team**, not solo. Initialized shared `.recall/` with planning + 7 workstream features.

## Files touched
- `docs/PRD.md` — written (new). Key sections: §5.5 phase plan, §5.6 cut order, §5.7 sponsor register, §8 contracts (frozen at G0), §8.8 SpacetimeDB schema/reducers, §10 design (stage, rig, clips, card, Forge, mobile), §11 agents (families, grammar, referee, prompts, math), §13 demo/pitch, §17 build plan (gates, matrix, rules, task cards, boot prompt), §18 ADR-001…022, §19 Q-001…010.
- `.recall/**` — initialized (shared mode).
- Read only: `~/LA-Hacks-2026/docs/PRD.md`, `~/PetTalk/docs/PRD.md` (format reference; no code reused).
- Outside the repo: user memory `cal-hacks-13.md`, `MEMORY.md`; scratchpad downloads (prizes JSON, Coinbase PDF, Droid/Spacetime/x402 docs).

## Decisions made
- Product: "Fight Card" (working title, Q-007). Humans bet on agents; agents never help bettors.
- Launch category: generated integrals; live 3-point check plus 48-point final check (VAR) with trap problems (missing `abs` in logs).
- Money: play-money chips for humans; test USDC only in agent/treasury wallets (gambling law + Coinbase's "don't manage funds for others").
- Models hidden from bettors **and creators**; creators pick a Standard/Pro tier; a model is locked per fighter version.
- Backend: SpacetimeDB is the only system of record; the runner is the oracle, the module is the escrow.
- Fighters: six house fighters (VEX, SAGE, GLITCH, QUILL, BRICK, PIP), four per match, strategies differ so stats differ.
- Art: original IP in a Brawlhalla-like flat vector style; one shared SVG rig, skins as data; no 3D.
- Sponsors: Spacetime + Factory MUST; Coinbase x402 + ElevenLabs SHOULD; Fetch.ai COULD (decide at G3); Convex, Hyphenate, Visa, CRS, Meta, Atlassian not targeted.
- Build: 8 workstreams (O0 HEAD … O7 Ship), phases P0–P5, gates G-1 01:30 → G5 08:45 assuming a 01:00 kickoff; a worktree per orchestrator, single file owner, HEAD merges in a fixed order.

## Open threads at end of session
- [ ] K-01 scaffold: `git init`, workspaces, deps, stubs, worktrees, `CLAUDE.md`/`AGENTS.md`; commit `.recall/` with it (shared mode)
- [ ] Update PRD Q-001 → resolved (team); assign humans to workstreams (H-07)
- [ ] H-01: Factory API key, `droid` CLI, `python3 -m pip install sympy`, `scripts/list-models.ts` → `FC_MODEL_*` (Q-002)
- [ ] H-02: SpacetimeDB CLI + `spacetime login` + Maincloud DB `fightcard` (Q-004)
- [ ] H-03: Coinbase verified account per member + CDP keys + faucet (Q-005); every team member needs one for the Coinbase prize
- [ ] Gate times assume a 01:00 kickoff; shift every gate if kickoff slips (§17.2)

## Gotchas
- The Fetch.ai track requires the workflow to run inside ASI:One, Agentverse (Innovation Lab) registration, README agent addresses, a **3–5 min video**, and registration via the ASI:One submission agent. Too heavy unless G3 is green.
- Droid SDK `disabledToolIds` is subtractive only (there is no allowlist); real control comes from `autonomyLevel: Off` + `permissionHandler`. Async `tool()` handlers and an `env` option are unverified (Q-003 → F-01).
- SpacetimeDB 2.x syntax changed from 1.x: one `schema({...})` default export, reducers as `export const x = spacetimedb.reducer(...)`, `t.u64()` is bigint. Install the CLI with the curl script, not cargo.
- x402 packages moved to `@x402/*` + `@coinbase/cdp-sdk/x402` (`createX402Server`, `CdpX402Client`); old `x402-express` snippets are outdated. Per-fighter wallets need named CDP accounts wired as signers (I-01 verifies).
- The prizes page renders client-side; use the JSON API (`/api/live/prizes`, `/schedule`). The Creao doc needs sign-in.
- Agent-betting was the founder's first idea this weekend (dropped for "Fraud Fight Club", then revived); four other directions came before it.
