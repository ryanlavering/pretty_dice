---
id: PD-34
title: 'Fix: 0 off-centre and 00 missing on percentile die'
status: Needs Review
assignee: []
created_date: '2026-11-09T22:06:00Z'
labels:
  - bug
dependencies: []
priority: medium
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cause: canvas textAlign was set after measuring the first label, so label index 0 (the 0) was shifted by half its width. Fixed; tens die now prints 00-90. Test hook ?test=atlas measures glyph centring per font.
<!-- SECTION:DESCRIPTION:END -->
