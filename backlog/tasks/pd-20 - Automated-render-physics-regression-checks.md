---
id: PD-20
title: Automated test system (Playwright harness, smoke + logic tests)
status: In Progress
assignee: []
created_date: '2026-11-09T21:28:00Z'
updated_date: '2026-11-11T01:25:00Z'
labels:
  - testing
dependencies: []
references:
  - docs/design/testing.md
priority: medium
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn the ad-hoc ?test= hooks into a repeatable Playwright Test suite. Design: docs/design/testing.md. This card covers the harness (package.json pinned to @playwright/test 1.64.1, config, shared fixture that fails on pageerror/console.error, seeded Math.random, fresh localStorage, libs=local), the window.__pd test API, and the smoke + logic tiers. Sub-cards cover physics, visual, offline, CI and perf.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm test runs smoke + logic specs green on the host
- [ ] #2 window.__pd test API (pause/renderOnce/setView/simRoll/memory) replaces window.__dice
- [ ] #3 Every in-page ?test= hook is either migrated to a spec or listed as pending in a sub-card
- [ ] #4 CLAUDE.md and README describe how to run tests
<!-- AC:END -->
