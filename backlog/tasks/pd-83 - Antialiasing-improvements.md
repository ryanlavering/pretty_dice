---
id: PD-83
title: Antialiasing improvements
status: Done
assignee: []
created_date: '2026-11-10T16:20:00Z'
updated_date: '2026-11-11T22:43:00Z'
labels:
  - improvement
  - visual
  - perf
dependencies: []
priority: low
ordinal: 83000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Not a big issue now but could be better. Watch performance.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: closed, no change. MSAA is already on (antialias:true) and pixel ratio is capped at 2; anything better means supersampling or post AA, which costs frame time on phones for little gain. Revisit if edges look bad on a real display.
<!-- SECTION:NOTES:END -->
