---
id: PD-42
title: 'Fix: page failed to start when an inclusion model was saved'
status: Done
assignee: []
created_date: '2026-11-10T00:31:00Z'
updated_date: '2026-11-10T16:28:00Z'
labels:
  - bug
dependencies: []
priority: high
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ReferenceError: Cannot access 'MODELS' before initialization. Saved-state sanitising ran before MODELS was defined; the name check now runs at startup after MODELS exists. Verified with saved inclusion duck, blackcat, an unknown name and custom.
<!-- SECTION:DESCRIPTION:END -->
