---
id: PD-169
title: 'Play option: gravity slider (0.25x-2x realistic, log scale)'
status: Review Complete
assignee: []
created_date: '2026-11-19T20:21:00Z'
updated_date: '2026-11-20T07:18:00Z'
labels:
  - v4.1
dependencies: []
priority: low
ordinal: 362000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
REWORK (owner comments 2026-11-20 on Dev artifact): (1) when gravity is above default the flick velocity/force/acceleration must be compensated so a flick still throws the dice (today they just twitch on the table); compensate sensibly across the whole slider range (also low gravity: dice should not fly off). (2) The scale looks wrong: owner doubts today's default is really only 0.0436x (2.8% was quoted) of realistic gravity. Re-derive it end to end: check the physics step / time scale / any speed multiplier, damping, the real unit of the table in the sim, and MEASURE the actual fall time of a die dropped from a known height against t=sqrt(2h/g) for a 20 mm d20 (1 m = 79.47 u). The slider's 1x must mean true realistic as seen on screen; report the true default factor.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner measurement 2026-11-19: a standard d20 and d12 are about 20 mm face to face; d6 varies the most (16 mm common, up to ~19+). Use ~20 mm face-to-face on d20/d12 as the calibration for world units per metre when computing today's gravity factor (-34 u/s^2 vs 9.81 m/s^2). Future idea (not this card): a per-set d6 scale slider.

CALIBRATION (v41-grav, 2026-11-19): every die is normalised to circumradius 1 world unit (main.js buildDice). d20 and d12 inradius/circumradius = 0.79465, so face to face = 2 x 0.79465 = 1.5893 u = 20 mm (owner) -> 79.47 u per metre. Realistic 9.81 m/s2 = 9.81 x 79.47 = 779.6 u/s2. Today's -34 u/s2 = 34/779.6 = 0.0436 x realistic (N = 0.0436, about 1/23). That is BELOW the owner's 0.25x..2x range, so the slider log range was widened symmetrically by 16x each way: 1/64x .. 32x (owner's .25x..2x sits inside), default = 0.0436x (exact -34). Constants GRAV_LO/GRAV_HI in src/main.js if the owner wants a different range.
<!-- SECTION:NOTES:END -->
