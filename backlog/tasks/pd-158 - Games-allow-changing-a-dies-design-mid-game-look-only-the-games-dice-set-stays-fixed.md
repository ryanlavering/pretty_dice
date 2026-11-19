---
id: PD-158
title: >-
  Games: allow changing a die's design mid-game (look only); the game's dice set
  stays fixed
status: Needs Review
assignee: []
created_date: '2026-11-19T05:22:00Z'
updated_date: '2026-11-19T09:49:00Z'
labels:
  - v4.1
milestone: m-2
dependencies: []
priority: medium
ordinal: 354000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner follow-up to PD-154, 2026-11-18: in 4.0.1 a running game refuses a Bag design or set pick that would change its dice (hotfix). For 4.1 the owner wants to be able to change the dice after starting a game: the DESIGN (look: colours, numbers, material) may change, but not the dice SET (shape and count the game needs). So a swap to another design of the same shape applies as a look change; a pick of a different shape or a set with different dice stays refused, with a clear message. Works from long-press on a die, the Bag tab and the design pane; applies per die or to all dice of that shape; persists with game resume/save. Specs for each route. Builds on the PD-154 guard (see tests/hotfix-401.spec.mjs); implement in src/ on v4.1.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
4.1 implementation: gameDiceFixed(fits) now refuses only picks that do not fit the game's dice. A Bag design pick whose shape matches the game's die (or a custom design with the same dice) loads as a look change (loadDesign restores the game's shape/notation via gameKeep; dice stay where they lie via pendingLay; holds kept). A set with the same dice applies; other sets and shapes stay refused with a message. Randomize keeps the game's dice. Long-press per-die swap unchanged (4.0.1). Persists: look is in state/bag saves, game resume unchanged. Not changed: Design-pane shape buttons and the dock formula box can still change the dice in a game (pre-existing, outside this card). Specs: tests/game-design-change.spec.mjs (8, desktop+phone). hotfix-401 still green; golden unchanged.
<!-- SECTION:NOTES:END -->
