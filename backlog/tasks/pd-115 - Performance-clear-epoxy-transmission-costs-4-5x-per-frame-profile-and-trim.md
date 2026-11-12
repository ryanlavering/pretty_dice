---
id: PD-115
title: 'Performance: clear epoxy (transmission) costs 4-5x per frame; profile and trim'
status: To Do
assignee: []
created_date: '2026-11-12T04:48:00Z'
labels:
  - v3.0
dependencies: []
priority: medium
ordinal: 128000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Profiling (scripts/profile.mjs, software GL so read the ratios): clear epoxy costs about 4.5x the frame time of every other substrate (d20: 235 ms vs 50 ms; 10d6: 325 ms vs 95 ms), adds 2 shader programs and doubles draw calls/triangles, because transmission renders the scene a second time. In a mixed set one epoxy die makes the whole scene pay. Ideas: lower the transmission render-target resolution, drop it to a cheap look while dice move or the page is idle, render on demand when nothing animates, or bake a cheaper fake for sets with many dice. Measure on a real phone before choosing; also check the first-use shader compile hitch (programs 7 -> 9 on the first epoxy die). Found during PD-102.3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Epoxy frame cost within 2x of solid on the profile (scripts/profile.mjs), or a documented reason it cannot be
<!-- AC:END -->
