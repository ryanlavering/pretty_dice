---
id: PD-131
title: 'Design pictures: better angle and light (epoxy, metal)'
status: Review Complete
assignee: []
created_date: '2026-11-13T00:58:00Z'
updated_date: '2026-11-13T08:09:00Z'
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

2026-11-12 owner candidates from the thumbnail lab (same camera distance 5.2, y -0.1, fov 32, room turn [0, 3.142, 0], exposure 1.5, key (-0.2,1.9,3.2) 1.1, sheen on (4,0.7,1.4) 1.1, back on (-1.2,2,-4) 2.4): 
- Candidate A (now in the app as PIC_Q): quaternion [0.252, 0.627, 0.025, 0.737], Euler deg XYZ [75.499, 69.465, -52.556].
- Candidate B: quaternion [0.463, 0.327, -0.644, -0.514], Euler deg XYZ [-8.748, -68.882, 96.804].
Owner is looking for more, then wants a head-to-head comparison.

- Candidate C: quaternion [0.208, -0.882, 0.179, -0.384], Euler deg XYZ [166.269, 48.737, 159.686]; different lighting: room turn [0.55, 3.15, 0], key (-0.1,1.9,3.2) 1.3, sheen (4,0.7,1.4) 1.25 (back unchanged 2.4); camera 5.2 / -0.1 / 32.

- Candidate D: quaternion [0.167, -0.888, 0.173, -0.391] (euler deg xyz 164.483, 48.846, 165.821); camera 5.2/-0.1/fov 32; room turn [0.55, 3.15, 0]; exposure 1.5; key (-0.1,1.9,3.2) 1.3; sheen on (4,0.7,1.4) 1.25; back on (-1.2,2,-4) 2.4. Same lighting as C, pose a few degrees from C.

- Candidate E: quaternion [0.624, -0.604, -0.223, 0.443] (euler deg xyz 150.867, -54.453, 72.909); camera 4.9/-0.1/32; room turn [0.2, 2.9, -0.05]; exposure 1.5; key (-0.2,1.9,3.2) 1.1; sheen (4,0.7,1.4) 1.1; back (-1.2,2,-4) 2.4.

- Candidate F: quaternion [-0.219, 0.718, -0.598, 0.28]; camera 4.9/-0.1/32; room turn [0, 3.142, 0]; key/sheen/back as A. All candidates (A-F, E with 20 outward = in the app) are in docs/design/picture-candidates.md; view with ?lab=thumbs&cmp=1.

Applied candidate E with the 20 face toward the camera (pose .601,-.619,.184,-.47; room .2,2.9,-.05; camera 4.9). Alternatives rolled -35/-50/-65 deg are in the lab. Quick tier 56 passed.

Owner: E unrolled has too much sheen in practice; E rolled -50 deg is the new default (quaternion .283,-.815,.366,-.348).

- Candidate G: quaternion [0.217, 0.233, 0.116, 0.941] (euler deg 24, 29.245, 7.754); camera 4.9/-0.1/32; room turn [0, 3.142, 0]; key/sheen/back as A. Not applied; in the Compare view and docs/design/picture-candidates.md.

Owner chose 'h3 k1': the pre-PD-123 look (stage pose/lights, camera 5.4) with the die turned by an icosahedral symmetry so the 20 is upright on the left front face. quaternion -.0067,.8228,-.3034,.4805. Replaces E-50 (too glary).

Pictures: the render-target path washed out transmission (epoxy); now drawn in a corner of the stage canvas (hidden for that instant), matching the pre-123 stats. Pose h3 k1 rolled 8 deg left; camera 5.4, fov 29.7. Thumbnail cache key bumped to v2.

Owner approved; may revisit the look later (candidates in docs/design/picture-candidates.md and the saved lab).
<!-- SECTION:NOTES:END -->
