# Demo and submission checklist

## Current replay walkthrough

- [ ] Install with Node.js 22.9+ and `npm install`.
- [ ] Start the UI with `npm run dev:web`.
- [ ] Open `/replay/mock-basic?debug=1` and verify the page clearly identifies replay/mock mode.
- [ ] Confirm the fixture loads and the event/debug panel advances.
- [ ] Open the match and results routes; remove any beat from the pitch if its screen is unavailable.
- [ ] Keep the narration clear that ledger mode moves no funds.
- [ ] Do not call the run live, a real Droid match, or a connected market.

## Live integration gate — pending

- [ ] Live web adapter connects to the intended SpacetimeDB database.
- [ ] Runner connects to that same module and claims its runner identity.
- [ ] Real Droid session(s) complete at least one submission with referee controls active.
- [ ] Match locks before fighter access; verifier, final review, problem reveal, hash check, and settlement complete.
- [ ] Two separate clients observe the same live state, if this is part of the demo.
- [ ] Mode indicator and receipts match the actual run; no mock/demo/replay data is represented as live.
- [ ] End-to-end run output and a golden fixture are captured and reviewed.
- [ ] Any branch work is integrated and the complete check suite passes on the submission revision.

## Submission content

- [ ] Fill the final Devpost team roster and confirm event team-size rules.
- [ ] Review the README against the exact revision being submitted.
- [ ] Select sponsor tracks only when their required working integration and evidence exist.
- [ ] Add only media captured from this project and this event; confirm route and mode are visible.
- [ ] Verify all text distinguishes shipped behavior from roadmap and branch work.
- [ ] Confirm no secrets or model IDs are in the repository or screenshots (`npm run scan:secrets`).
- [ ] Check credits in `apps/web/public/CREDITS.md`.
- [ ] Submit in Devpost by the team’s deadline. This document is a draft checklist; no submission is made by this repo change.

## Venue kit (when presenting in person)

- [ ] Laptop charger and power adapter
- [ ] Reliable network/hotspot and backup network plan
- [ ] Second phone for checking the spectator layout, if that screen is included
- [ ] Local replay loaded as an offline fallback
- [ ] Final demo path rehearsed twice with a teammate
