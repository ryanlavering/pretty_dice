---
id: PD-169
title: 'Play option: gravity slider (0.25x-2x realistic, log scale)'
status: To Do
assignee: []
created_date: '2026-11-19T20:21:00Z'
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
