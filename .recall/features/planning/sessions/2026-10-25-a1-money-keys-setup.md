# 2026-10-25 — planning/a1-money-keys-setup

**Session ID:** 2026-10-25-a1-setup  (arena slice: `features/arena/sessions/2026-10-25-arena-art-bible.md`)
**Repo state:** main @ 05a70df, 4 dirty (before commit)

## Goal
Load L1 context, set up API keys/tooling for the planned stack, then amend the PRD so money is real currency, models are low-cost, audio uses a library, and arena art is specified separately.

## What happened
- Loaded L1 recall. Wrote `.env.example` (PRD §8.11) and `scripts/keys.mjs` (interactive fill with hidden input, `--check`, `--live` ElevenLabs ping, auto-generates Director token and Bookie HMAC). `.env` is gitignored, mode 600.
- Founder added the Factory key; installed `sympy`. `droid` and `spacetime` installs were blocked in-session (curl|sh); founder installed them; `spacetime login` is active; the Factory key works (live `droid exec` returned ok).
- `.env` had `FACTORY_API_KEY= <value>` (space after `=`) which broke shell sourcing and leaked the key into one tool output; fixed. Consider rotating that key.
- Chose a cheap-model roster (one distinct low-cost model per house fighter + two community tiers), each verified with a one-word `droid exec`. Values live only in `.env` (FC-F-048); not recorded here.
- Founder asked to show frontier models after fights while cheap ones run. Declined: it would misstate what bettors staked real-denominated money on. Truthful alternative recorded as ADR-023 and a parking-lot item.
- Amended `docs/PRD.md` to v1.1.0 (Amendment A1) with a Python script (kept in scratchpad only): real currency in integer cents with ledger accounting, `FundingAdapter`, `FC_MONEY_MODE`; ElevenLabs/Fetch.ai/Coinbase deferred; library SFX and speech blips; FC-D-003 scope split; ADR-023..026; Q-011, Q-012.
- Added a frontier-model warning to `keys.mjs --check` (and fixed a `minimax` false positive).

## Files touched
- `docs/PRD.md` — A1 amendment (contracts §8.8 `balanceCents`, `ledger_tx`, `credit_test_funds`, `insufficient_funds`; §8.11 `FC_MONEY_MODE`)
- `.env.example`, `.env` (gitignored), `scripts/keys.mjs`
- `docs/art-bible.md` (arena slice)
- Read: `.recall/*`, PRD §8–§19 sections

## Decisions made
- ADR-023 low-cost models only; any disclosure must be the true model.
- ADR-024 real currency, ledger mode only in H0; `live` blocked on Q-011/Q-012 (supersedes ADR-006).
- ADR-025 library SFX; ElevenLabs/Fetch.ai/live payments deferred.
- ADR-026 arena art in `docs/art-bible.md`; other UI is a separate track.

## Open threads at end of session
- [ ] Q-011 funding rail and Q-012 compliance (counsel) before any `live` mode
- [ ] Contract changes (§8.8/8.9/8.11) must reach engine, module and web tasks (K-02, B-01..B-03, U-01, U-05): `balanceCents`, `ledger_tx`, `FundingAdapter`
- [ ] Confirm the model picks are actually cheap/free on Factory's rates
- [ ] `FC_STDB_TOKEN` via `claim-runner` after the module exists; public URLs (H-05)
- [ ] Notify workstreams of A1 (broadcast line in next task cards, PRD §1.4)

## Gotchas
- macOS has no `timeout`; shell `source .env` breaks on `KEY= value`.
- Frontier-model check regex must not match `minimax`.
- Auto-mode classifier blocks `curl | sh`; the founder must run installers.
