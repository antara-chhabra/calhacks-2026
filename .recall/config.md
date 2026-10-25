# recall config

**Sharing mode:** shared  <!-- personal | shared -->
**Initialized:** 2026-10-25

<!--
- personal: .recall/ is gitignored. Memory is yours alone.
- shared: .recall/ is committed. Teammates pick up your context.

To switch modes later: change the value above and adjust .gitignore by hand.
-->

## Settings

- **archive_threshold:** 5  <!-- after this many sessions per feature, /recall dump asks to archive -->
- **recent_size:** 3        <!-- how many entries recent.md keeps -->

## Team notes

- Shared mode: commit `.recall/` with the first scaffold commit (K-01). Each workstream orchestrator dumps into its own feature; HEAD dumps into `planning`.
- Feature ↔ workstream map: planning = O0 HEAD · arena = O1 · platform = O2 · backend = O3 · runtime = O4 · fighters = O5 · integrations = O6 · ship = O7 (PRD §17.5).
