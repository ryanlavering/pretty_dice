---
id: PD-168
title: >-
  Factoring pass S10: split sound, physics, nat20/nat1 effects, epoxy inclusion,
  thumbnail lab out of src/main.js
status: Done
assignee: []
created_date: '2026-11-19T20:18:00Z'
updated_date: '2026-11-20T07:14:00Z'
labels:
  - v4.1
dependencies: []
priority: medium
ordinal: 361000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
main.js is ~2300 lines / 320 KB. Extract in order of cleanliness: sound synth+backends (~190 lines), physics roll (~210), nat20/nat1 effects (~125), epoxy inclusion (~200), thumbnail lab (~95); bag/sets (~260) last and only if clean. Mechanical moves only, no behaviour change: golden set must stay unchanged, single-file build and artifact-csp spec green, full suite green. Sonnet lane. Start AFTER the story-dice merge (PD-160) and before the 4.1 release; avoid overlapping the grammar work in main.js (PD-167).
<!-- SECTION:DESCRIPTION:END -->
