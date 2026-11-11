---
id: PD-17
title: d4 numbering convention
status: Done
assignee: []
created_date: '2026-11-09T21:28:00Z'
updated_date: '2026-11-11T01:08:00Z'
labels:
  - geometry
dependencies: []
priority: medium
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Real d4s print the number at the vertices (read around the top point) rather than one number per face. Add vertex-style layout and a matching roll readout.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 owner: already done. Covered by PD-54: d4 numbers sit at the vertices by default (d4Style 'tips'), readout is the top vertex = label of the face lying down (index.html ~810, readResult ~1112), face-centre style kept as an option.
<!-- SECTION:NOTES:END -->
