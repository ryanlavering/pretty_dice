---
id: PD-201
title: Residual micro-hops at default gravity (lone d20 17 hops, pile 27)
status: To Do
assignee: []
created_date: '2026-11-21T00:20:00Z'
labels:
  - v4.2
dependencies: []
priority: low
ordinal: 394000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From PD-195 diagnosis (docs/design/dice-twitch-diagnosis.md on v4.1): at default gravity (0.044x) the same solver-residual limit cycle shows in the lane harness: a lone d20 hopped 17 times (last at 8.4 s), a 9-die pile 27 times (last 6.7 s, first rest 4.6 s). Owner has not reported it. PD-195's fix only applies above default gravity to keep default feel and seeded outcomes unchanged. Decide whether to apply the sleep/iteration tuning at default too (changes seeded roll outcomes and the slow-motion feel).
<!-- SECTION:DESCRIPTION:END -->
