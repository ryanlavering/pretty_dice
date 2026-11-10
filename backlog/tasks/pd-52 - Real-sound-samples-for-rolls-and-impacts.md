---
id: PD-52
title: Real sound samples for rolls and impacts
status: To Do
assignee: []
created_date: '2026-11-10T01:58:00Z'
labels:
  - audio
dependencies: []
priority: low
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace or blend the synthesised sounds with recorded samples. Sources: (a) user records dice on several surfaces and dice materials (plastic, metal, stone, resin/epoxy; table, felt, wood, tray), (b) open-source or CC0 libraries (check each licence; avoid attribution-required or non-commercial unless acceptable; no copyright-unclear downloads). Plan: short samples per material and impact strength (3-5 variations each, pitch-randomised), a rolling loop, nat 20 and nat 1 stingers; decode with Web Audio and pick by substrate/impact speed; keep synth as fallback; keep files small (compressed, under a few MB total) and record licence/credit in the repo. Open questions: bundle with the repo or load on demand; per-surface selection (tray/felt/wood); volume normalisation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sample set chosen with licences recorded in the repo
- [ ] #2 Impacts pick a sample by substrate and impact speed with randomised pitch and variation
- [ ] #3 Synth sounds remain as fallback if samples fail to load
<!-- AC:END -->
