---
id: PD-93
title: Draw the roll tray, with options for shape, size and material
status: To Do
assignee: []
created_date: '2026-11-10T22:44:00Z'
labels:
  - feature
  - surface
  - visual
dependencies: []
priority: low
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea 2026-11-10: draw an actual tray (rim/walls) around the roll area instead of the invisible bounds, with tray options: shape (rectangle, round, hex...), size, and material (felt, leather, wood, ...). Today the tray is sized automatically from the dice (halfX/halfZ in startRoll) and the walls are invisible planes. Overlaps PD-77 (rolling tray visual), PD-69 (custom roll surface, colour and texture), PD-76 (dice cup) and PD-78 (virtual bounds); consider merging when scheduled. Tray size should keep following the dice count by default with a user override.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Visible tray walls match the physics bounds
- [ ] #2 Shape, size and material selectable and saved in the design
<!-- AC:END -->
