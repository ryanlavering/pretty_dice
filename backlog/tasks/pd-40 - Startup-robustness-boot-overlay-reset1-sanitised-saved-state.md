---
id: PD-40
title: 'Startup robustness: boot overlay, ?reset=1, sanitised saved state'
status: Needs Review
assignee: []
created_date: '2026-11-10T00:14:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
User reported the page stopped loading; could not reproduce (server up, no console errors, corrupt/old saved settings variants all load). Added a Loading overlay that turns into an error message with a reset link on a JS error or after 10 s (CDN problem), ?reset=1 to clear saved settings, and type-checking of saved settings.
<!-- SECTION:DESCRIPTION:END -->
