---
id: PD-128
title: 'Bag sheet: Save, Load and Copy JSON icon buttons beside Close'
status: Needs Review
assignee: []
created_date: '2026-11-12T22:46:00Z'
updated_date: '2026-11-12T22:55:00Z'
labels:
  - feature
  - bag
dependencies: []
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner request while reviewing PD-117: the dice bag sheet had no save/load/copy controls. Three icon buttons (save to file, load a bag file, copy bag JSON) sit in the sheet header next to Close; icons rather than text so they fit on a phone. Save shows a dot when the bag has unsaved changes (the Bag modified pill is hidden on narrow screens); Load asks first when there are unsaved changes (same flow as the sidebar button); Copy confirms with a highlight.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Save, Load and Copy icon buttons are in the bag sheet header beside Close
- [ ] #2 They fit at 390 px wide
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-12 owner add-on: the bag name is editable in the sheet title (click it; Enter saves, Escape cancels) and is the base of the saved file name (slug, e.g. 'Dungeon night!' -> dungeon-night.bag.json). Renaming marks the bag modified.
<!-- SECTION:NOTES:END -->
