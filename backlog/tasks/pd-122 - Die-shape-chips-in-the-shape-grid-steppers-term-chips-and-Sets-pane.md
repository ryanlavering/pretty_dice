---
id: PD-122
title: Die-shape chips in the shape grid, steppers, term chips and Sets pane
status: Review Complete
assignee: []
created_date: '2026-11-12T07:10:00Z'
updated_date: '2026-11-12T23:01:00Z'
labels:
  - feature
  - bag
dependencies: []
ordinal: 130000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Small dummy chips that show each die's real shape (d4 triangle, d6, d8, d10 kite, d12, d14, d16, d20, d%, rhombic d12), tinted with the live design's colours (the term's own design in term chips and Sets rows). 2.5d facets at 30px (Sets pane); plain 2D outlines when tiny. Tiny outlines are chosen to be distinct from each other: d6 is a square, d20 the only pointy hexagon, d8 a wide diamond vs d10 a narrow kite, d12/d14/d16 pentagon/heptagon/octagon, rd12 a flat-topped hexagon. Standard 7 and Custom stay text-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shape grid, dice steppers, set term chips and Sets rows show shape chips
- [ ] #2 Tiny chips are distinguishable at a glance (no d6/d20 lookalikes)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: the dice-use dropdown now recolours the stepper chips; steppers re-laid out (icon + dN above, - count + below) so they no longer overflow; checked at 1100 px and 390 px.

2026-11-12: owner approved.
<!-- SECTION:NOTES:END -->
