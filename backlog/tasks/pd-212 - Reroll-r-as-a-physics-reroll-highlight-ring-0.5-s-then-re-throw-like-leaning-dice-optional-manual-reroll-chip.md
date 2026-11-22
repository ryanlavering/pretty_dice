---
id: PD-212
title: >-
  Reroll (r) as a physics reroll: highlight ring 0.5 s, then re-throw like
  leaning dice; optional manual reroll chip
status: Needs Review
assignee: []
created_date: '2026-11-22T05:53:00Z'
updated_date: '2026-11-22T09:08:00Z'
labels:
  - v4.2
  - feature
dependencies: []
ordinal: 405000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner review of the Dev artifact (2026-11-21): 'I don't like the auto-reroll now. I'd prefer a true physics reroll. Before rerolling, the dice needing rerolls should get a highlight circle for a moment (0.5s), then it's rerolled like leaning dice would. An option in the table settings could allow manual rerolls (in this case, we use the same circle-color chip in the upper right, like leaning).' Replaces the re-evaluate decision of PD-142.42.1 (4fb69fc): the r modifier keeps its syntax, order of evaluation (before keep/drop), '1→14' breakdown and NATURAL-from-final-die rules, but the reroll becomes a real re-throw of just the matching dice. Manual mode: Table setting, ring stays on the dice, a chip in the upper right stacked with the leaning chip, pressing it re-throws.
<!-- SECTION:DESCRIPTION:END -->
