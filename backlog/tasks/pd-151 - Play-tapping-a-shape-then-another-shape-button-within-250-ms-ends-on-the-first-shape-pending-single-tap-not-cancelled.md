---
id: PD-151
title: >-
  Play: tapping a shape, then another shape button within 250 ms ends on the
  first shape (pending single tap not cancelled)
status: To Do
assignee: []
created_date: '2026-11-18T13:38:00Z'
labels:
  - v4.1
milestone: m-2
dependencies: []
priority: low
ordinal: 340000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the 4.1 agent's baseline run (owner-comments:110, spec fixed): in Play, tap d6 then Custom within the 250 ms tapOrAdd window -> the deferred d6 tap fires after and overrides Custom. A pending single tap should be cancelled when a different shape button/chip is activated (the new tap flushes or replaces it). Rare for real users; refinement for 4.1 (shared tapOrAdd).
<!-- SECTION:DESCRIPTION:END -->
