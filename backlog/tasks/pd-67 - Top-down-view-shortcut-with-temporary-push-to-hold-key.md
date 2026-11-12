---
id: PD-67
title: Top-down view shortcut with temporary push-to-hold key
status: Review Complete
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-12T00:16:00Z'
labels:
  - ux
  - camera
dependencies: []
priority: medium
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Quick top-down look to verify results without moving the aesthetic viewpoint. Owner 2026-11-11: no new on-screen control; press and hold the dice total text (touch or mouse), plus the t key on desktop. Release returns to the player's viewpoint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Camera returns to previous viewpoint on release
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: done in roll view. Total is a .tot element (pointer capture, touch-action none); the t key and window blur are handled; the total fades to 18 % while held. Test in physics.spec. Not a toggle: hold only.

2026-11-11 follow-up: while held, all controls (panel, tools, shelf, name, hint, re-roll button) fade out without reflow; the total stays, dimmed. The camera also backs off enough that every die is in frame if the current zoom would cut some off.

2026-11-11 owner feedback: during the hold only roll-area controls hide; the settings pane stays. Hints now list h / long-press, hold total or t, undo/redo and the buttons.
<!-- SECTION:NOTES:END -->
