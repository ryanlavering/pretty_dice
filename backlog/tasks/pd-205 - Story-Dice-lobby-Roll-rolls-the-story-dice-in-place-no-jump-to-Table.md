---
id: PD-205
title: 'Story Dice lobby: Roll rolls the story dice in place (no jump to Table)'
status: Needs Review
assignee: []
created_date: '2026-11-21T07:44:00Z'
updated_date: '2026-11-21T08:05:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 398000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner review of PD-191: in the Story Dice lobby (selected but not started, and after a game ends) the story dice preview is shown correctly, but pressing Roll kicks out to the Table tab and the underlying set, which is jarring (the screen jumps). Wanted: Roll in the lobby rolls the story dice right there on the Games tab. The preview is released (back to the player's own dice) only when the user moves away from Games (Table, Log, Design, Full view, close) or picks another game. Reverses the PD-200 behaviour (empty-box Roll released the look and went to Table). Typed formula in the dock still rolls that formula on the player's own dice (releases the look). Keep PD-191 lifetime rules otherwise.
<!-- SECTION:DESCRIPTION:END -->
