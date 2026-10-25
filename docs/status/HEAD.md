# Status — HEAD (O0)

## DV1277 runner integration — in progress
- K-07 follow-up: connected registry factories for Droid, Direct and HTTP; candidate effort mapping (`FC_EFFORT_<ID>`); shared single-match control for live/demo/season; golden-var demo starts on fresh `m_demo_*` IDs and uses the O4 replay through reducers; kill switch now blocks manual and demo starts. Demo fixture loading occurs before slot acquisition and preserves `fixture_unavailable` visibly. When SpacetimeDB is up, startup registers/refreshes all six house fighters with public data, strategy and tier; registration failure stops startup.
- Demo/mock runs do not update candidate rotation or real season counters. Shutdown aborts and awaits all active runner runs.
- Added runner tests for effort parsing/mapping, fixture failure, cross-mode concurrency, demo-mode routing, kill switch, history exclusion, demo failure cleanup, and startup registration paths. Combined overlay: full typecheck passes; runner 148 tests pass across 19 files.
- HUMAN config: all six house mappings and both tiers verified against the catalog; GLITCH/PIP have no existing public module rows, so their first registration starts at version 1. Local values remain private.

## Gates

| Gate | Planned | Status |
|---|---|---|
| G-1 Scaffold | 01:30 | Done ~02:45 (`538dded`): workspaces install and typecheck; §8.7/§8.9 stubs; worktrees `../fc-o1`…`../fc-o7` on `ws/o1`…`ws/o7`; requests/status files. H-01 done; H-02 partial (see Blocked) |
| G0 Contracts frozen | 02:15 | HEAD side done ~02:55 (`6acc6a2`): K-02–K-05, K-07 green (125 tests). Merged ~03:20 (`4f2a6d4`): B-01 (O3, typecheck only — not published), R-01 (O4), A-01 VEX (O1), K-06a replay. 184 tests green. Still open for G0: F-01 Droid spike (no `droid` CLI here), K-08 module build (no `spacetime` CLI here) |

Kickoff ran ~1h40 late. Per §17.2, gates shift by the delay; §5.6 cut order applies at G2.

## Done
- K-01 scaffold (`538dded`). Notes:
  - `apps/web` stays on React 19.1 + Tailwind 4.1 + KokonutUI (platform decision); PRD §9.2 still says React 18.3.1 → amendment pending.
  - x402 / CDP packages **not** installed: payments are deferred (H-03, `FC_PAYMENTS=off`). O6 files a `DEP` request when I-01 resumes.
  - `FundingAdapter` (A1) is named in FC-F-100 but not defined in §8.9. HEAD stub: `packages/contracts/src/money.ts` + `apps/runner/src/funding.ts`. PRD §8.9 amendment pending.
  - Scripts: `keys.mjs` covers the PRD's `setup-keys`/`check-keys` (`npm run keys`, `npm run keys:check`).
  - Each workstream's local web port: `FC_WEB_PORT=<5173+n> npm run dev:web`.

## In progress (sub-agents, P1)
- O3: B-02 match reducers · B-03 betting + ledger · B-04 settlement · B-05 forge (one file each; shared `auth.ts`, `events.ts` by HEAD)
- O4: R-02a lifecycle I (against fake stdb + fake fighters) · O5: F-02 mock backend · F-05 personas · O1: A-02 rig + portrait
- Not started: O2 (another session is working in `apps/web`), O6 (deferred), O7 (starts at G3)

## Done at G0
- K-02 schemas: 36 tests. Caps beyond the PRD are loose guesses (name ≤ 24 vs Forge 3–14; the reducer enforces FC-F-066).
- K-04 engine B: 37 tests incl. AC-06.1 conservation (1000 random markets) and node:crypto hash vectors.
- K-03 engine A: 35 tests (reducer, cue table, feed, status line, target, invariants).
- K-05 `fixtures/matches/mock-basic.json` (generator `scripts/gen-mock-basic.ts`): 142 events, 20/21 types (no void), 1 VAR overturn, 2 yellow + 1 red, 4 markets settled with conservation.
- Fix: `beat_clock` measured hit time from match.created; now from the bell (`startedT`).
- K-07 runner skeleton: 9 tests; boots on mock with stdb 'down'; public health OK; admin 401 without bearer.

## HEAD decisions pending a PRD amendment
- **Seed totals (§11.8 vs §8.3).** §11.8 lists totals 200/100/100/200 with "each ≥ 5"; §8.3 says "min 50 each". A1 moved money to cents without rescaling. Decision: §11.8 totals are dollars → cents ×100 (winner 20000¢, score line 10000¢, beat-the-clock 10000¢, first blood 20000¢), floor 50¢. `seedSplit` already floors at 50 when total ≥ 50·n.
- `scoreLine` returns a 0..1 fraction (median of last 10, 0.05 steps, clamp [0.2, 0.9], 0.5 when < 5 matches).
- `updateElo` returns unrounded floats; settle rounds once. `computeStats` carries `backersWon`/`earningsUsdc` from `prev` (the settle path updates them).
- Card frame precedence: hot_streak > upset > rookie > tier.
- Admin router is mounted at root; O4 defines full `/admin/*` paths.
- Time bases: `solved[p].atMs` and envelope `t` are ms since match.created; `bettingClosesAt` in the fixture is relative (ms since created) — §8.4 must say which. `Standing.firstHitMs`/`lastScoreMs` are relative to the bell.
- `betting.locked.pools` carry staked amounts only (no seeds).
- **VAR check (R-01b):** the final check also requires F itself to be finite and real at every sample point; a derivative-only check is domain-blind and lets `log(x+1)` through on x < −1. Integration: 1500 generated problems, every reference passes; 509/509 traps caught (live pass, final fail).
- **Views (B-01):** SDK 2.13 views must be `public: true`; `my_ledger_tx` and `runner_fighter_secrets` filter on `ctx.sender` instead.
- Fixture file format is HEAD-defined (`MockBasicFixture` in `scripts/gen-mock-basic.ts`); the PRD only names its contents.

## Blocked
- `spacetime` and `droid` CLIs are not installed on this machine (Antara's laptop); `npm run gen` and `claim-runner` need `spacetime`. H-02 was done on DV1277's machine.
- K-08 waits on B-01 (`scripts/vendor-engine.mjs` is ready).

## Next
- K-06 web data layer after B-01 · PRD patch (Q-001 team, §9.2 React 19, §8.9 FundingAdapter, §10 market UI)

## HUMAN — DV1277: publish the module and generate bindings (unblocks G1, K-06b, K-08)
The `spacetime` CLI is only on DV1277's machine. On `main`:
1. `git pull && npm ci`
2. `spacetime start` (local, port 3000) in its own terminal
3. `spacetime publish --project-path spacetime fightcard-o3` — the module has never been built; first build = K-08 check (it imports `./vendor/parimutuel.ts`, no workspace packages). Note any build error in `docs/requests/O3.md` verbatim.
4. `npm run gen` → `apps/web/src/module_bindings` and `apps/runner/src/module_bindings` (gitignored)
5. `FC_STDB_DB=fightcard-o3 npm run claim-runner` → writes `FC_STDB_TOKEN` to `.env`
6. `FC_ENGINE=mock FC_STDB_DB=fightcard-o3 npm run runner` should log `stdb ok` and the runner identity
7. Push nothing generated; report results in `docs/requests/HEAD.md`
Open question for the build: SDK 2.13 may need a `spacetime.json` or a specific `package.json` main/entry — see `docs/requests/O3.md`.

## Handoff
DV1277 lanes and rules: `docs/status/HANDOFF-DV1277.md`. HEAD (Antara) is finishing O1 A-09, O2 U-06–U-09, O6 I-03; will post "HEAD done" here when merged.

## HEAD done — Antara's session, 2026-10-25 ~04:20
All of Antara's lanes are merged on `main`: O1 A-01…A-09, O2 U-01…U-09, O3 B-01…B-05, O4 R-01…R-05, O5 F-02/F-05,
O6 I-03, HEAD K-01…K-07 + wiring + `/m` code split. 540 tests green, typecheck clean, web builds, secrets scan clean.
**DV1277 is HEAD from here** (merges per `docs/status/HANDOFF-DV1277.md` rule 3).

Open items for the next HEAD:
- Match screen should listen for the arena's podium handoff (`fc:podium` / `subscribePodium` in `apps/web/src/arena/sequences/podium.ts`) to reveal results.
- `<MuteToggle/>` (`apps/web/src/audio`) needs a home in `AppShell`.
- Jumbotron covers the name tags of the two floating slots; Forge preview uses static poses (needs an arena preview export).
- Recompute `--apply` needs a runner-only reducer that writes `fighter_stats` / `fighter.elo`.
- PRD amendments pending (§9.2 React 19 + KokonutUI, §8.9 FundingAdapter, §11.8 seed units, Q-001 team) — list above under "HEAD decisions".

## DV1277 integration follow-up — verified, unmerged (2026-10-25)

The user requested merging later. No Git merges were performed; local `main` remains unchanged. Verification used an ignored source-only assembly at `.arena/combined`, built from remote `main` plus the workstream snapshots. This is test evidence, not a claim that those branches are already integrated into `main`.

- `ws/head-integration`: real Droid/direct/HTTP registry factories, configured reasoning effort, shared live/demo/season guard, Director demo bookkeeping and cancellation, kill switch on manual starts, shutdown awaiting active work, and house-roster registration on connected runner startup. Mock/demo runs do not advance real rotation/history counters.
- `ws/ui-integration`: match deep links wait for database hydration; replay is limited to known fixture names; poster mode labels use the selected match; mute control is mounted; live results wait for the correct podium handoff; result markets are scoped to the watched match.
- `ws/spec-sync`: PRD v1.2.0 Amendment A2 records the actual stack, contracts, cents, time bases, team entry and fail-closed native execution policy. Public deployment and hostile-code OS isolation are not claimed.
- Private configuration: user approved the verified Standard model for GLITCH/PIP. All six house mappings and both tiers are available. GLITCH/PIP had no public rows/history before startup registration, so their initial version is 1; QUILL low reasoning effort is configured. Values were neither printed nor committed.

Verification:
- Full assembled workspace typecheck and web production build pass. Package suites pass: contracts 36, engine 80, web 246, runner 148, module 76 (586 tests in total; the opt-in live adapter test is separate).
- Opt-in two-client live adapter check passes with independent identities/token jars: shared odds/stakes, silent catch-up then live cues, real ledger settlement, Forge creation propagated to the other client, and browser credit attempts rejected.
- Normal assembled runner boots with `stdb=ok` in mock/ledger mode and registers the six house fighters. Real authenticated HTTP checks: unavailable demo fixture 404, demo start 204, simultaneous match rejected 409, demo cancellation 204, and the active slot is released.
- Brave verified a cold direct load of `/match/real_mvnqmsz4/results`: four correct standings, only the four matching markets, LIVE mode, ledger disclosure and `Provably fair ✓`.
- Earlier local four-Droid match `real_mvnqmsz4` settled with all four fighters submitting, 80 valid events, a verified reveal and real Elo/history updates. VEX/SAGE/BRICK scored 150; QUILL scored 30. Earlier normal live smoke and original-timing demo smoke also passed.

Remaining independent work: Maincloud/public deployment and phone-on-cellular acceptance; actual golden VAR/upset/red-card recordings; community-fighter rotation and persisted candidate-history loading (the candidate source still has its database TODO); a real OS-isolated executor before enabling native commands; optional direct-provider/public BYO end-to-end validation; the arena jumbotron/name-tag overlap, live Forge preview and recompute `--apply` reducer. These are not silently marked done by the branch checks above.
