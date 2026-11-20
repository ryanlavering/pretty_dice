---
id: PD-169
title: 'Play option: gravity slider (0.25x-2x realistic, log scale)'
status: Needs Review
assignee: []
created_date: '2026-11-19T20:21:00Z'
updated_date: '2026-11-20T02:00:00Z'
labels:
  - v4.1
dependencies: []
priority: low
ordinal: 362000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-19: add a Gravity control to the play options, 0.25x to 2x of realistic, logarithmic slider, default = today's 'sluggish realistic' feel. Today gravity is a fixed CANNON.Vec3(0,-34,0) (index.html:2316 in v4; the same line in src/main.js on v4.1) in world units; first task is to work out the real factor: world units per metre (die size: a d6 is ~16 mm edge, check what that is in world units), so -34 u/s^2 is N x 9.81 m/s^2 realistic. Report that factor on the card. Slider shows the multiple of realistic with default at today's value (so e.g. default is N x on the slider; range 0.25x..2x). Persist with the other play options; apply live (world.gravity) and to the next roll; check sleep thresholds and settle timing still work at 2x and 0.25x (hang time changes the settle delay), bots and game flows unaffected.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner measurement 2026-11-19: a standard d20 and d12 are about 20 mm face to face; d6 varies the most (16 mm common, up to ~19+). Use ~20 mm face-to-face on d20/d12 as the calibration for world units per metre when computing today's gravity factor (-34 u/s^2 vs 9.81 m/s^2). Future idea (not this card): a per-set d6 scale slider.

CALIBRATION (v41-grav, 2026-11-19): every die is normalised to circumradius 1 world unit (main.js buildDice). d20 and d12 inradius/circumradius = 0.79465, so face to face = 2 x 0.79465 = 1.5893 u = 20 mm (owner) -> 79.47 u per metre. Realistic 9.81 m/s2 = 9.81 x 79.47 = 779.6 u/s2. Today's -34 u/s2 = 34/779.6 = 0.0436 x realistic (N = 0.0436, about 1/23). That is BELOW the owner's 0.25x..2x range, so the slider log range was widened symmetrically by 16x each way: 1/64x .. 32x (owner's .25x..2x sits inside), default = 0.0436x (exact -34). Constants GRAV_LO/GRAV_HI in src/main.js if the owner wants a different range.
<!-- SECTION:NOTES:END -->
