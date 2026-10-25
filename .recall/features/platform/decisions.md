# platform — decisions

<!--
Why things are the way they are. Append-only-ish: add new entries, don't rewrite old ones unless they're proven wrong (then mark them so).
Each entry: short title, the call, the reason, the date.
Project-wide decisions live in docs/PRD.md §18 (ADR-001…022); record only O2-local decisions here.
-->

## UI in code with KokonutUI, Kalshi/Polymarket style
**Date:** 2026-10-25
**Call:** Build the platform from KokonutUI components (Flow Field, Widget Grid, Currency Transfer, Metric Card, Morphic Navbar) in a black minimal theme; stop using Figma for UI.
**Why:** Founder direction after comparing the navy/gold v1 with Kalshi/Polymarket; Figma MCP plan limits were also slowing the build.

## React 19 (not 18.3.1)
**Date:** 2026-10-25
**Call:** `apps/web` runs React 19.1 with Tailwind v4.
**Why:** Currency Transfer uses React 19 `<style>` hoisting, and KokonutUI targets React 19. Needs a PRD §9.2 amendment.

## Trackers and metric card live outside the bento grid
**Date:** 2026-10-25
**Call:** The board bento holds tiles; bet/fight trackers and "Your chips earned" sit in their own section.
**Why:** Widget Grid cells are single-row and fixed-height; those cards are taller than a row.

## Full-width tiles on phones
**Date:** 2026-10-25
**Call:** `narrowSpan` in the owned bento-grid returns 2.
**Why:** Half-width market tiles were unreadable at 375 px.

## Wait for hydration before selecting a source
**Date:** 2026-10-25
**Call / why:** A cold real-match URL must not fall back to a mock fixture before the database snapshot arrives.

## Keep results handoff state mounted
**Date:** 2026-10-25
**Call / why:** Unmounting the controller during live play loses podium timing and reveals settled results too early.

## Scope result markets by match
**Date:** 2026-10-25
**Call / why:** The global store contains multiple matches; settled results must not show unrelated markets.

## Use category-specific data throughout the page
**Date:** 2026-10-25
**Call / why:** A category route must not display another category’s matches or borrow its competitive stats.

## Use recorded slots and settled team outcomes
**Date:** 2026-10-25
**Call / why:** Scheduler candidate order is shuffled; team identities and winners must agree with backend settlement.
