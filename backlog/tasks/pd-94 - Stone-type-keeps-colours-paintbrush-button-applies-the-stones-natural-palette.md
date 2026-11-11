---
id: PD-94
title: >-
  Stone type keeps colours; paintbrush button applies the stone's natural
  palette
status: Done
assignee: []
created_date: '2026-11-11T01:08:00Z'
updated_date: '2026-11-11T01:28:00Z'
labels:
  - feature
  - ui
dependencies: []
priority: medium
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-10 (follow-up to PD-61): choosing a stone type in the dropdown applies only the texture, not the colours. A small paintbrush button next to the dropdown paints in the chosen stone's natural colours from its palette rules (STONES[type].pal), into the shared palette.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dropdown changes texture only
- [ ] #2 Paintbrush button applies the stone's palette
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 owner: wants the same for the base colours. Added a shuffle button next to the Base swatches: new colours from the active substrate's palette rules (freshPalette), shared palette updated, nothing else (shape, substrate, seed/pattern) changes. Test: ?test=colorrand. Seen once, not reproducible in 9 runs: an 'Uncaught TypeError ... reading trim' in a headless test run (only .trim() in the code is guarded; likely environmental).

Owner approved 2026-11-10; merged to main (053c4d0).
<!-- SECTION:NOTES:END -->
