---
id: PD-119
title: 'Bag sets polish: default names and chip display'
status: Done
assignee: []
created_date: '2026-11-12T07:10:00Z'
updated_date: '2026-11-13T16:41:00Z'
labels:
  - feature
  - bag
dependencies: []
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Saving the current dice names the set after what is selected: the formula when Custom is selected (designs omitted, e.g. 3d6+1d10+2), the selected shape otherwise (d12, d%), and prenamed sets keep their name (Standard 7). Set rows show chips with 'd4 ×5' text and the modifier instead of spelling out the notation. Set thumbnails use colour-chip dummies rather than exact dice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Default set name follows the selection as above
- [ ] #2 Rows show chip + dN ×count, no notation text
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: a name box + Save under the Custom controls saves the current dice as a new set (always a copy; blank name uses the formula, shown as the placeholder). Editing an existing set is PD-124.

2026-11-12: owner approved.
<!-- SECTION:NOTES:END -->
