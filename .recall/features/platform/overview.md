# platform

**Status:** active
**Paths:** `apps/web/src/ui/**`, `apps/web/src/styles/**`, `apps/web/src/pages/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/src/index.css`, `apps/web/{index.html,components.json,vite.config.ts,tsconfig.json,package.json}`, `docs/status/O2.md`, `docs/requests/O2.md`
**Last touched:** 2026-10-25

## What this is
Workstream O2 of the Fight Card build. React UI: lobby, match HUD, bet slip, results, FIFA cards, profiles, leaderboard, Forge, /m mobile, Director (E08, E09, E11 UI, E12). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- **Direction changed (founder, 2026-10-25 ~01:55):** the UI is built in code from **KokonutUI** in a black, minimal Kalshi/Polymarket style. Figma is no longer used for UI. The PRD §10 navy/gold design is superseded for the platform (needs a HEAD amendment).
- `apps/web` exists: Vite 5.4 + React 19.1 + Tailwind 4.1 + react-router 6.30 + motion + lucide. KokonutUI components are installed via the shadcn registry `@kokonutui` into `src/components/kokonutui/` (owned code).
- Routes: `/` is the Flow Field entry page ("Fight Card", "AI agents fight. You call it."). `/markets` and `/markets/:category` are the dashboard: Morphic Navbar categories; a bento board (leaderboard + Enter-the-arena / movers, recent bets, Build-your-agent); live bet and fight trackers (`StepTracker`, from Currency Transfer); a Metric Card ("Your chips earned"); agent tiles; a prediction hub with interest filters.
- All data is mock (`src/ui/mock.ts`). Buttons are visual only. Avatars are monograms; agent and arena art are deferred.
- Verified: tsc clean, `vite build` OK, no console errors, 1440 px + 375 px renders. Run with `npm --prefix apps/web run dev` (port 5173).
- Figma reference file (v1 + v2 frames, agents v2, volcanic arena): https://www.figma.com/design/l4pXxI22J9zzAUxfjsdrCz

## Open threads
- [ ] Wire `src/data/**` SpacetimeDB bridge (HEAD, PRD §8.7) in place of `src/ui/mock.ts`
- [ ] Bet slip / place-bet flow; match page with the arena canvas; Forge page; `/m` mobile bet page; card modal
- [ ] Agent and arena art (use Figma v2 frames as reference)
- [ ] Root npm workspaces (K-01) so `apps/web` joins the monorepo
- [ ] Ask HEAD to amend PRD §9.2 (React 19, Tailwind v4, KokonutUI) and §10 (market UI direction)
- [ ] Task cards still apply where relevant: U-02–U-05 (P1) · U-09 (P2) · U-06–U-08 (P3) · U-10 (P4)

## Key files
- `apps/web/src/pages/Markets.tsx`: dashboard composition
- `apps/web/src/ui/widgets.tsx`: bento tile bodies; `src/ui/mock.ts`: mock data
- `apps/web/src/components/fightcard/step-tracker.tsx`: bet/fight tracker
- `apps/web/src/components/kokonutui/morphic-navbar.tsx`: react-router shim at the top
- `docs/PRD.md` §17.6 (O2 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-kokonut-market-ui — Figma v1/v2 design, then KokonutUI market UI in code [deep]
