---
id: PD-190
title: Game look as a first-class dotted draft design in the Bag (full model)
status: To Do
assignee: []
created_date: '2026-11-20T17:58:00Z'
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
