---
id: PD-124
title: 'Bag sets: make a copy and edit in place'
status: Needs Review
assignee: []
created_date: '2026-11-12T17:11:00Z'
updated_date: '2026-11-13T07:10:00Z'
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

2026-11-12: implemented. Row menu has Edit… and Make a copy (Use the current dice is gone). Edit expands the row into an inline editor: name, single-shape presets (d4..d20, Standard 7), formula field (typed @design checked), Dice use picker, term chips, steppers, modifier, Save / Cancel. It works on a draft of that one set, so the live Custom selection is never touched; Save also clears the set's last result. Copy puts 'X copy' right after the original. Checked at 1100 px and 390 px.

2026-11-12 owner feedback: editor was too spread out on desktop; now a compact panel (max 400 px, left aligned, tighter rows, presets in 5 columns) with a close X in its header (closes without saving) plus Save / Cancel.

2026-11-13 phone review: Cancel removed (duplicated the X); X asks before discarding edits; see PD-136.
<!-- SECTION:NOTES:END -->
