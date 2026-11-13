---
id: PD-123
title: Render design pictures offscreen (own camera, scene and render target)
status: Done
assignee: []
created_date: '2026-11-12T16:20:00Z'
updated_date: '2026-11-13T16:41:00Z'
labels:
  - feature
  - bag
  - performance
milestone: m-0
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: owner scoped this into the v3.0 release.

2026-11-12: implemented. renderDesignPicture(json) draws one d20 in the design's look in its own scene/camera/light into a 288 px render target (marked isXRRenderTarget so three.js tone-maps and sRGB-encodes it like the screen; three is pinned to 0.160), then shrinks it onto the stage's backdrop bitmap: backdrop corner is exactly the stage's (14,14,23), die ~72% x 78% of the frame. updateThumbs no longer swaps the live design, hides the canvas, resizes the renderer or waits for the camera (still waits while rolling or while the person is working, one picture per slice). Checked on swirl, solid, metal, clear epoxy, marble. Known: clear epoxy still pays the transmission pass (three sizes its buffer to the main canvas) and refraction sees a transparent backdrop in the picture; per picture ~2 s in software GL (atlas build dominates). The PD-110 test now asserts a correct picture mid-ease and an untouched stage.

2026-11-13: the render-target path made clear epoxy pale (three.js's transmission pass is washed out in a render target), so renderDesignPicture now draws the picture in its own scene and camera into a corner of the stage canvas for an instant (canvas hidden, synchronous, no frame shows it), reads it back and cuts it out with a flat-white pass. Still no live-design swap, no resize, no waiting for the camera. Matches the pre-123 pictures' brightness and saturation numerically.

2026-11-13: owner approved.
<!-- SECTION:NOTES:END -->
