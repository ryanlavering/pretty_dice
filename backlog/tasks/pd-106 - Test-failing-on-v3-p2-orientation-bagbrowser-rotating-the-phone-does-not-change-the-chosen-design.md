---
id: PD-106
title: >-
  Test fix: bagbrowser 'rotating the phone' flicked a strip that could not
  scroll
status: Review Complete
assignee: []
created_date: '2026-11-11T23:13:00Z'
updated_date: '2026-11-12T00:20:00Z'
labels:
  - bug
dependencies: []
ordinal: 122000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fails (also with the working tree stashed) at the last assertion: after a real flick the active design stays 'gold' instead of 'amethyst' (tests/bagbrowser.spec.mjs:173). Likely from commit 159981f (only a person scrolling may change the design): the test's touchstart dispatch may no longer count as a gesture. Also flaky under load: logic undo/redo (timeout) and the physics 25 s watchdog test.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: not an app bug. The loop ends in landscape (780 wide), where all the cards fit, so the strip cannot scroll and scrollLeft=0 fires no scroll event. The test now returns to portrait and flicks away from 0 first. The undo/redo and 25 s watchdog tests were flaky only in the 13-minute full run (load); see PD-20.7.
<!-- SECTION:NOTES:END -->
