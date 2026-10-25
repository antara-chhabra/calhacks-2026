# Status — HEAD (O0)

## Gates

| Gate | Planned | Status |
|---|---|---|
| G-1 Scaffold | 01:30 | Done 02:58 (`538dded`): workspaces install and typecheck; §8.7/§8.9 stubs; worktrees `../fc-o1`…`../fc-o7` on `ws/o1`…`ws/o7`; requests/status files. H-01 done; H-02 partial (see Blocked) |
| G0 Contracts frozen | 02:15 | HEAD side done ~03:20 (`6acc6a2`): K-02–K-05, K-07 green (125 tests). Still open for G0: B-01 (O3), A-01 VEX drawn (O1), F-01 spike (O5), K-08 module-build check (needs B-01) |

Kickoff ran ~1h40 late. Per §17.2, gates shift by the delay; §5.6 cut order applies at G2.

## Done
- K-01 scaffold (`538dded`). Notes:
  - `apps/web` stays on React 19.1 + Tailwind 4.1 + KokonutUI (platform decision); PRD §9.2 still says React 18.3.1 → amendment pending.
  - x402 / CDP packages **not** installed: payments are deferred (H-03, `FC_PAYMENTS=off`). O6 files a `DEP` request when I-01 resumes.
  - `FundingAdapter` (A1) is named in FC-F-100 but not defined in §8.9. HEAD stub: `packages/contracts/src/money.ts` + `apps/runner/src/funding.ts`. PRD §8.9 amendment pending.
  - Scripts: `keys.mjs` covers the PRD's `setup-keys`/`check-keys` (`npm run keys`, `npm run keys:check`).
  - Each workstream's local web port: `FC_WEB_PORT=<5173+n> npm run dev:web`.

## In progress
- (none) — worktrees `ws/o1`…`ws/o7` fast-forwarded to `6acc6a2`

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
- Fixture file format is HEAD-defined (`MockBasicFixture` in `scripts/gen-mock-basic.ts`); the PRD only names its contents.

## Blocked
- `spacetime` and `droid` CLIs are not installed on this machine (Antara's laptop); `npm run gen` and `claim-runner` need `spacetime`. H-02 was done on DV1277's machine.
- K-08 waits on B-01 (`scripts/vendor-engine.mjs` is ready).

## Next
- K-06 web data layer after B-01 · PRD patch (Q-001 team, §9.2 React 19, §8.9 FundingAdapter, §10 market UI)
