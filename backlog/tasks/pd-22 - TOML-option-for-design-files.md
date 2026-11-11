---
id: PD-22
title: TOML option for design files
status: Done
assignee: []
created_date: '2026-11-09T21:28:00Z'
updated_date: '2026-11-11T22:43:00Z'
labels:
  - export
dependencies: []
priority: low
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate adding TOML read/write for hand-editable designs; JSON stays canonical.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-11: closed, no code. docs/design/design-format.md already records the decision: JSON canonical (native in the browser, nests cleanly, reusable for quoting). TOML never implemented. Reopen only if hand-editing becomes a real need.
<!-- SECTION:NOTES:END -->
