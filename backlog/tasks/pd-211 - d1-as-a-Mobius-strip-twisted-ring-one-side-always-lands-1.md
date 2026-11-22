---
id: PD-211
title: 'd1 as a Mobius strip (twisted ring): one side, always lands 1'
status: To Do
assignee: []
created_date: '2026-11-22T03:38:00Z'
labels:
  - v4.3
  - shapes
  - feature
dependencies: []
ordinal: 404000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner decision 2026-11-21: the d1 in the app will be a Mobius strip (twisted ring). Only one side, so a toss always shows the single face '1'. Easy, no gomboc physics needed. Needs: ring geometry with half twist, physics hull choice (a Mobius strip is not convex: use a convex-decomposed or approximated collider, or a thin torus-like collider and rely on the visual), face label placement on the single surface, rest pose rule (ring lies flat; the label stays readable, e.g. repeated along the strip). The Gomboc (PD-207) stays as research; if a good Gomboc shape is found and the roll physics works well with it, it may be added later as another d1 option (owner: the more eccentric Sloan shape is not too bad).
<!-- SECTION:DESCRIPTION:END -->
