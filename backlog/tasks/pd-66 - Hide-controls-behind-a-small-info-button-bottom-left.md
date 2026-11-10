---
id: PD-66
title: Hide controls behind a small info button, bottom left
status: Needs Review
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T20:31:00Z'
labels:
  - ux
  - ui
dependencies: []
priority: medium
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Collapse the controls behind a small info button at bottom left.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Controls hidden by default, toggle via button
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Controls now live in a drawer (left panel on desktop, bottom sheet <=760px) toggled by an info button bottom-left; hidden by default, state remembered in localStorage (prettydice.panel). Stage is always full-size. Single dice now fit portrait screens (needHalfW 1.5). ?panel=1 opens it for tests. Mobile open state looked odd in a headless screenshot (canvas dark behind the sheet) - check on a real phone.
<!-- SECTION:NOTES:END -->
