# En Garde pitch notes

These are rehearsal notes for the current prototype. They describe the seeded replay/mock experience and the product direction. Replace the replay walkthrough with a live match only after the real Droid and SpacetimeDB paths pass the end-to-end gate. Keep the visible mode label in every recording.

## Table demo — 5 minutes

**Before the judge arrives:** Start the web app, open `/replay/mock-basic?debug=1`, confirm the fixture loads, and have the results route ready. This is a replay; do not invite the judge to place a live bet or imply that a second browser is connected to a live market.

| Time | Talk track | Show |
|---|---|---|
| 0:00 | “En Garde turns AI evaluation into a sport you can watch. This run is a seeded replay; ledger mode records integer-cent accounting only, and no funds move.” | App shell and mode label |
| 0:25 | “The fighter cards are meant to make performance legible. A card should come from public match records, not a model brand.” | Cards/profile screen if available in the integrated build |
| 0:55 | “The key idea is that the arena follows the match log. The animation is a presentation of events, and verified answers determine scoring.” | Start `/replay/mock-basic?debug=1`; point to the event feed/debug state |
| 1:45 | “A wrong answer can lose points; a final check can trigger review. The fixture includes an overturn so we can replay that moment consistently.” | Replay sequence and VAR event, if visible in this build |
| 2:35 | “The planned live path uses a runner to collect fighter submissions, a verifier for scoring, and SpacetimeDB as the authoritative store. Real Droid sessions and live adapter wiring are still being completed.” | Architecture diagram in README |
| 3:20 | “We have kept payments out of this prototype. The balance is ledger accounting in US cents; no wallet or payment rail is connected.” | Ledger mode label / results view |
| 4:00 | “The next gate is an end-to-end real match: betting lock, Droid fighters, referee controls, VAR, and settlement, followed by a recorded golden replay.” | Submission checklist / roadmap |
| 4:40 | “The goal is a league where agent results are both entertaining and inspectable. The fight is the show; the verifier and event history are the evidence.” | Return to replay or project home |

If any listed screen or event is missing in the final build, skip that beat rather than showing a fabricated screenshot or describing planned UI as shipped.

## Stage pitch — 3 minutes

“Every week someone asks which AI agent is best. En Garde makes that question something you can watch. Agents solve generated problems while their 2D fighters duel; verified answers drive the score, and the event log makes the result replayable.

What you are seeing today is a seeded replay and mock prototype. It shows our core product idea: the arena is driven by match events, so the spectacle follows the evidence. The live Droid fighter path and SpacetimeDB adapter are still being integrated, and the ledger records accounting only. No funds move.

Our next step is to verify the full live match path and capture its receipts and replay. En Garde is a league for agents: the show makes performance watchable, and the record makes it inspectable.”

## Q&A guardrails

| Question | Answer |
|---|---|
| Is this a live match? | “This screen is a seeded replay/mock experience.” Say “live” only if the active run is confirmed connected end to end. |
| Does the judge's bet move money? | “No. H0 is ledger mode, uses integer US cents for accounting, and no funds move.” |
| Is Factory Droid running these fighters? | “The Droid fighter integration is in progress. This replay/mock run does not prove a live Droid session.” |
| Is SpacetimeDB connected? | “The module is part of the planned authoritative backend. The live web and runner path is still being integrated.” Update only after end-to-end evidence exists. |
| What does x402 do here? | “It is deferred; no live payment rail is connected.” |
| What about Fetch.ai or ElevenLabs? | “They are not claimed as shipped integrations in this build.” |
| How do you prevent a fake score? | “The design makes verified events drive scoring, and commit/reveal makes the problem set checkable. For this replay, the fixture is seeded; do not claim a live receipt unless the final run produces and verifies one.” |

## Evidence to capture after integration

- One recording showing the mode badge and the actual run source.
- A complete match from lock through final verification and settlement, if the live gate passes.
- A replay of a real captured fixture, with no edits that change the result or mode context.
- Screenshots of sponsor functionality only when the integration is active and reproducible.
