---
id: PD-129
title: Dark, thin scrollbars to match the UI
status: In Progress
assignee: []
created_date: '2026-11-12T23:07:00Z'
labels:
  - ux
dependencies: []
ordinal: 137000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found during review (owner, 2026-11-12): the default light scrollbars (sidebar, All-designs sheet, Sets list, roll log panel, shelf) clash with the dark style. Use thin dark scrollbars everywhere (scrollbar-width/scrollbar-color, plus WebKit pseudo-elements). Also the roll log panel showed a horizontal scrollbar: it must not scroll sideways.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scrollbars are thin and dark in the sidebar, sheet, set list, roll log and shelf
- [ ] #2 The roll log panel has no horizontal scrollbar
<!-- AC:END -->
