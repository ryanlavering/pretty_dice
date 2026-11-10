---
id: PD-66
title: Hide controls behind a small info button, bottom left
status: Done
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T22:38:00Z'
labels:
  - ux
  - ui
dependencies: []
priority: medium
ordinal: 1000
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

2026-11-10 owner clarified: 'controls' meant the hint text. Reworked: two-pane layout restored (side-by-side wide, stacked narrow, settings visible by default). Corner buttons on the stage, bottom-left, same 44px style as the roll/showcase button: info (shows/hides the hint text, hidden by default) and a layout toggle (expand icon = go full view, gear icon = bring settings back), remembered in localStorage prettydice.full; ?full=1 for tests. Roll camera pulls back when the stage narrows so the whole tray stays in view.

2026-11-10 feedback round: real gear icon (was a sun); info button moved above the roll/showcase toggle (bottom-right), layout toggle bottom-left; roll and showcase now have independent camera angle and zoom (views.show / views.roll, state.zoom / state.rollZoom; dblclick resets the view you are in); roll zoom works again (the earlier 'fit' factor cancelled it).

2026-11-10: owner reports that toggling fullscreen/panels on mobile leaves the roll (and showcase) view scrolled too high. Could not reproduce headless (headless showed the renderer buffer lagging the stage size after the toggle, so a late/missed ResizeObserver is the prime suspect). Fix: setFull() now re-measures the stage immediately, again next frame and after 300 ms, and resets window scroll; also resize on window resize/orientationchange/visualViewport; #app height uses 100dvh. Needs a real-phone check.

Root cause found 2026-11-10 (reproduced headless with ?test=layoutcycle): the stage was a flex item with min-height:auto, so the canvas's old 780px pixel height held it open when the settings pane returned; in the column-reverse mobile layout the overflow went off the top (labels hidden, dice high). Fix: #stage min-height:0 + overflow:hidden, canvas position:absolute, #app overflow:hidden. Verified split->full->split returns the stage to 421px. The earlier refit/resize additions stay as belt and braces.

Owner confirmed on phone 2026-11-10; merged to main.
<!-- SECTION:NOTES:END -->
