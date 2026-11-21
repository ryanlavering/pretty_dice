---
id: PD-182
title: Add a blank die mid-game drops the game to one die
status: To Do
assignee: []
created_date: '2026-11-20T06:16:00Z'
labels:
  - v4.3
dependencies: []
priority: low
ordinal: 375000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found while fixing PD-180: bagOps.addBlank() during a game ignores the game's dice and leaves one die. Check whether the UI exposes it mid-game; fix so a running game keeps its dice (or the control is blocked).
<!-- SECTION:DESCRIPTION:END -->
