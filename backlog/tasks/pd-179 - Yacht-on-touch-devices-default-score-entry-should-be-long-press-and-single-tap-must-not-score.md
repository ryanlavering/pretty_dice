---
id: PD-179
title: >-
  Yacht: on touch devices default score entry should be long press, and single
  tap must not score
status: Review Complete
assignee: []
created_date: '2026-11-20T04:38:00Z'
updated_date: '2026-11-20T06:46:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 372000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner comment on Dev artifact (2026-11-20): on mobile, single-tap still scores no matter what the Score entry dropdown says. Default on touch should be long press to score. Check scoreTap / lpAt / gprefs.scoreMode in src/main.js (~1861-1900, 2141); a single tap may only preview. Likely the PD-165 mouse-click path is firing for touch (pointerType check or emulated click).
<!-- SECTION:DESCRIPTION:END -->
