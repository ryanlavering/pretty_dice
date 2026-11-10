---
id: PD-62
title: Detect and call out leaning rolls
status: Needs Review
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T18:55:00Z'
labels:
  - feature
  - physics
dependencies: []
priority: medium
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Detect dice that settle leaning (not flat on a face) and call them out visually/in the result.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Leaning dice are flagged after settle
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 screenshot: d4 propped at an impossible angle on d8 edges (not flagged by assistSettle; lean test is flat<.985 && y<=TABLE_Y+1.35). Include 'resting on another die' cases and small-die height thresholds.

Implemented: tiltInfo now reports lift (centre height above lying-on-mat height). Dice with lift>.1 count as propped/piled and are rerolled in finishRoll (retries up to 12, 20 s), and assistSettle hops them off neighbours (also after 8 s even if jittering). Relaxed lean tolerance now .95 after 3.5 s (was .8 after 6 s) and never applies to propped dice. Headless: 10-12 dice rolls end with 0 propped dice in ~90% of runs; rare leftovers on 10d4. Test hook: ?test=roll&n=<notation>. Visible call-out/tap-nudge still PD-63.

2026-11-10: tried removing hop + re-rolling neighbours with leaning dice; owner saw more hopping spreading to other dice, reverted to the 97b2518 behaviour (lift detection + retry re-roll + assistSettle hop). Owner still prefers no self-powered hopping; alternative is flag-and-tap-to-reroll (PD-63) or re-roll only the leaning die.

2026-11-10 (v3, owner-directed): no hopping and no auto re-roll. Dice settle on their own; leaning/propped dice (lift>.1, flat<.95, or stacked) get a pulsing orange ring on the mat, the result panel shows '⚠ n dice are leaning' and a 'Re-roll leaning' button. The button makes only the leaning dice vanish and drop in again from above (others stay put); repeat until none lean. assistSettle now only tracks stillness; restCheck gives up waiting after 12 s. Headless (10d4, 3d4+8d8, 12d6): leans flagged in ~70% of big rolls, cleared in 1-6 re-rolls. Test hook: ?test=roll&n=<notation>[&norel=1]. Per-die tap and Zen mode remain PD-63.

2026-11-10: lean rings lie on the mat under all dice (depth-tested). Leaning dice with no other die in reach (bounding-sphere test) are woken with a tiny spin so gravity finishes the job (up to 5 tries); sleep thresholds tightened (speed .1, time 1 s) to stop dice falling asleep balanced on an edge.
<!-- SECTION:NOTES:END -->
