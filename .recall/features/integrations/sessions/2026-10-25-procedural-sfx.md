# 2026-10-25 — integrations/procedural-sfx

**Session ID:** S-2026-10-25-build-wave  (split dump across planning, arena, platform, backend, runtime, fighters, integrations)
**Repo state:** main @ 152f694 (dump on branch recall/antara-build-wave), 0 dirty. Range since last dump: 131fe3e..152f694 (59 commits)

## Goal
I-03 sound effects without downloading assets.

## What happened
- All SFX synthesized with Web Audio (no files): hits, whiff, cards, VAR, KO, victory, countdown, coin, potion, ticks, blips; installAudio() on cues$; mute default on phones; voice() no-op for ElevenLabs later. HEAD installed it in App.tsx.

## Files touched
- apps/web/src/audio/**, apps/web/test/audio.test.ts

## Decisions made
- Procedural WebAudio instead of CC0 packs. Why: no file downloads; same hook later for ElevenLabs (ADR-025).

## Open threads at end of session
- [ ] Listen in a real browser and tune
- [ ] <MuteToggle/> placement (O2)
- [ ] x402/CDP, ElevenLabs, Fetch.ai still deferred

## Gotchas
- AudioContext only starts after a user gesture.
