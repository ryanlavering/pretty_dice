---
id: PD-110
title: Design thumbnail comes out small when the design has several dice
status: Done
assignee: []
created_date: '2026-11-11T23:55:00Z'
updated_date: '2026-11-13T16:41:00Z'
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
- [x] #1 No design picture is taken while the camera is still easing back from the roll view
- [x] #2 Test: roll, exit, updateThumbs mid-ease takes no picture; after the camera is home the picture is one die in a dark frame
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: Cause was not the dice count. The picture pass ran right after a roll ended: rolling is false at once but the camera (camBlend, and topBlend for the top-down hold) eases home over a second or more (tens of seconds on software GL), so the capture showed the roll view (table, tiny die). A six-dice design just rolls more often. Fix: updateThumbs defers (scheduleThumb) while camBlend or topBlend > .01. Test 'no design picture is taken while the camera eases back from the roll view (PD-110)' fails without the guard, passes with it. Test hooks: __pd.thumbBusy, thumbKey, camBlend (get/set). Needs owner check on the Rose epoxy case.

2026-11-12: owner confirmed it works well enough in testing. Follow-up (offscreen rendering, no waiting on the camera) filed as a new card.
<!-- SECTION:NOTES:END -->
