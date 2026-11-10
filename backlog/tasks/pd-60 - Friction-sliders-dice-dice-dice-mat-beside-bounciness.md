---
id: PD-60
title: Friction sliders (dice-dice, dice-mat) beside bounciness
status: Done
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T17:05:00Z'
labels:
  - feature
  - physics
  - ui
dependencies: []
priority: high
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add one friction slider for dice-on-dice and one for dice-on-mat, next to the bounciness control. Persist in settings and design JSON as appropriate. Ships with the snag fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Both sliders affect roll behavior live
- [ ] #2 Values persist
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Sliders 'Dice friction' and 'Mat friction' (0-1) under Bounciness; persist via SLIDERS/state; applied live to the running roll.
<!-- SECTION:NOTES:END -->
