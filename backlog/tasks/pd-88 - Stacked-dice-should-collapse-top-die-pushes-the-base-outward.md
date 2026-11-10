---
id: PD-88
title: 'Stacked dice should collapse: top die pushes the base outward'
status: To Do
assignee: []
created_date: '2026-11-10T17:05:00Z'
labels:
  - bug
  - physics
dependencies: []
priority: medium
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Low mat friction was expected to make a stacked die (e.g. tetrahedron of d20s) push the base dice outward; it doesn't - stacks stay as static piles. Investigate sleep thresholds (sleepSpeedLimit .25 / sleepTimeLimit .5 may freeze dice before they slide), convex-convex contact stability in cannon-es, and assistSettle's stacked handling. Related: PD-59, PD-62.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A 3-die base with a die on top spreads out and settles flat
<!-- AC:END -->
