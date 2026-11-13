---
id: PD-130
title: 'Shelf: mouse wheel scrolls sideways; clicking a card does not recentre'
status: Done
assignee: []
created_date: '2026-11-13T00:58:00Z'
updated_date: '2026-11-13T16:41:00Z'
labels:
  - ux
dependencies: []
ordinal: 138000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner request (2026-11-12): on desktop the mouse wheel over the shelf should scroll it left/right. Clicking a design in the shelf must not shift the shelf; selecting a design by another means (bag sheet, random draft, set open, etc.) recentres the shelf only when the selected card would otherwise be off screen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Mouse wheel over the shelf scrolls it sideways
- [ ] #2 A click on a visible card leaves the shelf where it is
- [ ] #3 Selecting an off-screen design by other means brings it to the centre
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: mouse wheel over the shelf scrolls it sideways; tapping a card selects it without moving the strip; selecting a design by another route (sheet, draft, set) recentres the strip only when that card would be off screen. First render and resize/rotation still centre the active card. Test: 16-design bag, wheel, tap, off-screen activate.
<!-- SECTION:NOTES:END -->
