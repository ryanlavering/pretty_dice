---
id: PD-38
title: Model inclusion in epoxy dice
status: Needs Review
assignee: []
created_date: '2026-11-09T22:41:00Z'
updated_date: '2026-11-09T23:02:00Z'
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
Built option A (solid miniature, no fog). Procedural rubber duck is built in (original work, no licence issues). Custom GLB/glTF/OBJ/STL loader (max 25 MB); model is not persisted across reloads or in the design JSON (only type 'duck' is). Size/Turn/Height sliders. Third-party ducks checked: Khronos Duck is under the restrictive SCEA Shared Source License (not bundled); CC0 ducks on OpenGameArt (rubby_ducky, rubberduck, rubberduckie) are Blender .blend files only, so unusable without conversion. Tested loaders via ?test=incl.
<!-- SECTION:NOTES:END -->
