---
id: PD-110
title: Design thumbnail comes out small when the design has several dice
status: To Do
assignee: []
created_date: '2026-11-11T23:55:00Z'
updated_date: '2026-11-11T23:55:00Z'
labels:
  - bug
  - dice-bag
dependencies: []
parent_task_id: PD-102
priority: medium
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner report 2026-11-11 (screenshot): the active design "Rose epoxy", set up as six d20, has a tiny die in its shelf thumbnail while the other cards fill theirs.

Hypothesis (not yet reproduced): updateThumbs promises "always a single d20" but only forces the shape. captureLive() photographs whatever the stage shows, and the stage camera backs off to fit every die in the notation (needHalfW), so a multi-dice design gives a zoomed-out picture. Likely affects the live card most, and any design whose saved notation has several dice.

Fix idea: while taking a thumbnail, temporarily use a one-die notation (and restore after, as the pass already restores the snapshot), or frame the camera on dice[0]. Keep thumbKey ignoring dice count so cards do not regenerate when the count changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A design with 6 dice gets a thumbnail framed like a single-die design
- [ ] #2 Test: thumbnail of a 6d20 design matches that of the same design at 1d20 (same framing)
<!-- AC:END -->
