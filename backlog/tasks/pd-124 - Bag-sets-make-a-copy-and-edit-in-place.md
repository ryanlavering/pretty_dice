---
id: PD-124
title: 'Bag sets: make a copy and edit in place'
status: In Progress
assignee: []
created_date: '2026-11-12T17:11:00Z'
updated_date: '2026-11-12T23:42:00Z'
labels:
  - feature
  - bag
milestone: m-0
dependencies: []
ordinal: 135000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Future (owner request 2026-11-12): sets need Copy and Edit. The editor re-uses the existing Custom controls (notation field, dice-use picker, term chips, steppers, modifier) and the single-shape presets, presented inline in the set list view (the row expands into the editor) rather than editing via the stage. Copy duplicates a set next to the original (name + ' copy'). Replaces the current 'Use the current dice' menu item as the main way to change a set's dice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Copy duplicates a set
- [ ] #2 Edit opens the Custom controls and shape presets inline under the set row and saves back to that set
- [ ] #3 Edits never touch the live Custom selection unless the owner opens the set
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: owner scoped this into the v3.0 release.
<!-- SECTION:NOTES:END -->
