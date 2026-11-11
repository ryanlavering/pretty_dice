---
id: PD-103
title: >-
  Result and nat 20 fireworks stayed after a balanced die tipped over (showed
  20, die read 15)
status: Done
assignee: []
created_date: '2026-11-11T09:08:00Z'
labels:
  - bug
  - physics
dependencies: []
priority: high
ordinal: 109000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-11 (iPhone): a d20 balanced on an edge showed Natural 20 with fireworks, then rolled over to 15 and the display still said 20. Cause: a leaning die was flagged but its provisional reading and nat 20 effect stayed when it later came to rest on another face (refreshLeans only cleared the ring). Fix: no nat 20/nat 1 fanfare for a die still leaning; when a leaning die has come to rest (still and flat), the dice are read again so the result and effects match the table. Regression spec in tests/physics.spec.mjs (fails with the old behaviour: showed 16, truth 33).
<!-- SECTION:DESCRIPTION:END -->
