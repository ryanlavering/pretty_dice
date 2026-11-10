---
id: PD-59
title: Dice snag on each other instead of sliding apart
status: Needs Review
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T16:35:00Z'
labels:
  - bug
  - physics
dependencies: []
priority: high
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dice get hung up on each other too often; they should slide off and push outward. Lower default dice-dice and dice-mat friction. See also pd-47.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Piles of 5-10 dice spread out and settle without sticking
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Defaults: dice-dice friction .1, dice-mat .2 (was .3 for everything). Needs hands-on feel check with 5-10 dice; tune defaults if still sticky.
<!-- SECTION:NOTES:END -->
