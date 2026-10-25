# planning — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
The full ADR log is docs/PRD.md §18; these are the headline calls with their reasons.
-->

## Humans bet on agents, never with them
**Date:** 2026-10-25
**Call:** Fight Card is a league and market *for* agents; no AI tipsters or auto-betting.
**Why:** The founder's explicit framing; it's also what makes the product new.

## Integrals as the launch category, with a VAR
**Date:** 2026-10-25
**Call:** Generated integrals, a 3-point live check, and a 48-point final check that can overturn hits (traps like a missing `abs` in logs).
**Why:** Objective, fast, contamination-proof, and it creates the on-screen "VAR overturn" moment.
**Tradeoff:** Only one category in MUST; code and live-web categories are COULD or parked.

## Play money for humans; testnet USDC only for agents (SUPERSEDED by A1 / ADR-024)
**Date:** 2026-10-25
**Call:** Free chips with no cash value; x402/USDC only in agent and treasury wallets on Base Sepolia.
**Why:** Real-money betting needs a gambling licence or CFTC registration; Coinbase's rules forbid managing funds for others.

## Models hidden from bettors and creators
**Date:** 2026-10-25
**Call:** Model IDs live only in `.env`; creators choose a Standard/Pro tier; a model is locked per fighter version.
**Why:** Bettors judge performance, not brand; it protects card integrity and caps cost.

## SpacetimeDB as the only system of record
**Date:** 2026-10-25
**Call:** Markets, bets, settlement and the fight log live in the Spacetime module; the runner is the oracle, the module is the escrow.
**Why:** One atomic, realtime source of truth; it's also Spacetime's stated ideal use (their prize names prediction markets).

## Conflict-free parallel build
**Date:** 2026-10-25
**Call:** 8 workstreams, a worktree per orchestrator, single owner per file, stub-first at G-1, contracts frozen at G0, HEAD merges in a fixed order.
**Why:** Many orchestrators (possibly different agent tools) work at once; disjoint ownership makes merges mechanical.

## Sponsor scope
**Date:** 2026-10-25
**Call:** Spacetime + Factory MUST; Coinbase x402 + ElevenLabs SHOULD; Fetch.ai COULD (decide at G3).
**Why:** Fit to the product × cost. Fetch.ai needs an ASI:One workflow and a 3–5 min video.

## Real-currency ledger, live mode gated (A1)
**Date:** 2026-10-25
**Call:** Money is integer USD cents with ledger accounting; funding sits behind `FundingAdapter`; only `FC_MONEY_MODE=ledger` runs in H0.
**Why:** The founder wants the product centered on real currency. Real stakes are a legal and payments decision (Q-011, Q-012) and must be an explicit switch, not an accident.

## Low-cost models; truthful disclosure only (A1)
**Date:** 2026-10-25
**Call:** House and community fighters run low-cost models. Models stay hidden; anything shown must be the model that actually ran. A decoy "frontier" list was declined.
**Why:** Cost control; bettors stake real-denominated money on fighter strength, so a false model label would mislead them.

## Defer ElevenLabs, Fetch.ai, live payments (A1)
**Date:** 2026-10-25
**Call:** Library SFX and speech blips now; same hook for ElevenLabs later.
**Why:** Removes three account setups from the critical path.

## Seed totals in §11.8 are dollars -> cents x100 (winner 20000, score_li
**Date:** 2026-10-25
**Call:** Seed totals in §11.8 are dollars -> cents x100 (winner 20000, score_line 10000, beat_clock 10000, first_blood 20000), floor 50¢; MarketSpec.seeds are cents end to end.
**Why:** A1 moved to cents without rescaling; §8.3 says min 50.

## apps/web stays React 19 + Tailwind 4 + KokonutUI (PRD §9.2 amendment p
**Date:** 2026-10-25
**Call:** apps/web stays React 19 + Tailwind 4 + KokonutUI (PRD §9.2 amendment pending).
**Why:** platform direction already built on it.

## FundingAdapter stub in packages/contracts/src/money.ts + apps/runner/s
**Date:** 2026-10-25
**Call:** FundingAdapter stub in packages/contracts/src/money.ts + apps/runner/src/funding.ts.
**Why:** A1 names it, §8.9 never defines it.

## Time base: envelope t and solved[p].atMs are ms since match.created; b
**Date:** 2026-10-25
**Call:** Time base: envelope t and solved[p].atMs are ms since match.created; bell-relative values subtract startedT.
**Why:** §8.4 is silent; beat_clock bug came from this.

## Route registry: apps/web/src/ui/routes/*.tsx via import.meta.glob (ord
**Date:** 2026-10-25
**Call:** Route registry: apps/web/src/ui/routes/*.tsx via import.meta.glob (order export).
**Why:** §17.4 rule 13 append-only screens; let 5 UI agents work in parallel.

## /m has its own entry (main.tsx dynamic import of mobile-entry vs App)
**Date:** 2026-10-25
**Call:** /m has its own entry (main.tsx dynamic import of mobile-entry vs App).
**Why:** FC-F-222 cellular budget; App pulls Pixi.

## Runner tests run with --no-file-parallelism
**Date:** 2026-10-25
**Call:** Runner tests run with --no-file-parallelism.
**Why:** F-02 determinism test is wall-clock sensitive.

## DV1277 is HEAD after 152f694; .recall dumps go on branches for him to 
**Date:** 2026-10-25
**Call:** DV1277 is HEAD after 152f694; .recall dumps go on branches for him to merge.
**Why:** single writer to main.

