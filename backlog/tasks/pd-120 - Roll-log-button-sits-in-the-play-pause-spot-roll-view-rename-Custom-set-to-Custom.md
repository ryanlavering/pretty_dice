---
id: PD-120
title: >-
  Roll log button sits in the play/pause spot (roll view); rename Custom set to
  Custom
status: Needs Review
assignee: []
created_date: '2026-11-12T07:10:00Z'
updated_date: '2026-11-12T17:15:00Z'
labels:
  - ux
dependencies: []
ordinal: 132000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The roll log toggle takes the bottom-right slot the showcase play/pause button uses, visible in roll view only; the log panel is hidden in showcase. The Custom set shape button is renamed Custom to stop its text wrapping on the control row.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Log button in the play/pause position during rolls
- [ ] #2 Shape button reads Custom without wrapping
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12 fix: the log button was still visible in showcase (the #tools button display rule outranked the hide rule); now hidden outside roll view, with a test.
<!-- SECTION:NOTES:END -->
