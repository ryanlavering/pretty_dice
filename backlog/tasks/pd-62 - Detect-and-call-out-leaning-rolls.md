---
id: PD-62
title: Detect and call out leaning rolls
status: To Do
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T17:05:00Z'
labels:
  - feature
  - physics
dependencies: []
priority: medium
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detect dice that settle leaning (not flat on a face) and call them out visually/in the result.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Leaning dice are flagged after settle
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 screenshot: d4 propped at an impossible angle on d8 edges (not flagged by assistSettle; lean test is flat<.985 && y<=TABLE_Y+1.35). Include 'resting on another die' cases and small-die height thresholds.
<!-- SECTION:NOTES:END -->
