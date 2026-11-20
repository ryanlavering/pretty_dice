---
id: PD-189
title: >-
  Tests: nav-dock.spec:81 times out in full PD_NOLITE=1 runs but passes alone
  and in-file
status: To Do
assignee: []
created_date: '2026-11-20T12:37:00Z'
labels:
  - v4.2
dependencies: []
priority: low
ordinal: 382000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen in CHECKPOINT 41-5 B, 41-6 B and 41-7 B (full suite, PD_NOLITE=1, 2 or 4 workers): 'a saved set chip and the set menu Open load the set...' hits the 90 s test timeout. It passes in 1.3 s alone with PD_NOLITE=1 and in file order (8/8 in 1.6 min, 1 worker). So it depends on what ran before it in the same worker on the shared page. The default (lite) full runs pass it. Find the leaking state or make the spec use a fresh reset. Not a release gate: the NOLITE run is extra render-path coverage.
<!-- SECTION:DESCRIPTION:END -->
