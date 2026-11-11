---
id: PD-96
title: 'Number size: bigger minimum, jumbo sizes up to 5x (cropped by face edges)'
status: Needs Review
assignee: []
created_date: '2026-11-11T07:17:00Z'
labels:
  - feature
  - numbers
dependencies: []
priority: medium
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-10: tiny text is of little use, jumbo text is interesting. Size slider now 0.45 to 5 (was 0.3 to 1) on a log scale so the useful range keeps resolution; saved/imported sizes are clamped to that range. Text larger than the face is cropped by the face edges. Spec in tests/logic.spec.mjs. Not done: the atlas is not re-rendered at higher resolution for jumbo sizes (glyphs get blockier at 4-5x).
<!-- SECTION:DESCRIPTION:END -->
