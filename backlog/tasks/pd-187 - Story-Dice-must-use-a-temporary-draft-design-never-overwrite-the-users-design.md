---
id: PD-187
title: >-
  Story Dice must use a temporary draft design, never overwrite the user's
  design
status: Needs Review
assignee: []
created_date: '2026-11-20T07:47:00Z'
updated_date: '2026-11-20T08:15:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 380000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner bug (2026-11-20): playing a round of Story Dice and then ending the game overwrites the user's selected design (revertable by hand). Required behaviour: starting Story Dice switches to a TEMPORARY DRAFT design (today's white, clear-visibility glyph dice) that is discarded when the game ends, restoring exactly what the user had selected. If the user changes designs manually mid-game, only the temporary draft is removed: the user's own design is never overwritten or deleted, and ending the game restores the design the user chose (a mid-game pick becomes their design if they made it deliberately). Applies to any game that applies its own dice look; check others (Yacht, Farkle, Pig, Liar's Dice, Craps) use the same draft mechanism or at least do not clobber. Supersedes PD-183 (lookSnap not updated by a mid-game design swap). Look at lookSnap and the game start/end paths in src/main.js, and PD-158 (design swap during a game).
<!-- SECTION:DESCRIPTION:END -->
