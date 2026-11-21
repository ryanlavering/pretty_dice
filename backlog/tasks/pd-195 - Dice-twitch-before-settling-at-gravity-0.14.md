---
id: PD-195
title: Dice twitch before settling at gravity >= 0.14
status: Needs Review
assignee: []
created_date: '2026-11-20T23:40:00Z'
updated_date: '2026-11-21T00:56:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 388000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner feedback: with the Gravity slider at 0.14 (or higher), dice sit on the mat and twitch a bit before they settle. Independent of the bounciness and friction sliders. Suspicion: fixed-step frames leave too much gap for proper settling (sub-stepping, sleep thresholds, penetration slop, contact solver iterations, or restitution velocity threshold scaled wrongly with gravity). Goal: find the mechanism and a mitigation so dice do not twitch. Owner wants: figure out mechanism, propose mitigation.
<!-- SECTION:DESCRIPTION:END -->
