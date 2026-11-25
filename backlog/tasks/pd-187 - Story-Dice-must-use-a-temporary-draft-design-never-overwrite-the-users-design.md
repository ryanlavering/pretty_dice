---
id: PD-187
title: >-
  Story Dice must use a temporary draft design, never overwrite the user's
  design
status: Done
assignee: []
created_date: '2026-11-20T07:47:00Z'
updated_date: '2026-11-22T22:14:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 380000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
REWORK (owner on Dev artifact v13, 2026-11-20): (1) after a Story Dice round, going back to my original design selection shows it OVERWRITTEN (the game's plain look is saved into it) instead of reverted: the old behaviour is still there in the artifact. (2) Changing designs mid-game seems to reject the change outright (the PD-187 bag freeze or the 'game fixes the dice' decline blocks even a look-only pick that PD-158 allowed). Reproduce through the real UI in the single-file artifact build (python3 scripts/build-static.py --artifact) with a real saved bag, not only the unit spec; the 8 existing draft tests passed but did not catch this.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closed 2026-11-22 (owner): covered by 4.2 S4 game-look draft (0cbdb91, 77cdd4e); PD-190 ok.
<!-- SECTION:NOTES:END -->
