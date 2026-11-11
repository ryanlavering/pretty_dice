---
id: PD-87
title: 'Spike: is translucency worthwhile on solid plastic?'
status: Done
assignee: []
created_date: '2026-11-10T16:20:00Z'
updated_date: '2026-11-11T22:43:00Z'
labels:
  - spike
  - visual
dependencies: []
priority: low
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decide whether current render fidelity makes translucency on solid plastic worthwhile or too subtle. Relates to pd-29.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11 spike: made swirl plastic transmissive at low and full clarity. Result: it reads as dull epoxy, the swirl is muted, and transmission adds a render pass. Not worthwhile; solid and swirled plastic stay opaque. Epoxy keeps translucency (PD-29).
<!-- SECTION:NOTES:END -->
