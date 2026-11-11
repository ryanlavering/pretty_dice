---
id: PD-20
title: Automated test system (Playwright harness, smoke + logic tests)
status: Done
assignee: []
created_date: '2026-11-09T21:28:00Z'
updated_date: '2026-11-11T02:38:00Z'
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
- [x] #1 npm test runs smoke + logic specs green on the host
- [x] #2 window.__pd test API (pause/renderOnce/setView/simRoll/memory) replaces window.__dice
- [x] #3 Every in-page ?test= hook is either migrated to a spec or listed as pending in a sub-card
- [x] #4 CLAUDE.md and README describe how to run tests
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch feat/pd-20-test-harness (worktree ../pretty_dice-pd20). 30 tests (smoke 17 incl. phone, logic 13) pass on host (4.3 min, 2 workers) and in Docker (4.3 min). Found + fixed: vendor/cannon-es/dist was git-ignored by 'dist/' (fresh clones had no offline cannon-es); boot/rolls not reproducible (three.js UUIDs consume Math.random) -> app rng() + ?seed=N + randQuat. 19 hooks migrated and removed; 7 remain, listed on PD-20.1/20.2. Note: headless Chrome now has DeviceMotionEvent.requestPermission, so setShake(true) without sensor permission silently stays off; may affect Android Chrome too (worth a phone check).

Merged to main (9b57967) after owner go-ahead 2026-11-10; CI run 42945923923 green.
<!-- SECTION:NOTES:END -->
