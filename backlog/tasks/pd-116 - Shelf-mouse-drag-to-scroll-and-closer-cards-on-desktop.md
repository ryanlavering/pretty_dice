---
id: PD-116
title: Shelf: mouse drag to scroll, and cards as close together on desktop as on a phone
status: Needs Review
assignee: []
created_date: '2026-11-12T01:30:00Z'
updated_date: '2026-11-12T01:30:00Z'
labels:
  - bug
  - dice-bag
dependencies: []
parent_task_id: PD-102
priority: medium
ordinal: 116000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner feedback 2026-11-11: click and drag with a mouse did not move the shelf (touch and trackpad scroll natively), and desktop cards sat further apart than on a phone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dragging the shelf with a mouse scrolls it
- [x] #2 The click that ends a drag is not a tap on a card; no menu opens
- [x] #3 Scrolling or flicking the shelf never changes the selection; only a tap on a card does (owner decision 2026-11-11, replaces auto-select of the middle card)
- [x] #4 Cards use the phone spacing everywhere (68 px cards, 8 px gap, 60 px pictures)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: index.html: pointer handlers on #cards for mouse only (snap off while dragging, then activate and centre the nearest card; capture-phase click swallow). Base .card/#cards rules now carry the phone sizes (the max-width:760px override is redundant but harmless). Test: bagbrowser.spec 'a mouse drag scrolls the shelf...'; whole bagbrowser spec 19 passed. Needs owner check.
2026-11-12 (later): owner did not want auto-select of the middle card. Removed the settle-based selection (and the drag-end activate); the ResizeObserver re-centre stays. Tests updated (rotation/flick keeps 'gold'; drag keeps 'bone'); dice-bag-design.md shelf paragraph updated.
<!-- SECTION:NOTES:END -->
