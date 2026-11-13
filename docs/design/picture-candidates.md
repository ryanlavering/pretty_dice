# Design-picture candidates (PD-131)

The owner's short-listed poses and lights for the offscreen design pictures, kept so the choice can be revisited.
View them side by side on the four test materials (clear red epoxy with white paint, solid metal, solid plastic, metallic plastic), at tile and shelf size:

    index.html?lab=thumbs&cmp=1        (or open the lab and press "Compare candidates")

The lab itself (`?lab=thumbs`) is the live editor: drag to turn the die, sliders for camera, room turn and the three lights, and a "Settings to copy back" read-out.
The candidate list is `CMP` in `index.html` (search "head-to-head").

| Id | Orientation (quaternion x,y,z,w) | Camera dist | Room turn (rad) | Key | Sheen | Back |
|----|----------------------------------|-------------|-----------------|-----|-------|------|
| A | .252, .627, .025, .737 | 5.2 | 0, 3.142, 0 | 1.1 at (-.2,1.9,3.2) | 1.1 at (4,.7,1.4) | 2.4 at (-1.2,2,-4) |
| B | .463, .327, -.644, -.514 | 5.2 | 0, 3.142, 0 | as A | as A | as A |
| C | .208, -.882, .179, -.384 | 5.2 | .55, 3.15, 0 | 1.3 at (-.1,1.9,3.2) | 1.25 at (4,.7,1.4) | as A |
| D | .167, -.888, .173, -.391 | 5.2 | .55, 3.15, 0 | as C | as C | as A |
| E | .624, -.604, -.223, .443 | 4.9 | .2, 2.9, -.05 | 1.1 at (-.2,1.9,3.2) | 1.1 at (4,.7,1.4) | as A |
| F | -.219, .718, -.598, .28 | 4.9 | 0, 3.142, 0 | 1.1 at (-.2,1.9,3.2) | 1.1 at (4,.7,1.4) | as A |
| G | .217, .233, .116, .941 | 4.9 | 0, 3.142, 0 | 1.1 at (-.2,1.9,3.2) | 1.1 at (4,.7,1.4) | as A |
| E, 20 outward (unrolled) | .601, -.619, .184, -.47 | 4.9 | .2, 2.9, -.05 | as E | as E | as A |
| E, 20 rolled -35 / **-50 (in the app)** / -65 deg | .387,-.771,.317,-.393 / .283,-.815,.366,-.348 / .174,-.845,.408,-.298 | 4.9 | as E | as E | as E | as A |

All use fov 32, camera height -0.1, exposure 1.5. "E, 20 outward" is E with the die turned by an icosahedral symmetry so the face labelled 20 sits where E's front face (the 7) was; the rolled rows then spin it about the view axis so the 20 reads upright, at the cost of moving the highlights.

## Current default (2026-11-13)

E-50 turned out too glary in practice, so the app went back to the pre-PD-123 look: the stage pose and lights (key 1.6 at (3,6,4), unturned studio room, no sheen or back light), camera distance 5.4 (the old stage framing was 5.4 to 6.2 depending on window shape), fov 32, exposure 1.5.
The die is turned by an icosahedral symmetry ("h3 k1" in the pose sheet), quaternion -.0067, .8228, -.3034, .4805, so the 20 sits on the left front face, upright. The old pose itself is (.0054, .0247, .0022, .9997); the Compare view lists it as "Pre-123 stage look".
Other symmetry turns tried: h2 k1 (18 and 20 side by side) is the best alternative.

Owner then asked for the lean of the old pictures: the default is the pose above rolled 8 degrees left (about the view axis), quaternion [-0.0641, 0.8203, -0.2691, 0.5005].
The pose is applied in `PIC_Q`; the picture is drawn in a corner of the stage canvas (not a render target, which washes out clear epoxy), camera distance 5.4, fov 29.7.
