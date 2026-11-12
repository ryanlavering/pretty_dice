---
id: PD-123
title: Render design pictures offscreen (own camera, scene and render target)
status: To Do
assignee: []
created_date: '2026-11-12T16:20:00Z'
labels:
  - feature
  - bag
  - performance
dependencies: []
priority: medium
ordinal: 134000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace captureLive (borrows the visible stage: loads the design into live state, resizes the main canvas, waits for the camera to settle, restores everything) with an offscreen render: a render target with its own camera, light rig and scene holding one d20 built from the design's look (reuse lookFromDesign / paintLook / makeAtlas and the parts cache from phase 3). No dependence on the stage camera, rolling or the top-down hold, so PD-110 class timing bugs cannot recur; no live design swap, hidden canvas, undo-history save/restore or forced d20 shape; pictures can fill in at any moment without disturbing the stage. Risks to check: clear-epoxy transmission inside a render target; matching the stage's lighting and environment; readback stall (same as toDataURL today). Keep the stand-in framing (die ~74% width, centred ~46% down) and the existing lazy one-per-slice scheduling. Profile before/after with scripts/profile.mjs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A 10-design bag fills its pictures without touching the stage (no canvas hide, no live design swap)
- [ ] #2 Pictures are identical in framing whatever the camera, roll or showcase state
- [ ] #3 Clear epoxy and all substrates render correctly in the offscreen target
- [ ] #4 Tests pass; profile shows no regression
<!-- AC:END -->
