---
id: PD-38
title: Model inclusion in epoxy dice
status: Needs Review
assignee: []
created_date: '2026-11-09T22:41:00Z'
updated_date: '2026-11-10T00:28:00Z'
labels:
  - look
dependencies: []
priority: low
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Embed a miniature of a user-supplied model (GLB/OBJ/STL) inside clear epoxy, e.g. a rubber duck floating in the die. Plan: load with three loaders, scale to fit inside the die (cap by inradius), attach as a child of the die mesh so it tumbles with it; it refracts through the epoxy automatically. Controls: file picker, size, offset, rotation. Optional later: ghosting or voxel density. Open issues: room in small dice (d4/d6) and number occlusion, model persistence (too big for localStorage; embed in design JSON or IndexedDB), per-die vs all dice in sets, manufacturing needs a physical miniature to cast, model licensing.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added 10 more built-in procedural models (cat's eye, dragon eye, gold coin, black cat, skull, heart, crystal gem, goldfish, mushroom, gold star); model registry drives the Inclusion dropdown and the design JSON. Gallery test hook ?test=models. Eye/coin/gem rely on emissive so they stay bright inside the epoxy. Dragon eye brow ridge was nudged after the last render and not re-checked.
<!-- SECTION:NOTES:END -->
