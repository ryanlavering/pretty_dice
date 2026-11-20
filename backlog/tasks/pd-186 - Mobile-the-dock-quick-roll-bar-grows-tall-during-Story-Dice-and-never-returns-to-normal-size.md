---
id: PD-186
title: >-
  Mobile: the dock (quick roll bar) grows tall during Story Dice and never
  returns to normal size
status: Needs Review
assignee: []
created_date: '2026-11-20T07:45:00Z'
updated_date: '2026-11-20T08:23:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 379000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner screenshots (2026-11-20, iPhone): in Story Dice the bottom dock/shelf is taller than normal (status text plus a Roll button stacked); after ending the game / returning to the normal roll bar it stays tall (formula field + Roll on one row, die chips on a second row, 'Ready' chip in the layout) and never retracts to the original one-row size. Decide: if the enlargement is unintentional keep the dock small in Story Dice; if intended (more room for the status/judge controls) it must retract properly when the game ends or the mode changes. Probably related to the failing tests/games-phone.spec.mjs ('dice stay uncovered', expected 0 got 1) found by CHECKPOINT 41-3. Check PD-176 (dock hint/judge buttons) and PD-184 (sentence on the mat) changes and any dock height / --dockh variable that is set but not reset.
<!-- SECTION:DESCRIPTION:END -->
