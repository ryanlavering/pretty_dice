---
id: PD-61
title: Colors persist across substrate changes
status: Needs Review
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T22:45:00Z'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 implemented (design pass: one shared 3-colour palette, state.palettes.shared). Randomize generates colours with the active substrate's own logic (metal picks a metal, stone its palette) and fills unused slots (solid plastic, metal) with harmony colours of colour 1, so every substrate has a full set. Switching substrate or stone type never changes colours; edits and colours made under another substrate carry to metal/stone even if out of their normal range. Old per-substrate saved palettes migrate to the active substrate's palette. Test: ?test=palette (8 checks ok). Also: roll tray floor raised for small counts (min 2.4 x 3.6, +4 virtual footprint) per owner feedback.
<!-- SECTION:NOTES:END -->
