---
id: PD-62
title: Detect and call out leaning rolls
status: Needs Review
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T17:11:00Z'
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
<!-- SECTION:NOTES:END -->
