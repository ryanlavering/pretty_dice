---
id: PD-31
title: Undo/redo for design changes (esp. Randomize)
status: Done
assignee: []
created_date: '2026-11-09T21:59:00Z'
updated_date: '2026-11-10T16:28:00Z'
labels:
  - ux
dependencies: []
priority: high
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
History of design settings (shape, substrate, palettes, paint, numbers, radius, epoxy, notation, seed). Randomize and discrete actions checkpoint immediately; slider/colour drags coalesce after 500 ms. Undo/Redo buttons, Ctrl+Z, Ctrl+Shift+Z / Ctrl+Y. View prefs (zoom, spin, bounce, camera) are not part of history. Session-only, 100 steps. Test hook ?test=undo.
<!-- SECTION:DESCRIPTION:END -->
