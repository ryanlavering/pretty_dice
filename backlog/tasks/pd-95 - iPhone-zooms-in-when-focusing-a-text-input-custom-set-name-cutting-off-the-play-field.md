---
id: PD-95
title: >-
  iPhone zooms in when focusing a text input (custom set, name), cutting off the
  play field
status: Done
assignee: []
created_date: '2026-11-11T07:05:00Z'
updated_date: '2026-11-11T07:13:00Z'
labels:
  - bug
  - mobile
  - ios
dependencies: []
priority: high
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-10 (iPhone Safari, screenshots): tapping the custom-set text input zooms the page in and leaves it zoomed, so part of the play field is cut off. Cause: iOS Safari zooms on focus of any input/select/textarea whose font-size is under 16px. Fix: 16px minimum on touch devices (no maximum-scale, which would block pinch zoom for accessibility).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No page zoom when focusing the custom set, name or any select on iPhone
- [ ] #2 Regression spec: all text inputs and selects >= 16px under touch emulation
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed 2026-11-10: @media (pointer:coarse),(hover:none) forces 16px on text inputs/selects (!important over inline font:inherit). Regression spec in tests/smoke.spec.mjs (touch emulation; fails without the fix). npm test: 49 passed, 2 flaky-then-pass. Owner OK'd (take care of obvious wins).
<!-- SECTION:NOTES:END -->
