# platform

**Status:** active
**Paths:** `apps/web/src/ui/**`, `apps/web/src/styles/**`, `apps/web/src/pages/**`, `apps/web/src/components/**`, `apps/web/src/lib/**`, `apps/web/src/index.css`, `apps/web/{index.html,components.json,vite.config.ts,tsconfig.json,package.json}`, `docs/status/O2.md`, `docs/requests/O2.md`
**Last touched:** 2026-10-25

## What this is
Workstream O2 of the Fight Card build. React UI: lobby, match HUD, bet slip, results, FIFA cards, profiles, leaderboard, Forge, /m mobile, Director (E08, E09, E11 UI, E12). Owns exactly the paths above (PRD §9.3, §17.5); everything else is read-only for this workstream.

## Current state
- O2 U-01…U-09 merged on `main`, all on store data in the KokonutUI black Kalshi/Polymarket style: shell, cards, lobby, match + results, bet slip, leaderboard, profile, Forge, `/m`, Director, receipt. Mock data (`src/ui/mock.ts`) is gone except types.
- Everything runs on replay data today; betting/register/forge show "connect to a live match" until K-06b.
- `/m` initial load ~71 kB gz.

## Open threads
- [ ] Hook match screen to arena fc:podium
- [ ] Place <MuteToggle/> in AppShell
- [ ] U-10 polish (foil, share PNG, shortcuts, ?hud-only, a11y)
- [ ] Live adapter (K-06b, DV1277) will light up betting/register/forge
- [ ] Score sparkline uses derived data until per-match scorePct exists

## Key files
- `apps/web/src/pages/Markets.tsx`: dashboard composition
- `apps/web/src/ui/widgets.tsx`: bento tile bodies; `src/ui/mock.ts`: mock data
- `apps/web/src/components/fightcard/step-tracker.tsx`: bet/fight tracker
- `apps/web/src/components/kokonutui/morphic-navbar.tsx`: react-router shim at the top
- `docs/PRD.md` §17.6 (O2 task cards) and §17.5 (charter)

## Recent sessions
- 2026-10-25-platform-screens — U-01…U-09 on store data; /m split entry
- 2026-10-25-kokonut-market-ui — Figma v1/v2 design, then KokonutUI market UI in code [deep]
