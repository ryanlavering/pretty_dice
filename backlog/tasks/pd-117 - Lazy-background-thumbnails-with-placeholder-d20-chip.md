---
id: PD-117
title: Lazy background thumbnails with placeholder d20 chip
status: Review Complete
assignee: []
created_date: '2026-11-12T06:15:00Z'
updated_date: '2026-11-12T22:52:00Z'
labels:
  - bug
  - bag
dependencies: []
priority: high
ordinal: 129000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Loading a bag of 10 designs locked the page: the thumbnail pass renders every missing design in one blocking loop. Make it lazy and low priority: one design per idle slice (yielding between), visible/active first, paused while the user interacts. Until a real render exists, show a generic dummy d20 picture tinted with the design's colour chip (colours + substrate, derived from the design JSON).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Importing a 10-design bag does not block the page (no long task from thumbnails)
- [ ] #2 Cards and tiles show a tinted dummy d20 until the real picture arrives
- [ ] #3 Thumbnails render one at a time in the background and stop when the user interacts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Thumbnail pass now makes one picture per idle slice (pauses while the user touches things); designs show a tinted dummy d20 (colours + substrate from the design JSON) until the real picture exists. Bag sets show per-term chips. Test: ten-design bag.

Follow-up (owner): (1) editing a design keeps its previous real picture on screen until the new one lands (no flash of the stand-in); (2) the stand-in is framed like the real 144 px render (measured: die ~74% of width, centred ~46% down, on the stage backdrop gradient).

2026-11-12: owner approved ('background loading looks good'). Bag-sheet save/load/copy buttons requested during this review are PD-128.
<!-- SECTION:NOTES:END -->
