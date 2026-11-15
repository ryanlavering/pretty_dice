---
id: PD-147
title: >-
  DESIGN: state invariants audit (bag, roll flow, saved games, engine) with
  leads to verify
status: To Do
assignee: []
created_date: '2026-11-14T23:58:00Z'
labels:
  - fable 5.2
  - testing
  - design
dependencies: []
priority: medium
ordinal: 222000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design doc: docs/design/state-invariants-audit.md (written by Fable 5.2, 2026-11-14). Lists the state rules for the bag, sets, roll flow, storage and the games engine, a method to check them (a checkInvariants hook plus seeded random operations, and bot-against-bot engine checks), and unverified leads to check first (start with C-L1: a Craps table saved mid-roll may resume locked). Also lists dice jail questions to settle before PD-105. Owner decisions are listed in the doc. Related: PD-105, PD-20.
<!-- SECTION:DESCRIPTION:END -->
