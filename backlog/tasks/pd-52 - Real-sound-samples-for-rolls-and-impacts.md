---
id: PD-52
title: Real sound samples for rolls and impacts
status: To Do
assignee: []
created_date: '2026-11-10T01:58:00Z'
updated_date: '2026-11-12T23:58:00Z'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 feedback: wants thud, clack, stone, glass samples; do some sound sampling.

Sample budget (2026-11-10): takes(5) x surfaces(S) x substrates(D) x amounts(single/few/many 5-10) x shapes(6, optional). Random take per event keeps it organic. Code lists ~12 substrates (5 base + 7 stone), 1 surface today: 5x1x12x3x6 = 1080 clips full matrix. Grouping by material class (plastic/resin, metal, stone, glass = 4) gives 5x4x3x6 = 360 per surface; dropping shape = 60 per surface. Likely start with the 60-clip class set, add shape/surface variants only where audible.

2026-11-12: PD-114 (merged) delivered the sample-set engine: single impacts cut from CC0 recordings (Kenney Casino Audio, OpenGameArt dice packs), picked by impact level and material-pair hardness, synth fallback kept. Still open here: stingers (nat 20 / nat 1), rolling loop, real stone/metal/glass hits, per-surface recordings, and the owner's own recordings. See sounds/README.md.
<!-- SECTION:NOTES:END -->
