---
id: PD-106
title: >-
  Test failing on v3-p2-orientation: bagbrowser 'rotating the phone does not
  change the chosen design'
status: To Do
assignee: []
created_date: '2026-11-11T23:13:00Z'
labels:
  - bug
dependencies: []
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fails (also with the working tree stashed) at the last assertion: after a real flick the active design stays 'gold' instead of 'amethyst' (tests/bagbrowser.spec.mjs:173). Likely from commit 159981f (only a person scrolling may change the design): the test's touchstart dispatch may no longer count as a gesture. Also flaky under load: logic undo/redo (timeout) and the physics 25 s watchdog test.
<!-- SECTION:DESCRIPTION:END -->
