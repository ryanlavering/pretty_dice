---
id: PD-177
title: >-
  Factoring pass S11: physics roll, effects, inclusion, thumb lab need a
  shared-state object first
status: To Do
assignee: []
created_date: '2026-11-20T03:09:00Z'
labels:
  - v4.3
dependencies: []
priority: medium
ordinal: 370000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Leftover from PD-168 (S10). Only sound was extracted cleanly. Physics roll depends on ~45 outer names (reassigned world, placed, rolling, topHold) and ~35 of its names are used by holds, games and the room; nat20/nat1 effects share droppedDice and the lean UI; inclusion depends on mesh, M, dice, bag and ~40 names; thumbnail lab's labOn is read by the main loop. Needs a design step: a single shared-state object (or getters) for roll/dice state, then mechanical moves, validated by the behavioural golden. Do before the next big feature round.
<!-- SECTION:DESCRIPTION:END -->
