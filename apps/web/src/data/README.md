# Live data integration (K-06b / K-07)

This directory owns the browser's SpacetimeDB boundary. UI and arena code continue to consume `Store`, `cues$` and the existing bridge. No generated bindings or runner credentials are imported into UI code.

## Local setup

From this worktree's root, with the O3 source available (no branch merge is required to generate bindings):

```sh
FC_STDB_MODULE_PATH=/absolute/path/to/fc-o3/spacetime npm run gen
FC_STDB_DB=fightcard-o3 npm run claim-runner
FC_STDB_DB=fightcard-o3 FC_ENGINE=mock npm run runner
VITE_STDB_DB=fightcard-o3 npm run dev:web
```

Start the shared local database on port 3000 first and publish O3 with `spacetime publish --module-path spacetime --server local --no-config fightcard-o3 -y`. Claim only a fresh database once. The claim script writes the runner token to the ignored root `.env`; never put it into a `VITE_*` variable. Every anonymous browser gets a separate persisted token scoped to database and URI.

`store.ts` starts the adapter automatically except on `/replay/*` and `?demo=1`. Startup enters `connecting` synchronously so the lobby does not select offline replay while the initial connection is pending. Missing bindings leave offline replay usable; the Vite glob excludes absent generated code. Generated bindings are included in a lazy chunk after `npm run gen`.

## Behavior

- Subscriptions map database identities, bigint cents and microsecond timestamps into the existing browser contracts. Unsafe integer amounts are rejected.
- Watching a match sorts and validates its existing event log, reduces it silently and increments `playbackRevision`. Only subsequent, gapless events emit cues. A gap requests a new snapshot; duplicate events do nothing.
- Reconnect uses the SDK's automatic recovery after an established connection. Initial failures retry with bounded exponential backoff. Restored subscriptions snap state silently and refresh persisted tokens.
- Register, bet, Forge and test-credit actions await reducer confirmation and preserve error codes. Test credits remain runner-only at the module boundary. Fixture replay cannot mutate live state.
- Runner bindings convert identities, `u64` cents, `u8` slot arrays, nullable fields and timestamps to the generated SDK types; incoming and runner-posted events are schema-validated. Startup waits for the module subscriptions before returning ready. Failed local connections close within four seconds (remote default eight).

## Verification (2026-10-25)

- Full workspace typecheck and web production build pass with generated bindings.
- Seven adapter unit tests cover normalization, snapshot/live separation, duplicates, gaps, SQL escaping, reducer errors, replay isolation, reconnect ownership and a watch request made before lazy startup.
- Opt-in `test/data-live-integration.test.ts` runs two independent adapters, stores and token jars against the published local module: both see the same odds and stakes, receive live cues after silent catch-up, and settle to `initial - stake + payout`. It also verifies Forge creation propagates to the other client and rejects browser attempts to issue test credits. Mock results leave existing card stats untouched.
- Cross-worktree normal live smoke: 174 events, six bets from two identities, all event/reveal/settlement checks pass. Demo fixture smoke: 137 events at original timing, two real ledger bettors, correct balances and no rating/stat writes. These checks use O3's module and O4's updated smoke/demo exports without merging branches.
- Brave `/markets` visibly shows the local database's matches/results/feed and `Connection: Live`, with ledger disclosure.
- A real four-Droid match was verified from the published local log: `real_mvnqmsz4`, 80 events, all four fighters submitted, VEX/SAGE/BRICK scored 150 and QUILL scored 30. It settled, the reveal verified, invariants passed and all four real fighter histories updated. QUILL used low reasoning effort.

Run the opt-in adapter test from `apps/web` (requires the local module and claimed runner):

```sh
FC_LIVE_TEST=1 FC_STDB_DB=fightcard-o3 node --env-file-if-exists=../../.env ../../node_modules/vitest/vitest.mjs run test/data-live-integration.test.ts
```

The H0 board subscribes to public tables, including historical bets; the visible feed is capped, but the SDK cache is not. Long-running hosted seasons need server-side feed/retention limits. Runner recovery is fail-closed on disconnect; it does not continue posting to a stale connection.

## Merge-time dependencies

O3 must include the `Array.from(slots)` event serialization fix. O4 owns the real smoke script's modern CLI flags and demo exports. O5 backends still need their HEAD-owned registry entries, and Director demo execution still needs HEAD wiring; see workstream request files. This branch does not edit those reserved paths or merge other branches.

Browser checks also found an O2 `useMatchSource` deep-link race: it chooses an unavailable fixture while the connection is still starting and never rechecks after hydration. The exact UI fix and a lobby DEMO/MOCK badge issue are recorded in `docs/requests/HEAD.md`; those reserved UI files were left for their owner. Board data and direct adapter watch requests are verified independently.
