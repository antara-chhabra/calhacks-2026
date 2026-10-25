# 2026-10-25 — platform/platform-screens

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
Take over O2 (founder approved) and build every screen on store data in the KokonutUI black style.

## What happened
- HEAD added the ui/routes glob registry + AppShell/BetSlip stubs so 5 agents could work in parallel.
- U-01 shell + primitives, U-02 FIFA card, U-03 lobby on store data (demo replay when offline), U-04 match screen + results (provably fair ✓), U-05 bet slip + My bets.
- U-06 leaderboard + profile (+ poster fit at 375), U-07 Forge wizard + My Fighters, U-08 /m phone page, U-09 Director panel (/director#token) + receipt.
- HEAD: /m split entry (~71 kB gz), admin CORS for any loopback port, installAudio in App.

## Files touched
- apps/web/src/ui/** (routes/, shell/, card/, lobby/, match/, betslip/, profile/, leaderboard/, forge/, mobile/, director/, receipt/, widgets.tsx)
- apps/web/src/pages/Markets.tsx, apps/web/src/components/fightcard/primitives.tsx
- apps/web/test/ui-*.test.ts, docs/status/img/U-0*.png

## Decisions made
- Screens are ui/routes/NN-name.tsx files exporting route(s)+order. Why: append-only extension point.
- Replay mode is read-only: placeBet/register reject not_connected with explicit copy. Why: no fake money paths.
- Director token lives in location.hash -> sessionStorage, stripped from the URL. Why: never in query strings or logs.

## Open threads at end of session
- [ ] Hook match screen to arena fc:podium
- [ ] Place <MuteToggle/> in AppShell
- [ ] U-10 polish (foil, share PNG, shortcuts, ?hud-only, a11y)
- [ ] Live adapter (K-06b, DV1277) will light up betting/register/forge
- [ ] Score sparkline uses derived data until per-match scorePct exists

## Gotchas
- Headless Chrome enforces a min window width; real phone checks done in the browser pane (no horizontal scroll at 375).
