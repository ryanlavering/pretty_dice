---
id: PD-24
title: 'Fix: palette lost after randomize -> switch substrate -> switch back'
status: Done
assignee: []
created_date: '2026-11-09T21:37:00Z'
updated_date: '2026-11-10T16:28:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Old code regenerated the palette from the seed on every substrate click, so the first return differed from the randomized colours. Fixed by per-substrate palettes (PD-11); regression hook ?test=subs.
<!-- SECTION:DESCRIPTION:END -->
