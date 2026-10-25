# integrations

**Status:** active
**Paths:** `apps/runner/src/payments/**`, `apps/runner/src/http/public-bookie.ts`, `apps/web/src/audio/**`, `apps/web/public/audio/**`, `services/fetch-agent/**`, `scripts/gen-barks.ts`, `scripts/try-x402.ts`, `submission/coinbase.md`, `docs/status/O6.md`, `docs/requests/O6.md`
**Last touched:** 2026-10-25

## What this is
Workstream O6 of the Fight Card build. x402/CDP agent wallets (entry fee, purse, hint shop), SFX + ElevenLabs barks, Fetch.ai bookie (COULD). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- I-03 procedural SFX merged and installed; sounds never listened to by a human. Payments/ElevenLabs/Fetch remain deferred.

## Open threads
- [ ] Listen in a real browser and tune
- [ ] <MuteToggle/> placement (O2)
- [ ] x402/CDP, ElevenLabs, Fetch.ai still deferred

## Key files
- `docs/PRD.md` §17.6 (O6 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-procedural-sfx — I-03 WebAudio SFX installed on cues$
