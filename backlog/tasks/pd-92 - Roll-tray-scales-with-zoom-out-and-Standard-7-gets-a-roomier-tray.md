---
id: PD-92
title: Roll tray scales with zoom-out and Standard 7 gets a roomier tray
status: Needs Review
assignee: []
created_date: '2026-11-10T22:05:00Z'
updated_date: '2026-11-10T22:23:00Z'
labels:
  - bug
  - physics
dependencies: []
priority: high
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner: rolling Standard 7 at full zoom-out got stuck most times; roll area felt too small. Fix: tray (physics bounds, mat, shadow) grows with zoom-out (K=k*max(1,zoom)); Standard 7 tray k=2.25; halfZ floor 2.2K. Headless Standard 7 leaning rolls: ~50% before -> ~1 in 8 after.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Standard 7 at max zoom-out settles without frequent leans/piles
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reworked: tray size is one general function of the dice (sum of squared diameters x4 -> area; X:Z 1:1.5, min 1.9 x 2.8), no per-shape special case, independent of viewport and zoom. Default roll camera distance = max(9.76, fit tray width for this stage aspect, fit tray depth); user zoom multiplies that. Tray sizes: 1d20 1.9x2.85, 2d6 2.3x3.5, 3d8 2.8x4.2, 6d6 4x6, 10d4+5d20 6.3x9.5, 20d6 7.3x11. Standard 7 leaning rolls ~2/10 on both desktop and phone window (was ~5/10). Test hooks: ?test=views, ?zoom= sets both zooms.
<!-- SECTION:NOTES:END -->
