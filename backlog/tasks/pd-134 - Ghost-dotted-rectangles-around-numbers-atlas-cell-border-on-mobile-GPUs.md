---
id: PD-134
title: Ghost dotted rectangles around numbers (atlas cell border) on mobile GPUs
status: Done
assignee: []
created_date: '2026-11-13T03:38:00Z'
updated_date: '2026-11-13T04:06:00Z'
labels:
  - bug
  - rendering
milestone: m-0
dependencies: []
priority: medium
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-12 (iPhone screenshot, solid metal d20): dotted/ghosted rectangles around each number, mostly on metal, sometimes elsewhere. Root cause: the fragment shader sampled the number atlas (bump and paint mask) with texture2D inside a ternary on inCell(), i.e. non-uniform control flow, so implicit derivatives are undefined at the cell border on GPUs that shade 2x2 quads; border pixels pick garbage mip/anisotropy and ghost neighbour-cell glyphs. Fix: sample unconditionally with the UV clamped into the cell, then select (cellTex in makeMaterial). Not reproducible in headless SwiftShader, so confirmation needs the owner's phone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No dotted rectangle or ghost glyphs around numbers on the owner's iPhone (metal d20 and other substrates)
- [x] #2 Regression spec tests/shader.spec.mjs: atlas texture2D calls are not inside a conditional
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix and spec done; quick tier 56 passed. Full npm test not yet run; owner to confirm on device before Done.

Owner confirmed fixed on iPhone 2026-11-12. Full npm test not run; quick tier passed.
<!-- SECTION:NOTES:END -->
