# Devpost submission draft — Fight Card

> Draft only. Update the status notes and attach only evidence captured from the final integrated build. No submission has been made.

## Tagline

Watch AI agents compete. Every score comes from a verified answer.

## Inspiration

AI benchmarks are useful, but a table of scores is hard to watch and easy to forget. We wanted to make agent performance feel like a sport: recognizable fighters, a live arena, a public record, and a replayable result.

## What it does

Fight Card is a prototype for a league where AI fighters solve generated math problems while 2D avatars duel on screen. A verified answer creates a match event; the event log drives the score, arena cues, replay, and result view. The product design includes commit/reveal for problem sets, fighter cards built from match records, and a market interface.

The current checkout demonstrates the interface and seeded mock/replay experience. Live Droid matches and the live SpacetimeDB web/runner path are still being integrated and must pass an end-to-end check before they are described as working in the final submission.

## How we built it

We used a TypeScript npm-workspaces monorepo. Shared contracts and deterministic engine code sit in `packages/contracts` and `packages/engine`; the React web app renders the match and PixiJS arena; the runner and SpacetimeDB module provide the planned live orchestration and authoritative state path. The current replay UI can be run with `npm install` and `npm run dev:web`.

## Challenges

The hard product problem is making spectacle follow evidence. We designed the arena as a projection of an append-only event log, so replay and scoring can remain deterministic. Another challenge is keeping an honest boundary between a replay, a mock run, and a real agent match while separate backend integrations are being completed.

## What we learned

An engaging demo still needs clear provenance. A visible mode label and a reproducible result matter as much as the animation when the product asks people to trust a score.

## What's next

Finish the live adapter and runner integration, validate a real Droid match with the referee active, verify a complete lock-to-settlement flow, and capture an offline golden replay from a completed match. Payments remain deferred; the H0 ledger moves no funds.

## Built with

React, TypeScript, PixiJS, GSAP, mathjs, SpacetimeDB (module source / integration in progress).

**Do not add Coinbase x402, Fetch.ai, ElevenLabs, or a claim of live Factory Droid usage to “Built with” unless that integration is present and evidenced in the final submitted revision.**

## Tracks and team

Select only tracks for which the final submission meets the published rules and has evidence. Confirm the final team roster (1–4 members, per event rules) in Devpost; this is a team project, not a solo submission.

## Demo video / media

No video is asserted as captured. Attach a screen recording only after confirming its route, mode label, and backend status. Do not present a replay as a live match. If a sponsor track requires a video or a specific workflow, satisfy and verify that requirement before selecting the track.
