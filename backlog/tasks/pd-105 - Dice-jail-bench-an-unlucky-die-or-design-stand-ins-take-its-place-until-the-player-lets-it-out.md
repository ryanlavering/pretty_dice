---
id: PD-105
title: >-
  Dice jail: bench an unlucky die or design; stand-ins take its place until the
  player lets it out
status: To Do
assignee: []
created_date: '2026-11-11T19:50:00Z'
updated_date: '2026-11-11T19:57:00Z'
labels:
  - dice-bag
  - feature
dependencies:
  - PD-102
priority: medium
ordinal: 111000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-11 (part of the dice bag, PD-102). The player can send a die to jail when it seems cursed or unlucky after bad rolls: either one die (design + shape) or a whole design (every shape). Sentence: a few rolls, a date, or forever. Only the player releases it, at their mercy; a served sentence only marks it eligible for parole. While jailed, any set that would roll it gets a stand-in of the same shape: 50/50 another non-jailed design from the bag (if any) or a brand-new random design. The stand-in is shown with a badge on the mat, noted in the roll log, and can be adopted into the bag. Design: docs/design/dice-bag-design.md#dice-jail. Decided 2026-11-11: time served counts only rolls the jailed die would have been in. The stand-in is picked when the set is chosen and kept while that set stays active (re-rolls included); after another set is rolled, coming back picks a new stand-in. The roll log remembers stand-ins, including a random stand-in's full design settings, so they can be recovered and adopted later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Send a die (design+shape) or a whole design to jail with a sentence (N rolls, a date, forever)
- [ ] #2 Sets that include a jailed die roll a same-shape stand-in: 50/50 another bag design or a new random design
- [ ] #3 Stand-in is marked on the mat and in the roll log, and can be adopted into the bag
- [ ] #4 Only the player releases a die; a served sentence marks it eligible for parole
- [ ] #5 Jail survives reloads and bag export/import
- [ ] #6 Roll log stores each stand-in (who it replaced; full design JSON for random ones) and a past stand-in can be adopted from the log
<!-- AC:END -->
