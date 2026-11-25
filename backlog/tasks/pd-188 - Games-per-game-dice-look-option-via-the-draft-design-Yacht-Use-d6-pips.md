---
id: PD-188
title: 'Games: per-game dice look option via the draft design (Yacht: ''Use d6 pips'')'
status: Done
assignee: []
created_date: '2026-11-20T07:51:00Z'
updated_date: '2026-11-25T06:19:00Z'
labels:
  - v4.2
dependencies: []
priority: medium
ordinal: 381000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (2026-11-20), builds on PD-187 (temporary draft design). Yacht prefers d6 with pips. Use the same draft mechanism (or an offshoot) and add a game option, e.g. 'Use d6 pips' (default on for Yacht), that overrides the default dice properties from the selected design for the length of the game (draft only, user's design never overwritten, discarded at game end). Generalise: each game can declare its preferred dice look (Yacht: pipped d6; Story Dice: white clear glyph dice) with an option to use the player's own selected design instead. Needs: where pips come from in the design model (numbers/pips setting), what 'override' touches (face labels only vs whole look), and the UI placement in the game's options. Land after PD-187.
<!-- SECTION:DESCRIPTION:END -->

## 4.2 plan and design memo (2026-11-21)
Model and slicing: docs/design/designs-sets-model.md (branch v4.2, 2a7b808). Slices: S1 (PD-202 part 1) landed 2a45428 on v4.2; S2 set->design link (PD-202 part 2); S3 lobby dice for every game (PD-206); S4 game draft (PD-190, needs S3); S5 tweak looks / Yacht 'Use d6 pips' (PD-188, needs S4); S6 docs and release pass.
Owner answers: Q1 yes (a set that names a design applies that look every time, per-set 'Keep my look' switch); Q2 yes (Save as design on a game look makes the design AND a set with the game's dice that names it); Q4 yes (re-record ONLY the Games-screen dice label golden value in S3). Q3 (Use d6 pips on every d6 game, on by default only for Yacht) and Q5 (pips follow a mid-game pick) default to the memo recommendations unless the owner says otherwise.
