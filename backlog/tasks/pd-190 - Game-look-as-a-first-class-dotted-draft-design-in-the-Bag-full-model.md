---
id: PD-190
title: Game look as a dotted draft design in the Bag (editable, Save as design + set)
status: Needs Review
assignee: []
created_date: '2026-11-20T17:58:00Z'
updated_date: '2026-11-22T04:25:00Z'
labels:
  - v4.2
dependencies: []
priority: high
ordinal: 383000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to PD-187 (4.1 ships a small mitigation). Design memo: docs/design/game-draft-design-memo.md (copy of the Opus memo). Owner decisions 2026-11-20:
- Scope: mitigation in 4.1, full model after.
- D1: at game end return to the player's own design unless they deliberately picked something else mid-game (today's rule).
- D2: the draft exists whenever the game's look is on screen: 'if it's on screen, it needs a draft or saved design behind it' (create at game selection / setup preview, not only at Start).
- D3: saving a game look mid-game saves its DICE SET too (the dealt shape/notation/faces), not the player's pre-game dice shape (differs from the memo's suggestion).
- Owner's model: a true dotted-line draft design, a separate entity in the Bag, saveable and editable like any design, automatically safe from overwriting the original.
Memo plan: separate bag.gdraft slot, bag.active.draft gains 'game'; ~70-100 lines main.js/bagmodel.js, one new spec, partial rewrite of story-draft-design and story-draft-artifact. Risks: reload/Resume agreement, setup-preview speed (activate()/idleThumbs), 25+ single-draft-slot sites. Related: PD-188 (per-game dice look option, Yacht pips).
<!-- SECTION:DESCRIPTION:END -->

## 4.2 plan and design memo (2026-11-21)
Model and slicing: docs/design/designs-sets-model.md (branch v4.2, 2a7b808). Slices: S1 (PD-202 part 1) landed 2a45428 on v4.2; S2 set->design link (PD-202 part 2); S3 lobby dice for every game (PD-206); S4 game draft (PD-190, needs S3); S5 tweak looks / Yacht 'Use d6 pips' (PD-188, needs S4); S6 docs and release pass.
Owner answers: Q1 yes (a set that names a design applies that look every time, per-set 'Keep my look' switch); Q2 yes (Save as design on a game look makes the design AND a set with the game's dice that names it); Q4 yes (re-record ONLY the Games-screen dice label golden value in S3). Q3 (Use d6 pips on every d6 game, on by default only for Yacht) and Q5 (pips follow a mid-game pick) default to the memo recommendations unless the owner says otherwise.
