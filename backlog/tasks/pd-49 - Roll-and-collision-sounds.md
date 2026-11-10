---
id: PD-49
title: Roll and collision sounds
status: Done
assignee: []
created_date: '2026-11-10T01:36:00Z'
updated_date: '2026-11-10T16:28:00Z'
labels:
  - physics
dependencies: []
priority: low
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Synthesised Web Audio sounds: impact clicks scaled by collision speed, rolling rumble, nat 20 chime and nat 1 thud; mute toggle. No audio files needed.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Built: Web Audio synthesis (no files). Per-impact clicks (table thump vs die-on-die click, pitch/ring by substrate: metal rings, stone/epoxy lower), speed-scaled volume, one sound per colliding pair, rolling rumble that follows dice speed, ascending chime per nat 20 (pitch steps up per die, in step with the bursts), low thud on nat 1. Sound checkbox + Volume slider, persisted. Audio starts on first click/key (browser rule). Verified only that collision events fire and no errors occur in headless Chrome; I have not heard it, so tune by ear.
<!-- SECTION:NOTES:END -->
