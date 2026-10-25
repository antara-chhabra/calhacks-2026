# 2026-10-25 — platform/kokonut-market-ui

**Session ID:** 2026-10-25-s2 (split: also `ship/2026-10-25-figma-stage-log`)
**Repo state:** main @ 1d030cf, 2 untracked paths (`apps/web/`, `submission/`) before the commit that carries this dump

## Goal
Design the En Garde UI, first in Figma and then (after a founder pivot) as working code built from KokonutUI in a Kalshi/Polymarket-style black theme.

## What happened
- 00:43–00:54: Figma MCP v1 in file `l4pXxI22J9zzAUxfjsdrCz` (https://www.figma.com/design/l4pXxI22J9zzAUxfjsdrCz). Built variables (PRD §10.2), text styles, components, a FIFA card (7 tiers), six fighters (one SVG rig), Sky Colosseum arena (Live/VAR/Results) and the Lobby. Hit the Starter plan's 3-page cap, then the View seat's 20 MCP calls/month.
- ~01:00: switched to a teammate's Education account with edit access. Built Match ×3 states, Forge step 3, Mobile `/m` ×2, `Card/Mini`.
- ~01:10–01:55: founder redirected toward Kalshi/Polymarket. Built Figma v2: `Market` black-theme collection, Inter styles, six agents redrawn in a heroic concept-art register (elemental weapons), a gray-black volcanic arena with fire/water/storm/spark FX, and market primitives.
- 01:55: founder said **stop using Figma for UI**; install KokonutUI and build in code. Agent and arena art deferred.
- 01:55–02:09: scaffolded `apps/web` (Vite 5.4, React 19.1, Tailwind 4.1, react-router 6.30) and installed Flow Field, Widget Grid (bento), Currency Transfer, Metric Card and Morphic Navbar via `npx shadcn add @kokonutui/...`. Built the `/` entry page and the `/markets/:category` dashboard. Verified tsc, vite build, no console errors, and 1440 px + 375 px renders.

## Files touched
- `apps/web/{package.json,package-lock.json,vite.config.ts,tsconfig.json,components.json,index.html}`: scaffold. `components.json` registers `@kokonutui`.
- `apps/web/src/index.css`: Tailwind v4, `@custom-variant dark` bound to `.dark` on `<html>`, Inter.
- `apps/web/src/main.tsx`, `src/App.tsx`: routes `/`, `/markets`, `/markets/:category`.
- `apps/web/src/components/kokonutui/*`: vendor (owned) code. `morphic-navbar.tsx` has a react-router `Link`/`usePathname` shim. `bento-grid.tsx` `narrowSpan` now returns 2 (full-width tiles on phones).
- `apps/web/src/components/fightcard/step-tracker.tsx`: Currency Transfer generalized (steps, labels, amounts, unit, demo loop) for bet and fight trackers.
- `apps/web/src/components/fightcard/primitives.tsx`: AgentAvatar (monogram), Sparkline, ChangeChip, Chips, LiveDot, Button tones, `useLiveValue`.
- `apps/web/src/ui/mock.ts`: agents, categories, recent bets, hub markets, `chipsHistory`.
- `apps/web/src/ui/widgets.tsx`: Leaderboard (container queries), Arena, Movers, RecentBets, BuildAgent, AgentTile, HubMarketTile.
- `apps/web/src/pages/Landing.tsx`: Flow Field hero, "En Garde", "AI agents fight. You call it."
- `apps/web/src/pages/Markets.tsx`: header, navbar, board bento (leaderboard 4 + arena 2 / movers, bets, build), trackers + metric card, agents bento, prediction hub bento with interest filters.
- `/Users/antara/calhacks/.claude/launch.json` (outside the repo): `web` dev server for the preview pane.

## Decisions made
- UI is built in code from KokonutUI, not Figma; black minimal Kalshi/Polymarket style; up = emerald, down = rose.
- React 19 instead of the PRD's 18.3.1: Currency Transfer relies on React 19 `<style>` hoisting. Needs a PRD §9.2 amendment by HEAD.
- Bento rows are single-height, so the right rail is the arena (row 1) with Build-your-agent under it (row 2). Trackers and the metric card live outside the grid because they're taller than a row.
- Agent art is deferred; avatars are color monograms in fighter identity colors.

## Open threads at end of session
- [ ] Wire real data: replace `src/ui/mock.ts` with the `src/data/**` SpacetimeDB bridge (HEAD, PRD §8.7)
- [ ] Bet slip / place-bet flow (buttons are visual only), Forge page, match/arena page, `/m`
- [ ] Agent and arena art (Figma v2 frames are the visual reference)
- [ ] Root npm workspaces (K-01) still absent; `apps/web` installs on its own
- [ ] PRD amendments by HEAD: §9.2 React 19 + Tailwind v4 + KokonutUI; §10 design direction (black market UI); §10.6 jumbotron y 48–188

## Gotchas
- `alias rm='rm -i'` in the user's shell hangs non-interactive commands. Use `command rm -f`.
- The preview pane reads `.claude/launch.json` from the session root (`~/calhacks`), not the repo.
- Vite logs "Could not Fast Refresh (DEMO_WIDGETS export)" when editing bento-grid; a full reload follows, which is harmless.
- Browser pane screenshots can capture mid-paint; re-shoot before calling a layout broken.
- Figma: `resize()` resets auto-layout sizing to FIXED; empty `createAutoLayout` spacers default to 100 px; Starter = 3 pages; View seat = 20 MCP calls/month.
