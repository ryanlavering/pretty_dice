---
id: PD-92
title: Roll tray scales with zoom-out and Standard 7 gets a roomier tray
status: Needs Review
assignee: []
created_date: '2026-11-10T22:05:00Z'
updated_date: '2026-11-10T22:05:00Z'
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
