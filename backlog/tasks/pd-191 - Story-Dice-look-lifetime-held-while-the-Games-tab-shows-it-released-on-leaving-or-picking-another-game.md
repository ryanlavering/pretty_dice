---
id: PD-191
title: >-
  Story Dice look lifetime: held while the Games tab shows it, released on
  leaving (or picking another game)
status: Needs Review
assignee: []
created_date: '2026-11-20T19:57:00Z'
updated_date: '2026-11-21T08:05:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 384000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner rule (2026-11-20), from the Story Dice playtest round 1 (table keeps white Story dice after End game; selecting Story Dice swaps the table before Start):
- After a game ends, if we are still on the Games tab with Story Dice selected, the Story Dice set is the active selection (it stays on the table, as today).
- When the user selects a different game, or leaves the Games tab while there is no active (running) game, we RELEASE the Story Dice set: the user's own design/look/dice come back exactly.
- If the page is reloaded and a paused game is detected (Resume available), treat it the same as 'after game ends': the active screen keeps the Story Dice present until the user moves away (leaves the Games tab / picks another game); a running game still keeps its dice regardless of tab.
Acceptance (tests): (a) End game while on Games tab: story dice stay; then Table/Log tab, Design room, Close, or choosing Yacht etc. releases and the user's design/dice/formula are back (no 'Modified', bag unchanged); (b) selected-not-started behaves the same; (c) reload with a paused game: boot shows the user's table (or the Games tab with story dice if that is where the app opens) consistently; opening Games shows story dice + Resume; leaving releases; Resume still works; (d) a RUNNING game keeps its dice when the user visits Table/Log/Design; (e) no 2D view jump, dock back to one row on release; (f) existing PD-187 tests still pass. Related: PD-187, PD-190 (full draft later).
<!-- SECTION:DESCRIPTION:END -->
