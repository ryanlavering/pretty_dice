---
id: PD-61
title: Colors persist across substrate changes
status: To Do
assignee: []
created_date: '2026-11-10T16:19:00Z'
labels:
  - feature
  - randomize
dependencies: []
priority: high
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Randomize currently gives each substrate its own random colors, so changing substrate changes all colors. Want one shared palette. Color-limited substrates (metal, stone) derive colors from their own logic when chosen first, but extra colors are still chosen even if unused (metal, solid plastic) so other substrates have a full set to seed from. Edits and colors chosen on other substrates feed back into metal/stone even when outside their normal bounds. Supersedes per-substrate palettes (pd-11); relates to pd-24, pd-25, pd-36. Needs a short design pass.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Switching substrate after Randomize keeps colors
- [ ] #2 Metal/stone-first palettes fill unused slots
- [ ] #3 Out-of-bounds edits feed back to metal/stone
<!-- AC:END -->
