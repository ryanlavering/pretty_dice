---
id: PD-107
title: Load design should add a new design at the end of the bag, not overwrite the current one
status: Needs Review
assignee: []
created_date: '2026-11-11T23:00:00Z'
updated_date: '2026-11-11T23:00:00Z'
labels:
  - bug
  - dice-bag
dependencies: []
parent_task_id: PD-102
priority: medium
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Settings > Load design replaced the live design (and so the active bag entry's look). It should land the loaded file as a new design at the end of the bag and make it active, leaving the current design and its unsaved edits alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Loading a single-design file appends a new design to the end of the bag and activates it
- [x] #2 The previously active design is unchanged (pending edits kept)
- [x] #3 A bag file chosen via Load design shows a message pointing to Add to the bag > From a file
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: Load design now calls bagOps.addLoaded (index.html), which validates through parseBag, syncs the live design, addEntry at the end, then activates it. smoke.spec 'Save design downloads JSON; Load design...' asserts 2 designs, last is active, loaded shape. Fix landed in commit 67f37d9 on v3-p2-orientation. Needs owner check. Same-named designs keep the file's name (no copy suffix).
<!-- SECTION:NOTES:END -->
