---
id: PD-178
title: 'Test suite speed: full run from ~24 min to 15 min or less'
status: Review Complete
assignee: []
created_date: '2026-11-20T03:58:00Z'
updated_date: '2026-11-20T07:14:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 371000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-19: testing is a costly chore; aim for a 15-minute full suite. Data (checkpoint 41-1, 497 tests, 2 workers, 16 cores): 2182 test-seconds total, ~4.4 s per test average, dominated by page boots under software WebGL. Biggest files: bagbrowser 205 s (22 tests), owner-comments 190 s (30), games-story-ui 161 s (8), smoke 138 s (29), bagsets 118 s (28), golden 99 s, nav-dock 95 s, new-callouts 87 s, roll-framing 72 s, hotfix-401 67 s, playtest2-fixes 67 s. Levers to measure: workers (now 2 locally; PD_WORKERS), SwiftShader/GL launch flags, a test render profile (pixel ratio 1, no AA/shadows, small viewport for non-visual specs) without changing golden behaviour, more specs on the shared fixture, merging specs that each boot a page, pruning redundant tests (list every removal), remote CI sharding (matrix). Deliver: measured wall-clock on a quiet machine, per-change gain, no loss of coverage without a list.
<!-- SECTION:DESCRIPTION:END -->

## Result (2026-11-19)

Full suite 12.8 min, 490 passed / 12 skipped / 0 failed (retries=0), from 23.7-26 min. ?lite test render profile + 4 workers + CI shards. No tests removed. Details: docs/design/testing.md "Speed (PD-178)" on v4.1.
