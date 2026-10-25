# Fight Card — agent instructions

The single source of truth is `docs/PRD.md`. Read §1.4, §4, §8, §9.3 and §17 before writing anything.

- **Ownership (§9.3, §17.5):** write only inside your workstream's paths. Everything else is read-only.
- **Concurrency rules (§17.4):** one worktree per orchestrator (`../fc-<ws>`, branch `ws/<ws>`); `git add <owned paths>` only,
  never `git add -A`; commits `[<TaskID>] <summary>`; never force-push; only HEAD merges.
- **Contracts:** import from `@fc/contracts` and `@fc/engine`; never copy or redefine their types; never change exported signatures.
- **Dependencies:** only HEAD edits `package.json` files and the lockfile. Need one? Append a `DEP` request.
- **Requests:** append to `docs/requests/<ws>.md`; keep working on a local stub. **Status:** update `docs/status/<ws>.md` at each gate.
- **Secrets:** `.env` lives at the repo root and is never committed. Never print, log or commit secrets or model IDs (`FC_MODEL_*`).
- **Money:** integer US cents everywhere; H0 runs `FC_MONEY_MODE=ledger` only ("Ledger mode · no funds moved").
- **Generated files** (`**/module_bindings/`) are gitignored; produce them with `npm run gen`.

Commands: `npm install` · `npm run typecheck` · `npm test` · `npm run dev:web` · `npm run runner` · `npm run gen` · `npm run keys:check` · `npm run scan:secrets`.

Project memory for resuming work lives in `.recall/` (see `.recall/tree.md`).
