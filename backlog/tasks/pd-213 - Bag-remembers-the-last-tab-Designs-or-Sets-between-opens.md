---
id: PD-213
title: Bag remembers the last tab (Designs or Sets) between opens
status: Review Complete
assignee: []
created_date: '2026-11-22T06:02:00Z'
updated_date: '2026-11-24T23:39:00Z'
labels:
  - v4.2
  - polish
dependencies: []
ordinal: 406000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner review of the Dev artifact (2026-11-21): 'When opening bag, we should remember the last design/set view.' Opening the Bag should return to the sheet tab last used (Designs or Sets, #sheettabs) instead of always starting on Designs. Persist per device (settings store or a small localStorage key, try/catch), default Designs, survives reload; does not change the bag file format.
<!-- SECTION:DESCRIPTION:END -->
