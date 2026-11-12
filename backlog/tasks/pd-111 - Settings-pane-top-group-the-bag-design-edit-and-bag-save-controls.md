---
id: PD-111
title: 'Settings pane top: group the bag, design-edit and bag-save controls'
status: Done
assignee: []
created_date: '2026-11-12T00:40:00Z'
updated_date: '2026-11-12T03:32:00Z'
labels:
  - ui
dependencies: []
ordinal: 124000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-12 (screenshot): the top of the settings pane is jumbled: design card with a Modified badge, then a separate 'Bag modified' pill with a Save bag link, then Save / Save as copy / Revert, then Randomize, undo/redo, the options row and the Showcase/Roll switch all run together with similar weight. Reorganize: one bag box (design card with its Modified badge, the design actions when edited, and a quiet 'bag not saved to a file' line with Save bag as the footer), then a clearly separate Randomize group, then the view switch.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: one bag box (design card with its Modified badge, Save / Save as copy / Revert when edited, quiet 'Bag not saved to a file' footer with Save bag); Randomize + undo/redo + options and the Showcase/Roll switch sit below with more space. Element ids unchanged.

2026-11-12 owner: the Showcase/Roll switch moved to the very top of the settings pane (above the bag box).
<!-- SECTION:NOTES:END -->
