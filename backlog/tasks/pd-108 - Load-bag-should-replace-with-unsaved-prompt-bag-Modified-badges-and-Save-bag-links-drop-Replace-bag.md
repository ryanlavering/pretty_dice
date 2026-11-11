---
id: PD-108
title: Load bag should replace (with unsaved-changes prompt); bag Modified badges and Save bag links; drop Replace bag
status: To Do
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
- [ ] #1 Load bag replaces the bag; unsaved bag prompts Save / Discard / Cancel
- [ ] #2 Bag Modified badge and Save bag link shown on the bag controls
- [ ] #3 Replace bag… removed; From a file… still appends
<!-- AC:END -->
