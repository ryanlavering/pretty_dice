---
id: PD-102
title: >-
  MILESTONE: Dice bag - many dice designs in one saved bag, mixed sets, carousel
  browser, named attack sets
status: To Do
assignee: []
created_date: '2026-11-11T07:51:00Z'
updated_date: '2026-11-11T19:58:00Z'
labels:
  - epic
  - milestone
milestone: m-0
dependencies: []
priority: medium
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-10 (big idea). Today one config = one dice design = one JSON file. Extend it to the user's dice bag: many designs at once, saved together as one bag file. Pieces: (1) Bag data model + file format (bag JSON containing N designs, versioned, import/export, localStorage; the current single design file stays loadable as a bag of one). (2) Sets in the showcase can be made of several designs (e.g. a d20 in one material with d6s in another), so set notation needs a design reference per die or term. (3) Simple carousel-style browser for the bag: swipe/flick through designs, add, duplicate, rename, delete, reorder. (4) Merge with the character / attack set idea (PD-73): several named custom sets per bag or character (perception, eldritch blast, ...), each set = notation + which design each die uses, with stat bonuses. (5) Roll log (PD-68) keyed to sets. Related: PD-27 (custom set notation), PD-73 (characters/NPCs), PD-72 (semi-random constraints), PD-13 (design JSON). Suggested order: data model and file format first (own design doc), then bag browser, then mixed-design sets, then named sets/characters.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bag file with several designs round-trips; a single design file still loads
- [ ] #2 Carousel browser to pick, add, duplicate, delete designs
- [ ] #3 A set can use more than one design
- [ ] #4 Several named sets per bag
<!-- AC:END -->
