---
id: PD-206
title: >-
  Every game shows its own dice in the lobby (held like Story Dice; Roll rolls
  them in place)
status: In Progress
assignee: []
created_date: '2026-11-21T15:56:00Z'
updated_date: '2026-11-21T18:13:00Z'
labels:
  - v4.2
dependencies: []
priority: medium
ordinal: 399000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (lobby review, 2026-11-21): other games have specific dice sets (Yacht 5d6, Ten Thousand, Pig, Liar's Dice...). Like Story Dice, the lobby should show that game's set when the game is selected or its options are adjusted (players, dice count where applicable), released again when the user leaves Games or picks another game; Roll in the lobby rolls those dice in place (same rules as PD-205/PD-191). Story Dice lobby is done in 4.1 (preview updates immediately as dice count and faces change: verified 5d12 -> 7d12 -> 7d20 -> 7d6). 4.2 unless other 4.1 changes need it.
<!-- SECTION:DESCRIPTION:END -->

## 4.2 plan and design memo (2026-11-21)
Model and slicing: docs/design/designs-sets-model.md (branch v4.2, 2a7b808). Slices: S1 (PD-202 part 1) landed 2a45428 on v4.2; S2 set->design link (PD-202 part 2); S3 lobby dice for every game (PD-206); S4 game draft (PD-190, needs S3); S5 tweak looks / Yacht 'Use d6 pips' (PD-188, needs S4); S6 docs and release pass.
Owner answers: Q1 yes (a set that names a design applies that look every time, per-set 'Keep my look' switch); Q2 yes (Save as design on a game look makes the design AND a set with the game's dice that names it); Q4 yes (re-record ONLY the Games-screen dice label golden value in S3). Q3 (Use d6 pips on every d6 game, on by default only for Yacht) and Q5 (pips follow a mid-game pick) default to the memo recommendations unless the owner says otherwise.
