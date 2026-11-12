---
id: PD-91
title: 'Nat20 effect: Slight pre-dim before explosion'
status: Review Complete
assignee: []
created_date: '2026-11-10T19:23:00Z'
updated_date: '2026-11-12T00:20:00Z'
labels: []
dependencies: []
priority: low
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
To make the d20 Nat20 roll effect a little more prominent, the global lights should gradient dim slightly just before the starburst, upon which they spike slightly bright and quickly return to normal. The idea is that it's like the d20 briefly sucks in the light/magic of its surroundings before bursting out.

The dimming effect should be subtle, so as not be confused with a nat1.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: BURST_LEAD .55 s. Key light eases down to 86 % (nat 1 is 30 %), flashes +30 % at the starburst, returns in about half a second. Only when 20s >= 1s. Test in physics.spec.

2026-11-11 owner feedback: the die's glow now starts rising at the same moment the lights start to dim (peaks at the burst, then settles to the steady glow).
<!-- SECTION:NOTES:END -->
