# En Garde SpacetimeDB module

SpacetimeDB 2.13 is the database, transaction boundary and subscription transport.
H0 uses integer US cents in ledger mode: **Ledger mode · no funds moved**.
The runner supplies verification results; the module authorizes mutations and settles bets atomically.

## Build and local publish

Run from the repository root after `npm ci`. The CLI flag in 2.13 is `--module-path`.
No `spacetime.json` is required; the module entry is `src/index.ts`.

```sh
npm run typecheck -w @fc/spacetime
npm test -w @fc/spacetime
node scripts/vendor-engine.mjs --check
spacetime build --module-path spacetime
```

The CLI can warn that `tsc` is missing when dependencies are hoisted into the repository's
`node_modules`, even though bundling succeeds. The explicit workspace typecheck above is required.
In a worktree, link its `node_modules` to the installed root dependencies. A module-local
`spacetime/node_modules` link to those same dependencies also lets the CLI run its typecheck.

Start one shared development server in a persistent terminal. Each workstream has its own database.

```sh
spacetime start --listen-addr 127.0.0.1:3000 --data-dir .arena/spacetime-local --non-interactive
spacetime publish --module-path spacetime --server http://127.0.0.1:3000 --no-config -y fightcard-o3
```

After a fresh publish, immediately run the HEAD-owned `claim-runner` script with
`FC_STDB_URI=ws://127.0.0.1:3000` and `FC_STDB_DB=fightcard-o3`. It stores the returned runner
token privately in the root `.env`. The first caller claims the runner role; subsequent claims
fail with `runner_already_set`. Reuse the saved token after restarts and non-destructive publishes.
Never put it in `VITE_*` settings or a web bundle.

Generate clients from the same source that was published:

```sh
spacetime generate --lang typescript --module-path spacetime --out-dir apps/runner/src/module_bindings --no-config -y
spacetime generate --lang typescript --module-path spacetime --out-dir apps/web/src/module_bindings --no-config -y
```

Generated bindings stay gitignored. Reducers use camelCase methods with one named argument object.
`u64` fields, including market seeds, use `bigint`; seeds are already cents. Options use `undefined`.
`auto_lock` is a private scheduled reducer and is absent from client bindings.
The sender-filtered views are public subscription names `my_ledger_tx` and `runner_fighter_secrets`;
their underlying tables remain private. Public client bindings expose ten tables and these two views.

## B-06 live authorization and regression checks

Use a fresh disposable local database ending in `-auth`, separate from the runner's database.
The test refuses remote endpoints and databases without that suffix. It claims its own runner,
registers a second player, then tests all 13 privileged reducers, one-time claiming, scheduler
access, private views, canonical lifecycle order, gapless sequences, mock/demo rating exclusion,
real settlement math, and scheduled locking.

```sh
spacetime publish --module-path spacetime --server http://127.0.0.1:3000 --no-config -y fightcard-o3-auth
spacetime generate --lang typescript --module-path spacetime --out-dir spacetime/test/module_bindings --no-config -y
node --import tsx spacetime/test/auth-live.ts
```

For another run, choose a new name such as `fightcard-o3-repeat-auth` for publish, then run
`FC_AUTH_DB=fightcard-o3-repeat-auth node --import tsx spacetime/test/auth-live.ts`.
No account tokens or model configuration are printed or written by this test.

## Maincloud runbook (operator action, not performed by this workstream)

1. Run the build, module tests, live authorization checks and repository secret scan above.
   Confirm the intended production database name and an authenticated CLI account with `spacetime login`.
2. Publish without any data deletion flag:

   ```sh
   spacetime publish --module-path spacetime --server https://maincloud.spacetimedb.com --no-config fightcard
   ```

   Review the CLI's schema migration plan. Do not reset a database containing stakes or identity state.
   If the publish fails or requests a destructive migration, retain the local fallback while HEAD
   resolves the schema change.
3. For a **new** database, immediately use `npm run claim-runner` with
   `FC_STDB_URI=wss://maincloud.spacetimedb.com` and `FC_STDB_DB=fightcard` in the private root `.env`.
   For an existing database, keep the previously claimed runner token. An already-claimed role
   cannot be transferred by calling `claim_runner` again.
4. Configure the web's public `VITE_STDB_URI=wss://maincloud.spacetimedb.com` and
   `VITE_STDB_DB=fightcard`. Keep runner tokens and all fighter model settings server-side.
5. Regenerate both clients. Run the real-module smoke with `FC_ENGINE=mock`, payments off and ledger
   money mode. Check two independent browser identities can register, receive Director-authorized
   test credit, place bets before lock, observe the same event sequence and receive settlement.
   Confirm those mock/demo runs leave Elo and cards unchanged.
6. Check phones reach Maincloud over cellular and the runner reconnects using its saved identity.
   Only then switch the runner's fighter backend for real-match validation. Keep the shared local
   server available as the fallback; switching databases does not transfer state or balances.

## K-08 decision

Use the script-vendored, import-free `src/vendor/parimutuel.ts` (ADR-019).
`node scripts/vendor-engine.mjs --check` verifies byte-for-byte agreement with the engine source.
The module builds and publishes with that copy, and both fixture unit tests and the live settlement
check agree with the engine payout calculation. Workspace imports are unnecessary in the module bundle.
