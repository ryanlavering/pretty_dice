---
id: PD-219
title: 'Gömböc offshoot: fair dN bodies (S=N, equal landing probability)'
status: To Do
assignee: []
created_date: '2026-11-23T17:06:00Z'
labels:
  - v4.3
  - gomboc
  - research
dependencies: []
ordinal: 412000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Offshoot of the Gömböc research (PD-207; repo split PD-216). Search for convex bodies with exactly N stable faces where every stable face has the same landing probability p = 1/N (a fair N-sided die that is not one of the platonic or symmetric solids, e.g. few faces, odd N such as d5/d7, or a coin-like d2). Landing probability = measure of the basin of attraction of each stable face (tipping-graph basins for polyhedra, or flow basins on the gradient map), under a defined throw model (uniform random start orientation at low energy first; later a real roll model with the app physics). Method sketch: reuse the exact S/U/H and tipping-graph checker; compute basin area on the sphere of orientations; optimise face heights and the centroid so the N basin areas are equal (SLP or CMA-ES on basin-area variance). Report basin areas, rigor label, and whether the physical roll (page or app physics) agrees.
<!-- SECTION:DESCRIPTION:END -->
