---
id: PD-153
title: >-
  Bag view: a background design-picture pass that finishes mid-drag re-renders
  the tiles and disrupts the drag
status: To Do
assignee: []
created_date: '2026-11-18T15:04:00Z'
labels:
  - v4.1
dependencies: []
priority: low
ordinal: 342000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the 4.1 agent's run 10 (bagbrowser:87, spec now waits for the picture pass): updateThumbs postpones while the user is active, but a pass that already started calls renderBag() after its await, so a tile drag (reorder) begun during that pass can be disrupted. Real users only hit it in the first seconds after opening a large bag. Fix: skip or defer the renderBag() when a drag/press is active, or update tile images in place instead of re-rendering. Low priority; owner may pull into 4.0 if they notice it.
<!-- SECTION:DESCRIPTION:END -->
