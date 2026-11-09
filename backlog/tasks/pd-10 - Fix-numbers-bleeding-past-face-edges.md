---
id: PD-10
title: Fix numbers bleeding past face edges
status: Needs Review
assignee: []
created_date: '2026-11-09T21:27:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cause: atlas UVs spilled into neighbouring cells. Fix: fit text per face and clamp bump/mask lookups to the face's own atlas cell (cellB attribute).
<!-- SECTION:DESCRIPTION:END -->
