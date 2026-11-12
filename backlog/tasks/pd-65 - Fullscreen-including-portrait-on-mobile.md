---
id: PD-65
title: 'Distraction-free mode: UI collapsed to a single ''show controls'' button'
status: Review Complete
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-12T00:16:00Z'
labels:
  - feature
  - mobile
  - ui
dependencies: []
priority: medium
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-11: the existing layout toggle already gives a full view area, so real fullscreen is not needed. Replace this card with a distraction-free mode where every control is hidden except one small 'show controls' button. Open question: how to enter it without adding clutter. Options: (a) long-press the layout toggle, (b) h key on desktop plus the settings menu, (c) double-tap empty mat. Not started.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fullscreen works on desktop and mobile, both orientations
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: built as chosen by owner. Long-press (550 ms) the layout button, or press h: everything hides except the layout button, titled 'Show controls'. Tap it or press h to return. Not persisted across reloads. Tests in smoke.spec.
<!-- SECTION:NOTES:END -->
