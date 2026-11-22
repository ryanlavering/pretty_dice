---
id: PD-149
title: 'View from above: default light causes glare that hides the die faces'
status: In Progress
assignee: []
created_date: '2026-11-18T07:44:00Z'
updated_date: '2026-11-22T04:25:00Z'
labels:
  - v4.2
dependencies: []
priority: medium
ordinal: 335000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (thread 2ac3daf9, 2026-11-18): 'in view from above, the default light position makes it very hard to see the die faces because of glare. A different light angle or some other adjustment to avoid that glare is necessary.' Not 4.0 unless easy, otherwise early 4.1. Options: move the key light off-axis only while the top-down hold is active, or soften specular on the faces in that view. Settings lane: after .38.58, spend a short time-boxed look and report effort in the REVIEW post; if the fix is a small, isolated change confined to the top-down view (e.g. light offset while the handle is held), it may go into 4.0; else leave labelled v4.1.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Settings agent look 2026-11-18: no code change. Single DirectionalLight (3,6,4)x1.6 plus RoomEnvironment env reflections of overhead panels into the overhead camera; fix = while topBlend>0 move/dim the key and fade envMapIntensity, needs visual iteration per substrate. Stays v4.1.
<!-- SECTION:NOTES:END -->
