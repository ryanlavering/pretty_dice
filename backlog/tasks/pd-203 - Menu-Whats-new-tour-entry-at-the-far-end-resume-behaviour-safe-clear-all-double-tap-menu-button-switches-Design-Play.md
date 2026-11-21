---
id: PD-203
title: >-
  Menu: What's new tour entry at the far end, resume behaviour, safe clear-all,
  double-tap menu button switches Design/Play
status: Done
assignee: []
created_date: '2026-11-21T01:07:00Z'
updated_date: '2026-11-21T08:06:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 396000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (RC artifact comment): the 'new items' tour entry in the menu clears all, but its call to action reads as 'take me on the tour'. Changes: (1) Put the tour entry at the OPPOSITE end of the menu from the Design|Play switch (owner: on screen that is the 'top' since the menu is oriented the other way; the switch is very common and must not move). (2) Clicking it opens the last visited item, or the lowest-index remaining item if no remaining one was visited. (3) Items get a small 'clear all' link that needs a double-tap / long-press so it cannot be hit by accident. (4) A double-click / double-tap / long-press on the menu button does the switch-to-Play/Design shortcut (single tap still opens the menu, no flicker; reuse the PD-142.38.40 'single tap waits for a possible double' pattern).
<!-- SECTION:DESCRIPTION:END -->
