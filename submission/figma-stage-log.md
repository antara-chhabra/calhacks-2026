# Fight Card — Figma Stage Log

Figma track "Idea To Demo" (Cal Hacks 13.0). Prizes in play: Best Figma Workflow, Best Stage Log, Best Design, Most Creative.

This file has three parts:

1. **Stage summaries**: the submitted log, at most 200 words per stage. Written from the running log at G4.
2. **Running log**: timestamped entries added *as the work happens*, never rewritten afterwards. This is the evidence trail. It must record rework, dead ends and abandoned tools.
3. **Figma file register and submission checklist.**

Rules for whoever adds an entry (human or agent):
- Log the tool, why it was chosen *for this step*, start/end time, what came out, and where that output went next (file path, Figma node, commit).
- Log friction honestly: failures, retries, things thrown away.
- Score each step from 1 to 5 for how well the tool worked, with one line of why.
- Non-Figma tools go in too. The judges want the real path, not a Figma-only story.

---

## 1. Stage summaries (submitted; ≤ 200 words each)

> Draft these at G4 (07:45) from the running log. Every claim should point to a running-log entry.

### Ideation: exploring and shaping the idea
- **Tools & why:** _TBD_
- **Minutes:** _TBD_
- **Score (1–5):** _TBD_
- **How the output made it into the final project:** _TBD_

### Prototyping: making something you could click through or try
- **Tools & why:** _TBD_
- **Minutes:** _TBD_
- **Score (1–5):** _TBD_
- **How the output made it into the final project:** _TBD_

### Handoff: moving a design or spec toward implementation
- **Tools & why:** _TBD_
- **Minutes:** _TBD_
- **Score (1–5):** _TBD_
- **How the output made it into the final project:** _TBD_

### Code generation: producing the working code
- **Tools & why:** _TBD_
- **Minutes:** _TBD_
- **Score (1–5):** _TBD_
- **How the output made it into the final project:** _TBD_

### Before / after (for the Adoptability criterion)
> Record measurable deltas as they appear, e.g. "tokens.css generated from Figma variables: 0 hand-copied hex values, 0 drift bugs" or "screen built from frame in N min vs M min hand-built".

| Metric | Without this workflow | With it | Evidence |
|---|---|---|---|
| _TBD_ | | | |

---

## 2. Running log

Format: `HH:MM–HH:MM PDT · Stage · Tool · Score` then what/why/output/next.

### 2026-10-24 20:17 – 2026-10-25 00:24 PDT · Ideation · Claude Code (not Figma) · 4/5
- **What:** Chose the direction (humans bet play-money chips on AI fighters; integrals as the fight; VAR overturns) and wrote PRD v1.0.0 (`docs/PRD.md`, 2,565 lines).
- **Why this tool:** Ideation was mostly about scope, sponsor fit and contracts (text-heavy decisions), not visuals. A long-form spec was the fastest way to lock a plan for 8 parallel workstreams.
- **Output → next:** PRD §10 "Design requirements" gives normative design tokens, typography, a stage layout with exact coordinates, the FIFA-style card spec, and ASCII wireframes for Lobby, Match, Forge and Mobile. These ASCII wireframes are the input to the Figma Design stage.
- **Friction:** The wireframes are ASCII only. Nobody has *seen* the product yet, so visual gaps (density, hierarchy, card legibility at small sizes) can't be judged. This is the reason to move into Figma next instead of straight into React.
- Commit: `1d030cf`.

### 00:37 PDT · Prototyping (setup) · Figma MCP (Claude Code) · blocked
- **What:** Started the plan to turn PRD §10 into Figma Design frames: design-system variables and components, then Lobby, Match + arena, Forge, Mobile and fighter cards.
- **Friction:** The Figma MCP server needs a one-time OAuth before the agent can read or write files. That's a manual step a human does in the client, not the agent. Logged so other teams budget ~2 min for it before the build starts.
- **Next:** Once auth is done: design system → screens (see plan in §4).

### 00:41 PDT · Prototyping (setup) · Figma MCP (Claude Code) · still blocked
- **What:** The human signed in to Figma, but the agent session still reported `plugin:figma:figma` as `needs_auth` and no Figma tools loaded.
- **Friction / lesson:** Signing in has to happen *inside the same agent session* (its own `/mcp` server list). Signing in somewhere else (another window or the web connectors page) doesn't carry over. That cost one extra round trip. Reusable tip: sign in from `/mcp` in the session that will do the work, then check the server shows "connected" before giving the agent design tasks.

### 00:43–00:45 PDT · Prototyping (F-1 foundations) · Figma Design via Figma MCP `use_figma` (Claude Code) · 4/5
- **What:** Created the file and turned PRD §10.2/§10.3 into Figma foundations in one script: 34 variables (collection `Fight Card`, all with explicit scopes and `var(--…)` WEB code syntax matching `tokens.css` names), 17 text styles (Lilita One / Barlow Condensed / Barlow / JetBrains Mono), 2 hard-shadow effect styles, 8 gradient paint styles (card tiers, special frames, dusk sky).
- **Why this tool:** The tokens already existed as text in the PRD. Having the agent write them straight into Figma variables (with code syntax) means design and `tokens.css` share one naming scheme, so handoff later is a lookup, not a translation.
- **Friction:** The first script failed: the **Starter plan allows only 3 pages** (it rolled back cleanly). We restructured to `01 System`, `02 Arena`, `03 Screens`. We checked the subscribed community libraries (Material 3, iOS 26, Simple DS) with `search_design_system`: no match for a bespoke "Saturday-morning platform fighter" style, so we built from scratch on purpose.

### 00:45–00:48 PDT · Prototyping (F-2/F-3 components + art) · Figma MCP `use_figma` · 5/5
- **What:** Six house fighters drawn as vector components from **one parametric SVG rig** recolored per `SkinSpec` (head, weapon, emblem and build swap per fighter). This is the "VEX drawn reference" the Art Bible (A-01) needs, done for all six. Then: Button (3 styles × 2 states), Chips, Odds pill, Status badge (6 types, always dot + word), Problem gem (3 states), Fighter tag, Feed line, Fighter plate (portrait = instance-swap property), Panel (angled corner), and the **FIFA-style Fighter card** (shield, 7 tier/frame variants, text and portrait properties). Everything is bound to variables and styles.
- **Output → next:** Part templates and palette rules for O1's `public/art/fighters/**`; component APIs that map 1:1 to U-01 primitives.
- **Rework:** The card's footer (stats/record/lock line) overlapped the shield point and took 2 fix passes. The PRD's layout lists sizes but not vertical positions; Figma made the gap visible.

### 00:48–00:51 PDT · Prototyping (F-3 arena) · Figma MCP `use_figma` · 5/5
- **What:** `Stage/Backdrop` component at the PRD's exact 1920×1080 coordinates (platforms, parallax layers named with their factors, jumbotron), then `Arena/Live` (4 fighters at normative slots, flipped for left-facing slots; slash trail, hit spark, score pop, knockback, referee drone + yellow card, think bubble, tool icon), `Arena/VAR` (saturation-blend desaturate to 30%, VAR REVIEW stamp, rewind ghost, OVERTURNED verdict, −10) and `Arena/Results` (KO blast, winner, confetti, rank badge).
- **Spec bug caught by design:** At the PRD §10.6 coordinates, the **jumbotron (y 120–260) collides with the heads and name tags of fighters on the float platforms** (feet at y 520, 300 tall). Fix in Figma: jumbotron raised to **y 48–188**. → Change request for HEAD: amend §10.6. Nobody would have seen this until the Pixi arena was running.
- **Rework:** VAR overlay covered the rewind ghost (the whole point of the moment); re-laid out once.

### 00:51–00:54 PDT · Prototyping (F-4 screens) · Figma MCP `use_figma` · 3/5
- **What:** Lobby `/` (1440) composed only from component instances: nav with chips balance, "Tonight · Match #43" poster with 4 live cards + odds, commit hash, CTA buttons, QR join, Live-now (mini arena = scaled `Arena/Live` instance), Recent, Bet feed, daily chips footer.
- **Friction:** (1) Empty auto-layout "spacer" frames default to 100 px tall, which inflated rows. Fix: explicit 1 px spacers. (2) Overriding an instance fill with the *same* bound variable as the main component rendered black. Fix: leave the inherited fill alone.
- **Hard stop:** The next call (Match screens in 3 states) was refused: **"You've reached the Figma MCP tool call limit on the Starter plan."** Our seat is a *View* seat on a Starter team, which gets **20 MCP calls per month**. Figma's docs list Education / Professional Full or Dev seats at 200/day. The track requires Edu verification anyway, and it would also lift the 3-page cap.
- **Lesson for other teams:** Do Edu verification and get a Full/Dev seat **before** the build. Budget your MCP calls: our foundations-to-arena run took ~20 calls because each phase was a large, retry-safe script rather than many small edits.

### ~01:00 PDT · Prototyping (unblock) · Figma MCP on a second account · 4/5
- **What:** Teammate account (Education plan) was given edit access to the same file and signed in to the MCP from this session. Calls worked again with the file left where it was.
- **Output:** Match screen in 3 states (live / VAR / results), Forge step 3 (with a community fighter generated from the same rig: "skins are data"), Mobile `/m` bet + result, `Card/Mini` component.
- **Caught in review:** The Results podium ranked PIP 2nd, but the plates and feed said VEX. Fixed so all three agree. A consistency check like this is cheap in Figma and expensive in code.

### ~01:10–01:55 PDT · Ideation loop-back → Prototyping v2 · Figma MCP · 3/5
- **Why we looped back:** The founder compared v1 (navy/gold "Saturday-morning" UI) with **Kalshi and Polymarket** and redirected: black minimal UI, clear up/down colors, categories nav, leaderboard in the center, arena + "build your agent" on the right, ticker boxes, recent bets, agent tiles, a prediction hub. Agents should be redrawn in a heroic **concept-art register** (style reference only; original characters), in a **gray-black volcanic arena** with elemental FX.
- **What we made:** `Market` variable collection (black theme, up/down semantics, element FX colors) and Inter text styles; six agents v2 (heroic proportions; the first pass had puppet-thin limbs, so we redrew them with muscular tapered limbs); `Arena v2` volcanic backdrop + live clash (fire vs water, storm strike, sparkles; the first water pass read as a flat block and was redrawn as a wave crest); market primitives (avatar, buttons, tabs, sparklines, ticker tiles, bet rows, leaderboard row).
- **Friction:** The browser pane blocked kalshi.com / polymarket.us / the art wiki, and fetches returned 429/402. We worked from Polymarket's page text plus known patterns. `resize()` silently reset auto-layout sizing to FIXED and collapsed three components to 10 px (one fix pass).
- **Abandoned:** At 01:55 the founder stopped the Figma track for UI in favour of building the real UI from **KokonutUI** components in code. The v2 Figma frames stay as the visual reference for agent/arena art (skipped in code for now).

### 01:55–02:09 PDT · Code generation · Claude Code + KokonutUI (shadcn registry) · 5/5
- **What:** Scaffolded `apps/web` (Vite 5.4 + React 19 + Tailwind v4 + react-router 6), added the `@kokonutui` registry to `components.json`, and installed **Flow Field, Widget Grid (bento), Currency Transfer, Metric Card, Morphic Navbar** with `npx shadcn add`. Built:
  - `/`: entry page on Flow Field. "Fight Card", tagline **"AI agents fight. You call it."**
  - `/markets/:category`: Morphic Navbar categories over a bento board (leaderboard 4 cols + Enter-the-arena; then market movers, recent bets, Build-your-agent under the arena), live trackers, an agents bento and a prediction-hub bento with interest filters.
  - `StepTracker`: Currency Transfer generalized into the **bet placed** and **fight in progress** trackers (chips, never currency).
  - Metric Card as **"Your chips earned"** insights.
- **Adaptations (owned code):** morphic-navbar used `next/link` / `usePathname`, so we added a 6-line react-router shim. On phones the bento now gives each tile the full width. The leaderboard uses container queries so it reads right at any span.
- **Decision:** React 19 instead of the PRD's 18.3.1, because Currency Transfer relies on React 19 `<style>` hoisting. Needs a PRD §9.2 amendment by HEAD.
- **Verified:** `tsc` clean, `vite build` passes, no console errors, checked at 1440 px and 375 px in the browser.
- **Figma → code trace:** The leaderboard columns, ticker tiles (price ¢ + change chip + sparkline), bet-row status pills and up/down colors came straight from the v2 Figma primitives. Category names came from the v2 nav brief.

---

## 3. Figma file register

All files must be shared as **"Anyone with the link"** before submission.

| File | Product | Purpose | Link | Shared "Anyone"? |
|---|---|---|---|---|
| Fight Card — Design System & Screens | Figma Design | Variables (PRD §10.2), type styles (§10.3), components, arena, screens | https://www.figma.com/design/l4pXxI22J9zzAUxfjsdrCz | ☐ |
| Fight Card — Clickable prototype | Figma Design prototype / Make | Lobby → Match → Results click-through | _TBD_ | ☐ |
| Fight Card — Pitch | Figma Slides | Required deck: problem, product, workflow, stage log | _TBD_ | ☐ |

## 4. Planned Figma work (tracks the stages)

| Step | Stage | Figma product | Output | Feeds into |
|---|---|---|---|---|
| F-1 ✅ | Prototyping | Figma Design (via MCP) | Variables collection from PRD §10.2 tokens; text styles from §10.3 | `apps/web/src/styles/tokens.css` (O2) |
| F-2 ✅ | Prototyping | Figma Design | Components: panel (angled corner), buttons, chips, odds pill, fighter plate, feed line, fighter card (shield, tiers, frames) | U-01 primitives (O2) |
| F-3 ✅ | Prototyping | Figma Design | Sky Colosseum stage frame at 1920×1080 with slots/platforms at PRD §10.6 coordinates; all 6 fighters drawn | `docs/art-bible.md`, arena (O1) |
| F-4 ✅ | Prototyping | Figma Design | Screens v1: Lobby · Match (live / VAR / results) · Forge step · Mobile `/m`; v2 market theme, agents and volcanic arena | Visual reference for O1/O2 |
| F-7 ✅ | Code generation | Claude Code + KokonutUI | `apps/web`: entry page (Flow Field), markets dashboard (bento, trackers, metric card, morphic navbar) | `apps/web/src/**` |
| F-5 | Prototyping | Figma prototype or Make | Click-through Lobby → Bet → Match → Results | Demo video, Slides |
| F-6 | Handoff | Figma MCP (design context, variables) | Agent reads frames and variables → code | O1/O2 implementation |
| F-7 | Code generation | Claude Code + Figma MCP | React components and tokens generated from frames, diffed against the design | `apps/web/src/**` |
| F-8 | Presentation | Figma Slides | Required pitch deck | Devpost |

## 5. Submission checklist (from the track spec)

- [ ] Demo video, ≤ 3 min
- [ ] This stage log: ≤ 200 words per stage; names the Figma product used per stage and why
- [ ] Figma Slides deck showing the work and the workflow (required)
- [ ] Devpost embeds the Figma files (Make and/or prototype) plus a link to the repo
- [ ] Every Figma file shared to "Anyone"
- [ ] Each team member is Edu-verified on Figma
