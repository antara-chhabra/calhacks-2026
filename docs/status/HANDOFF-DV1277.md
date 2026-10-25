# Handoff — DV1277's agent set (from Antara's HEAD session, 2026-10-25 ~04:00)

Goal: DV1277 runs his own orchestrators/sub-agents in parallel with Antara's, with **zero file overlap**.
Everything below is assigned by path. If a change is needed outside your paths, append a request to
`docs/requests/<ws>.md` and keep going on a stub (PRD §17.4 rule 5).

## Where things stand (main @ the commit that added this file)
- Done and on `main`: contracts, engine, fixture `mock-basic`, replay data layer, runner skeleton + full wiring
  (Director, `runMatch`, season loop, smoke/record/recompute), problems + VAR checks, mock fighter backend,
  house personas, module reducers B-01…B-05 (typechecked only — **never published**), arena (rigs, stage,
  clips, cue player, VFX, labels), platform U-01…U-05 (shell, cards, lobby, match + results, bet slip).
- Antara's session is **finishing** (no new work): O1 A-09 (`apps/web/src/arena/**`), O2 U-06…U-09
  (`apps/web/src/ui/{profile,leaderboard,forge,mobile,director,receipt}/**`, `ui/widgets.tsx`,
  `ui/routes/{40,45,50,60,70,26}-*.tsx`), O6 I-03 SFX (`apps/web/src/audio/**`), and one HEAD line in
  `apps/web/src/App.tsx`. These merge to `main` in the next ~30 min. **Do not edit those paths.**

## DV1277 owns (needs your machine: `spacetime` CLI, `droid` CLI, Factory key)

| Lane | Branch / worktree | Cards | WRITE paths (only these) |
|---|---|---|---|
| **A. Module live** (O3) | `ws/o3` → `../fc-o3` | K-08 build check, publish `fightcard-o3` locally, B-06 auth matrix + Maincloud runbook, fix any build errors | `spacetime/**`, `docs/{status,requests}/O3.md` |
| **B. Live web adapter** (HEAD K-06b) | `ws/o0-live` → `../fc-o0` | K-06b: SpacetimeDB adapter (bindings → `Store`) implementing the `LiveAdapter` seam in `apps/web/src/data/adapter.ts`; `setLiveAdapter` in `store.ts`; catch-up rule; `placeBet/register/createFighter/creditTestFunds` via reducers; `conn` states | `apps/web/src/data/**` (new files + `store.ts`), `apps/web/test/data-*.test.ts` |
| **C. Runner ↔ real module** (HEAD K-07 follow-up) | same `ws/o0-live` | `npm run gen`, `claim-runner`, fix `apps/runner/src/stdb.ts` against the real generated bindings (it was written blind: reducer arg shapes, u64 bigint conversions, `listActiveMatches`), `npm run smoke -- --live` green | `apps/runner/src/stdb.ts`, `scripts/claim-runner.ts`, `scripts/gen-bindings.mjs` |
| **D. Droid fighters** (O5) | `ws/o5` → `../fc-o5` | F-01 spike, F-03 droid backend, F-04 referee + `bin/droid-sandboxed`, F-07 real-match validation, F-06 direct fallback (if time), F-08 BYO example | `apps/runner/src/fighters/**` **except** `types.ts`, `registry.ts` (HEAD — request a registry line), `apps/runner/bin/**`, `agents/**`, `scripts/{try-fighter,list-models}.ts`, `docs/{status,requests}/O5.md` |
| **E. Demo mode** (O4) | `ws/o4` → `../fc-o4` | R-06 `FC_MODE=demo`: golden fixture through live reducers | `apps/runner/src/match/**`, `apps/runner/src/season/**`, `apps/runner/src/http/{admin,byo}.ts`, `scripts/{smoke,record,recompute,try-problems}.ts`, `docs/{status,requests}/O4.md` |
| **F. Ship docs** (O7) | `ws/o7` → `../fc-o7` | D-01 README draft (sections in PRD §13/§15.7), Devpost text draft | `README.md`, `submission/**` (except `coinbase.md`), `docs/SPONSORS.md`, `docs/{status,requests}/O7.md` |

Antara keeps: `apps/web/src/{arena,ui,audio,pages,components,styles}/**`, `apps/web/src/App.tsx`, `main.tsx`,
`bridge.ts`, `config.ts`, `index.css`, `packages/**`, `fixtures/**`, `docs/PRD.md`, all `package.json` files and the lockfile
(need a dependency? `DEP` request in `docs/requests/HEAD.md`).

## Rules that keep it conflict-free
1. One worktree per lane: `git fetch && git worktree add ../fc-o0 -b ws/o0-live origin/main` (others: the existing `ws/o3`, `ws/o4`, `ws/o5`, `ws/o7` — first `git merge --ff-only origin/main` in each; if it won't fast-forward, `git merge origin/main`).
2. `git add <your paths>` only. Never `git add -A`. Commit messages `[TaskID] summary`. Never force-push.
3. Push your `ws/*` branch; **do not merge into `main` until Antara's session posts "HEAD done" in `docs/status/HEAD.md`**. After that, DV1277 is HEAD and merges in PRD order O3 → O4 → O5 → O6 → O1 → O2 → O7 (`git merge --no-ff ws/<x>`), runs `npm run typecheck && npm test && npm run smoke`, pushes `main`.
4. Generated bindings (`**/module_bindings/`) stay gitignored. `.env` never committed. Never print model IDs.
5. If you find a bug in someone else's paths, file `BUG-IN-<ws>` in `docs/requests/<ws>.md` — don't fix it in place.

## Order of attack (dependencies)
A (publish) → C (gen + claim-runner + stdb fixes) → B (web adapter) → `npm run smoke -- --live` → G1 check: runner → SpacetimeDB → two browsers betting → settled.
D runs in parallel from the start (F-01 needs only the droid CLI + key). E and F are independent.

## Boot prompt for each of your orchestrators (fill the brackets)
```
You are orchestrator <lane letter + name> for En Garde. Source of truth: docs/PRD.md; also read
docs/status/HANDOFF-DV1277.md and CLAUDE.md. Worktree: <path> on branch <branch>.
WRITE paths: <from the table>. Everything else is read-only.
Run the cards in dependency order; parallelize sub-agents only when their WRITE files don't overlap.
Verify each card's "Done when" yourself (typecheck, tests, real run) before committing.
Commit owned paths only with [TaskID] messages; push the branch; do not merge into main.
Need a change outside your paths, a dependency or a contract change? Append to docs/requests/<ws>.md.
Never print, log or commit secrets or model IDs.
```

## Known facts that save time
- Module: SDK 2.13 views must be `public: true` (filtered by `ctx.sender`); reducers export snake_case; seeds are **cents**; `match.intro` is postable only while `locked`; `appendEvent` (`spacetime/src/events.ts`) is the only writer of `fight_event`; `applyLedger` (`spacetime/src/logic/ledger.ts`) the only writer of balances. Build may need a `spacetime.json` — see `docs/requests/O3.md`.
- Runner: `FC_ENGINE=mock npm run runner` boots with stdb `down`; `npm run smoke` passes in fake mode; `POST /admin/matches` runs a full mock match against the fake stdb (`apps/runner/test/wiring.test.ts`).
- Web: `/replay/mock-basic?debug=1`, `/markets`, `/match/mock-basic`, `/match/mock-basic/results`, `/bets?demo=1` all run on replay data today.
