---
id: PD-68
title: Roll log (history)
status: Done
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-13T08:14:00Z'
labels:
  - feature
milestone: m-0
dependencies: []
priority: medium
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep a history of rolls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rolls listed with dice and totals
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Delivered by PD-102.4 (owner approved), commit 2d6d2bc: the roll log lists each roll's dice (as design chips) and total, keeps the last 200, and has the test 'the roll log keeps the last 200 rolls...' plus PD-135 (set-name link). Verified in code and tests; closing as a duplicate.
<!-- SECTION:NOTES:END -->
