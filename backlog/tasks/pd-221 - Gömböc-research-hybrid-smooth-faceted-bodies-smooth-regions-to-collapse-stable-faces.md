---
id: PD-221
title: >-
  Gömböc research: hybrid smooth/faceted bodies (smooth regions to collapse
  stable faces)
status: To Do
assignee: []
created_date: '2026-11-23T17:09:00Z'
labels:
  - v4.3
  - gomboc
  - research
dependencies: []
ordinal: 414000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea. Combine smooth patches (spherical or conic sections) with facets. Start from a low-poly faceted body and apply smoothing (local rounding, or replacing a cluster of faces by one spherical/conic patch) in regions that hold many stable faces. Questions: (1) Do clustered stable faces tend to collapse to a single S when their region is smoothed (a smooth patch of a convex body has a stable point only where the support function has a minimum, so a patch with several shallow dimples may merge them into one minimum)? Measure S before and after per region. (2) Can we inflate or deflate a smoothed region (offset along the normal, change the patch radius or cone angle, shift the centroid) to optimise the collapse, e.g. gradient or CMA-ES on patch parameters with S as the objective and persistence of the extra minima as a smooth surrogate? (3) Does the same help reduce U (saddle and peak merging at rounded vertices and edges)? Method: build on the exact tipping-graph checker for the faceted part and the smooth-body winding-index checker (icosphere L5-L7, convexity K, CoM region M) for the hybrid; the hybrid is convex if patches are tangent-continuous or only add convex material. Rigor labels as usual; start at 14 to 40 faces. Relates to PD-207 (round 18 beam search found S=1 with U=5 at 172 faces; fills near the saddle only trade peaks), PD-208 (low poly search).
<!-- SECTION:DESCRIPTION:END -->
