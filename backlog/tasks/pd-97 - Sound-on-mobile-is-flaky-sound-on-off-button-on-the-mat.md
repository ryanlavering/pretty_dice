---
id: PD-97
title: Sound on mobile is flaky; sound on/off button on the mat
status: Needs Review
assignee: []
created_date: '2026-11-11T07:17:00Z'
updated_date: '2026-11-11T08:06:00Z'
labels:
  - bug
  - mobile
  - audio
dependencies: []
priority: high
ordinal: 103000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-10: sound on mobile works sometimes, lately less. Likely iOS causes: AudioContext 'interrupted' state was never resumed (only 'suspended'), resume only happened at Roll, and the ring/silent switch mutes Web Audio unless the page holds a playback audio session. Fix: every tap re-wakes the context; navigator.audioSession.type='playback' (iOS 16.4+) or a looping silent clip on older iOS; sound button on the mat (left column, above the layout toggle), synced with the settings checkbox. Specs in tests/smoke.spec.mjs. Needs a real-iPhone check.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-11-10 owner: no sound at all from the artifact on mobile (artifact is a sandboxed iframe; could not emulate that headless). Added diagnostics: 'Test sound' button in Roll feel & sound plays a blip inside the tap and shows the audio state ('audio running|suspended|interrupted, session playback'); the mat's sound button also plays a blip when turned on. Next step depends on what the phone reports.

2026-11-11 cause confirmed by owner: the iPhone ring/silent switch (silent) muted all web sound; ringer on made it work. The 'playback' audio session alone was not enough in the artifact. Now on iOS the page ALSO loops a silent clip from a data: URI (blob: media is blocked in artifact frames), which moves it to the media channel so the switch should not mute the dice. Test sound status shows 'silent-mode bypass on' and an iOS hint. Needs a re-test with the switch on silent.
<!-- SECTION:NOTES:END -->
