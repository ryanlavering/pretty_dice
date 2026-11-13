---
id: PD-131
title: 'Design pictures: better angle and light (epoxy, metal)'
status: Needs Review
assignee: []
created_date: '2026-11-13T00:58:00Z'
updated_date: '2026-11-13T02:29:00Z'
labels:
  - bug
  - bag
dependencies: []
ordinal: 139000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner report (2026-11-12, screenshot of the Rose epoxy card): some offscreen pictures are mostly a reflection. Pick an orientation (and light) that gives good contrast and inner highlights for clear epoxy and also looks good for metal; check swirl, solid, stone too.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Epoxy pictures show contrast and inner highlights, not a washed-out reflection
- [ ] #2 Metal pictures look good from the same angle
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: two causes. (1) Clear epoxy refracts what is behind it; on a transparent clear it came out half see-through, so epoxy is now drawn on an opaque dark backdrop colour and cut out with a flat white mask pass. (2) The studio room's bright ceiling mirrored in every top face and a face-on d20 squarely reflected it: the picture now shows the die vertex first, tilted, with the room turned round (ceiling lights behind) and a soft front key. Checked on epoxy (pink, blue), metal (gold), swirl, solid. Epoxy lit faces are still somewhat pastel; the knobs that would change that (env intensity) have no effect in three r160.
<!-- SECTION:NOTES:END -->
