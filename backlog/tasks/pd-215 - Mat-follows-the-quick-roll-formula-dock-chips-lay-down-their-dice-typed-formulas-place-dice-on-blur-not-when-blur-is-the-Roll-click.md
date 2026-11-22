---
id: PD-215
title: >-
  Mat follows the quick-roll formula: dock chips lay down their dice; typed
  formulas place dice on blur (not when blur is the Roll click)
status: To Do
assignee: []
created_date: '2026-11-22T06:56:00Z'
labels:
  - v4.2
  - feature
dependencies: []
ordinal: 408000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner review (Dev artifact, 2026-11-21): 'Clicking a set immediately places its dice. Clicking e.g. d20 chip only sets formula, it doesn't lay down dice. I think I would prefer the dice on the mat to update to match the formula. If a formula is manually entered, we should apply the dice to the mat when the control loses focus, unless the user is clicking roll (there's no reason to place then immediately disappear to drop in the roll).' Behaviour: dock chip tap (dockLoad, tap replaces the box with one die; double-click/long-press adds a die) sets the formula AND lays down the matching dice like a set pick does; typed formula places the dice on blur unless the blur is caused by pressing Roll (button, Enter, R); an unparsable formula leaves the mat alone and keeps the existing error. Interactions to keep: lobby hold rules (a typed formula or set pick releases the lobby hold, PD-192/205), formulaSync, per-die @design, r reroll terms, history (PD-198 Up/Down fills the box without rolling: does it place? decide), games running (no mat changes).
<!-- SECTION:DESCRIPTION:END -->
