---
id: PD-132
title: >-
  Sound follow-ups: loudness matching, tuning-tool parity, real
  stone/metal/glass hits and stingers
status: To Do
assignee: []
created_date: '2026-11-13T03:01:00Z'
labels:
  - audio
milestone: m-1
dependencies: []
references:
  - sounds/README.md
  - backlog/tasks/pd-52 - Real-sound-samples-for-rolls-and-impacts.md
priority: low
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-ups left after the PD-114 sound engine shipped in v3.0 (owner 2026-11-12: file for the next release).

- Loudness matching across the sound sets (classic, procedural, Kenney, Best-of, Blend) so A/B comparisons are fair (per-set trim, measured RMS).
- Tuning tool parity: tools/sound-audition.html has no spatial width or rolling ticks, and it duplicates the hardness, ring and FM glass models from index.html by hand (a test only checks the tables). Consider sharing the model code.
- Real recordings for stone, metal and glass hits (CC0) and for the nat 20 chime / nat 1 fumble stingers; the stingers are still synthesised on the classic synth. (Real glass clinks were tried and dropped: they sounded like glasses in a dishwasher; the FM glass voice won.)
- Bind the sound-only Surface (state.surfaceMat) to the roll-feel presets (PD-100) so the surface sound follows the preset.
- Optional: link the Best-Kenney slider to surface hardness automatically; Keep/Drop picks support in scripts/build-sounds.mjs; prune sound sets nobody uses (classic and procedural are fallbacks and comparison baselines for now).
- Rolling sound: tune tick rate and level after listening; decide whether it defaults on.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Loudness matched across all sound sets
- [ ] #2 Tuning tool supports spatial width and rolling ticks (or shares code with the app)
- [ ] #3 Real stone, metal and glass hits and the nat 20 / nat 1 stingers recorded or sourced (CC0, credited)
- [ ] #4 Surface sound follows the roll-feel presets (PD-100)
<!-- AC:END -->
