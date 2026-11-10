---
id: PD-57
title: Load design fails on mobile
status: Done
assignee: []
created_date: '2026-11-10T16:19:00Z'
updated_date: '2026-11-10T22:05:00Z'
labels:
  - bug
  - mobile
dependencies: []
priority: high
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Loading a saved design JSON does not work on mobile (reported 2026-11-10). Repro on a device first; check file picker/accept types, FileReader, and iOS/Android handling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Load design works on iOS Safari and Android Chrome
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10: could not reproduce on a device. Likely causes fixed: (1) file input had accept='.json,application/json' - phones often label saved .json as text/plain or octet-stream and grey it out; accept removed (loadDesign validates anyway); (2) the input was cleared before the file was read, which can empty the File on some phones - now read first, then clear; (3) f.text() fallback to FileReader for older iOS, BOM stripped. Headless test ?test=jsonfile loads an octet-stream file through the input. Needs a real-phone check; if it still fails, note the exact message shown.

Owner confirmed 2026-11-10: Load design works on mobile.
<!-- SECTION:NOTES:END -->
