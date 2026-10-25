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


## A3 challenge expansion — verified on ws/challenges (2026-10-25)

User explicitly requested every visible duel category on the existing backend. This revision starts from merged baseline `638e598`, lives in `.arena/worktrees/fc-challenges` on `ws/challenges`, and has not been merged or deployed to Maincloud/public hosting.

- Active catalog: integrals, code, speed-math, logic, chess puzzles, trivia, web, squads. Category-aware fighter prompts and evaluators reuse the existing lifecycle, event schema/cues, commit/reveal, markets, ledger and settlement. Director selects categories; the season cycles the catalog. Public tabs and leaderboards have no Season 2 wall or integral-preview substitution.
- Code Duel accepts actual pure JavaScript functions. Fresh QuickJS WebAssembly VM per case, 8 MiB memory / 512 KiB stack / 100 ms interrupt, no host bindings; three live cases versus 12 final hidden cases. Adversarial tests cover hangs, memory pressure, host access, async/non-JSON output, serialization tampering and depth. Native Droid execution remains disabled; this is not an OS-containment claim.
- Live Web fetches current official HN API data before any market exists, freezes source IDs/timestamps/fields in the commitment, and embeds quoted source data in fighter prompts. Fixed HTTPS fetches, redirect rejection, 5s abort and streaming byte caps; extraction is deterministic against the captured snapshot. Source failure rejects startup with 503 challenge_unavailable and releases the slot.
- Squads: slots 0/1 versus 2/3 regardless of shuffled candidate order; combined-score team market with deterministic tie-break; teammate targeting excluded; team labels and results derive from recorded slots/settled team market.
- Additive `fighter_category_stats` keeps separate category Elo/stats; old fighter_stats/fighter.elo remain the integral card. Runner reloads persisted history by category after reconnect; other categories begin at 1000. Mock/demo cannot advance competitive history. Generated bindings are ignored.

Verification:
- Full workspace: typecheck PASS; 624 tests PASS (contracts36, engine83, web249, runner179, module77), one opt-in live adapter test skipped; production web build PASS. Later streaming-source hardening and pre-create schema validation passed focused category/lifecycle checks and full typecheck.
- The opt-in two-client real SDK adapter integration also passed separately (new table subscriptions, bets, catch-up/live cues, fairness reveal, ledger settlement and Forge propagation).
- New isolated local module `fightcard-challenges` published with --delete-data=never; no existing local or Maincloud data changed.
- All eight categories completed an explicitly MOCK reference-backend smoke against the actual database, with two independent bettors, gapless event/hash checks and exact ledger balance/payout reconciliation. `scripts/smoke-challenges.ts` is the reusable acceptance command.
- Seven actual four-Droid matches (mode live, not demo) settled, all with two actual ledger bettors and verified reveal; each reconnected runner found its persisted category entries/stats:
  - code: challenge_code_mvnup37h, 90 events, all four scored150.
  - speed-math: challenge_speed-math_mvnupd3s, 86 events, all four scored150.
  - logic: challenge_logic_mvnupknh, 86 events, all four scored150.
  - chess: challenge_chess_mvnus3x3, 118 events; SAGE150, QUILL150, VEX145, BRICK140.
  - trivia: challenge_trivia_mvnut33l, 94 events, all four scored150.
  - web: challenge_web_mvnuthzu, 87 events, all four scored150 from a fresh snapshot.
  - squads: challenge_squads_mvnutr6m, 87 events, all four scored150; five markets including team_winner settled.
- Full match tests cover every category, no reference/test leakage, true code VAR overturns, source-failure cleanup, HTTP category validation and shuffled team membership/settlement/targeting.
- Brave verified active eight-category navigation, correct Code Duel match/feed/results filtering, and real per-category leaderboard records (integrals stayed unrated; Code had persisted Elo/card rows). Later full visual inspection was interrupted when the browser connection changed; subsequent squad UI fixes have focused regression coverage, not a claimed second full visual pass. Impeccable checks reported no UI findings.
- Private-value scan of changed source and production JS/CSS/HTML passed; no private model values, API keys or runner tokens printed/committed.

Local review setup (check liveness on resume): web `http://127.0.0.1:5182/markets`; challenge runner admin/public `127.0.0.1:8791/8792`, automatic season OFF; database fightcard-challenges on local port3000. Private test identity/start wrapper/results live under ignored `.arena/` in this worktree. Existing public deployment remains on the earlier baseline.

Next integration step when authorized: merge `ws/challenges`, publish the additive schema without data deletion, regenerate bindings, and deploy the matching runner/web revision together. Prior independent gaps (community candidate loading/debut, actual golden recordings, recompute --apply, live Forge preview and arena label overlap) are outside this category expansion. Chess is a puzzle category, not a full chess game; native executors and real money rails remain deferred.


## A3 merge complete — 2026-10-25

User requested recall dump then merge. Shared split recall committed first as `1e5913b`; `ws/challenges` (`6a3b1d2`) then merged cleanly into `main` as `6f90ac8`. Installed the merged lockfile and regenerated ignored web/runner bindings. Typecheck, all624 package tests (36/83/249/179/77), and production web build pass on actual merged main. The opt-in SDK integration had passed separately on the identical challenge source. Merged-main all8-category actual-database smoke PASS: two independent bettors,45 events per match,4 markets per individual mode/5 for squads, verified reveals and reconciled ledger payouts. Local service had stopped; restarted its existing persistent data directory before the successful rerun. No republish or data deletion was needed.

No Maincloud publish or public process cutover occurred. Independent `ws/personas` remains unmerged and its worktree/serving environment were not modified. Do not use the earlier pre-merge “remaining integration” paragraph as the current code state.
