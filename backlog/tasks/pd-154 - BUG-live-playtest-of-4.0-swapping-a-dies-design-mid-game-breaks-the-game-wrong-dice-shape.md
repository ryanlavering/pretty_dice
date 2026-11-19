---
id: PD-154
title: >-
  BUG (live playtest of 4.0): swapping a die's design mid-game breaks the game;
  wrong dice shape
status: To Do
assignee: []
created_date: '2026-11-19T02:39:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 350000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner live playtest, 2026-11-18: swapping dice designs in the middle of a game 'broke everything'; the dice came back with the wrong shape (a d6 game should only ever have d6s). Suspect the long-press 'allowDesignSwap' design swap (commit 909a3d9) or Bag/design selection while a game is active replacing the die shape. Repro needed: which game (Yacht?), how the swap was done (long-press a die, Bag tab, Sets), phone or desktop. Expected: during a game the swap is look-only (same shape/count) or blocked, and never changes the game's dice. Add a spec. Hotfix candidate for 4.0.1 if owner agrees (4.0 is tagged v4.0 @94372f7).
<!-- SECTION:DESCRIPTION:END -->
