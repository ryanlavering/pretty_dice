---
id: PD-113
title: New blank design is a plain off-white solid plastic die
status: Done
assignee: []
created_date: '2026-11-12T03:24:00Z'
labels: []
dependencies: []
ordinal: 126000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adding a blank design to the bag (shelf + menu, All-designs sheet) gave the swirl default every time (pink swirls). It now starts as a plain off-white solid plastic die (#efe9dc, substrate solid), a neutral starting point; Randomize / Random draft remains the way to get a surprise. Child of PD-102 (dice bag).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 New blank design is solid plastic, single off-white colour
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
bagOps.addBlank sets substrate solid with an off-white shared palette. Test in tests/bagbrowser.spec.mjs. Commit ced331a on v3-dice-bag; artifact v16.
<!-- SECTION:FINAL_SUMMARY:END -->
