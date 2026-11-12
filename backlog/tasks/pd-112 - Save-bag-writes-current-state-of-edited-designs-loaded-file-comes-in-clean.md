---
id: PD-112
title: >-
  Save bag writes the current state of edited designs; a loaded file comes in
  clean
status: Done
assignee: []
created_date: '2026-11-12T00:20:00Z'
updated_date: '2026-11-12T03:32:00Z'
labels:
  - bug
  - dice-bag
dependencies: []
parent_task_id: PD-102
priority: medium
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner decision 2026-11-11. Save bag used to write each edited design's pre-edit state in the design entry plus its edit in a pending section, so a loaded file came back Modified. Now the file holds every design's current state (edits folded in) and no pending section; a loaded file is clean with the newer state. The live session keeps its pending edits and Modified badges, so Revert still works after saving; saving the bag does not mean the design edits are saved. Browser autosave still keeps the pending edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Saved file has current design states and empty pending
- [x] #2 After saving, the session still shows Modified and Revert restores the old state; Bag modified badge clears
- [x] #3 Loading the file gives clean designs with the newer state
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12: bagFileJSON() in index.html (used by Save bag and the bag-unsaved comparison); bagToJSON() unchanged for autosave. Test: bagbrowser.spec 'Save bag writes the current state...(PD-112)'. Needs owner check.
<!-- SECTION:NOTES:END -->
