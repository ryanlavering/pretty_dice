---
id: PD-199
title: 'Flick: vertical flicks stay vertical; gravity-scaled and stronger lift'
status: Needs Review
assignee: []
created_date: '2026-11-21T00:06:00Z'
updated_date: '2026-11-21T08:14:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 392000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (RC artifact comment): flicking up keeps moving dice up and up the screen because 'up' carries an 'in' (depth) component. Keep the feel of throwing in any direction, but make an 'up' flick almost entirely vertical in die momentum: the 'in' component is inversely correlated with how vertical the flick was. Perfectly vertical flick = 100% vertical acceleration; a ~45 degree flick gets more 'in' and aims toward the back corner of the mat. Aiming dead at the back wall is not possible (accepted). Also: (1) Higher gravity should give increasingly larger flick height on top of the current equalization factor (lower hangtime wants a higher roll). (2) Global upward flick component across all gravity levels about 25% stronger. Side-to-side velocity is fine. Related: PD-169 (gravity compensation), cb9488a flick spec.
<!-- SECTION:DESCRIPTION:END -->

## Owner review (RC 083c5a0, 2026-11-20)
- New directionality rules (vertical up-flicks, depth from angle): feel much better for most rolls. KEEP.
- Higher initial velocity is hit or miss. Likes the average increase in intensity, but the launch/lift velocity no longer correlates with the flick: on mobile (and probably desktop mouse drag-release) it feels random. Want the roll's velocity to follow the gesture's properties (magnitude and duration => speed). Random velocity is fine for the R hot key / Roll button / shake, but organic gestures should use gesture speed.
