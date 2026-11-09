---
id: PD-38
title: Model inclusion in epoxy dice
status: To Do
assignee: []
created_date: '2026-11-09T22:41:00Z'
labels:
  - look
dependencies: []
priority: low
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Embed a user-supplied model (GLB/OBJ/STL) inside clear epoxy, e.g. a rubber duck. Option A: real child mesh scaled to fit, ghosted/fogged material, mist/size/offset/rotation controls; refracts through the epoxy for free. Option B: voxelise to a 3D density texture and sample it in the epoxy volume shader for true misty look. Open issues: small dice (d4/d6) room and number occlusion, model persistence (too big for localStorage; embed in design JSON or IndexedDB), per-die vs all dice in sets, manufacturing needs a physical object to cast, model licensing.
<!-- SECTION:DESCRIPTION:END -->
