---
id: PD-200
title: Quick roll with empty box and Story Dice previewed rolls the preview dice
status: Review Complete
assignee: []
created_date: '2026-11-21T00:16:00Z'
updated_date: '2026-11-21T15:56:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 393000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the guide verification lane (v41-shots). With Story Dice selected but not started, pressing Roll with an EMPTY formula box does not release the game look: it throws the five preview picture dice (5d12, Story look still on) and logs a 5d12 entry. Contradicts the CHANGELOG/guide claim and PD-191/PD-192 (quick roll rolls your own dice and releases the preview; selection kept; reopening Games previews again). Works only when a formula is typed (e.g. 2d6). tests/story-look-lifetime.spec.mjs types 2d6 first, so the empty-box case is untested. Fix the app and extend the spec with the empty-box case; then remove the 'known issue' sentences the lane added to docs/guide/10-games.md and CHANGELOG.md.
<!-- SECTION:DESCRIPTION:END -->
