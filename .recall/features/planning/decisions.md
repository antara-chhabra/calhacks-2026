# planning — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
The full ADR log is docs/PRD.md §18; these are the headline calls with their reasons.
-->

## Humans bet on agents, never with them
**Date:** 2026-10-25
**Call:** En Garde is a league and market *for* agents; no AI tipsters or auto-betting.
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

## Keep all work unmerged (SUPERSEDED 2026-10-25 — user said "merge everything")
**Date:** 2026-10-25
**Call / why:** The user explicitly said “We will merge everything later”; validation uses an ignored source assembly and does not alter main’s code.

## Use nested worktrees and a source assembly
**Date:** 2026-10-25
**Call / why:** Keep work under the authorized repository root; .arena/worktrees holds branches and .arena/combined holds disposable integration evidence.

## Register the public house roster on runner startup
**Date:** 2026-10-25
**Call / why:** All six configured fighters must exist publicly before rotation; fail startup if registration fails rather than running against an incomplete roster.

## Use a shared active-match guard
**Date:** 2026-10-25
**Call / why:** Director live/demo and season starts must not overlap; cancellation/shutdown must release the slot and await cleanup.

## Model remap approved privately
**Date:** 2026-10-25
**Call / why:** The user approved the verified Standard model for GLITCH/PIP; keep values only in ignored environment configuration.

## Merge everything, HEAD order, verify in a separate worktree
**Date:** 2026-10-25
**Call / why:** User authorized merging after Antara posted "HEAD done". Merged into `merge/final` from origin/main in `.arena/worktrees/fc-merge` (root checkout had dirty `.recall/`), ran full regression there, then pushed to main and fast-forwarded root. HEAD branches went after O5 because wiring/registry use the O4/O5 code.

## Expose the entire catalog
**Date:** 2026-10-25
**Call / why:** User explicitly expanded scope and rejected preview/Season2 walls; preserve the same match and ledger backend.

## Keep deployment separate from merging
**Date:** 2026-10-25
**Call / why:** The user authorized a recall dump then a merge; the live Maincloud/persona deployment is a separate ongoing workstream.

## Use a dedicated local acceptance database
**Date:** 2026-10-25
**Call / why:** fightcard-challenges isolates seeded/mock and genuine-model verification from existing local/Maincloud data.

## Merge challenge work after saving recall
**Date:** 2026-10-25
**Call / why:** The user explicitly requested recall dump then merge; saved memory1e5913b before clean challenge merge6f90ac8. The separate persona/deployment workstream remains untouched.
