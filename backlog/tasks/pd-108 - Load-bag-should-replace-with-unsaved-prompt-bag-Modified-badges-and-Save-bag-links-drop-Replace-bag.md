---
id: PD-108
title: Load bag should replace (with unsaved-changes prompt); bag Modified badges and Save bag links; drop Replace bag
status: Needs Review
assignee: []
created_date: '2026-11-11T23:40:00Z'
updated_date: '2026-11-11T23:40:00Z'
labels:
  - feature
  - dice-bag
dependencies: []
parent_task_id: PD-102
priority: medium
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner feedback 2026-11-11. Today Settings > Load bag appends the file's designs to the current bag, and a separate "Replace bag…" button replaces it (confirm only). Wanted:
- Load bag replaces the current bag. If the bag has unsaved changes (never saved to a file since its last change), prompt first: Save bag / Discard / Cancel.
- "Modified" badge on the bag controls (bag button, bag row, sheet, settings) when the bag has changes not yet saved to a file.
- Convenient "Save bag" links next to those badges.
- Remove the "Replace bag…" button once Load bag replaces. Keep appending via Add to the bag > From a file…
- Needs a bag-level dirty flag (set on any bag change, cleared by Save bag / load). Decide whether the localStorage autosave counts as saved (probably not: it is not a file).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Load bag replaces the bag; unsaved bag prompts Save / Discard / Cancel
- [x] #2 Bag Modified badge and Save bag link shown on the bag controls
- [x] #3 Replace bag… removed; From a file… still appends
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: Load bag replaces; dirty = bag content differs from the last file save/load (stored in localStorage prettydice.bagsaved.v1, compared by content). Save/Discard/Cancel dialog (#bagask). 'Bag modified' pill + Save bag link in the settings bag row and sheet header; dot on #savebag and the shelf bag button. Replace bag… removed; From a file… (shelf +) still appends. Test: bagbrowser.spec 'Load bag replaces the bag...(PD-108)'. playwright.config PD_PORT override so worktrees do not reuse another checkout's :8124 server. Full suite: 82 passed, 2 flaky (logic filigree, physics watchdog) under heavy machine load. Needs owner check.
<!-- SECTION:NOTES:END -->
