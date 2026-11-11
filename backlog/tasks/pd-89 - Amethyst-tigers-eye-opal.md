---
id: PD-89
title: Amethyst, tiger's eye, opal
status: Needs Review
assignee: []
created_date: '2026-11-10T17:32:00Z'
updated_date: '2026-11-11T23:41:00Z'
labels: []
dependencies: []
priority: low
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Additional stone types.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: Amethyst (purple zoning, quartz veils), Tiger's eye (fibres and chatoyant bands), Opal (milky or black body with play-of-colour patches) added as stones; shader ids 8-10, turquoise stays the fallback. Checked visually (swiftshader); retune with real GPU if needed.

2026-11-11 owner feedback: opal great; tiger's eye reworked (brushed-metal sheen: metalness .55, brush .18; wider, more irregular, higher-contrast bands). Choosing a stone in the dropdown now brings in that stone's natural colours (reverses the PD-94 keep-colours rule; the paintbrush draws again from the same stone).
<!-- SECTION:NOTES:END -->
