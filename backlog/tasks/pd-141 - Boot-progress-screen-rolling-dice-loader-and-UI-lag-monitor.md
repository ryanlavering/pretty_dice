---
id: PD-141
title: Boot progress screen, rolling-dice loader and UI lag monitor
status: Needs Review
assignee: []
created_date: '2026-11-13T16:58:00Z'
updated_date: '2026-11-13T18:35:00Z'
labels:
  - feature
  - performance
milestone: m-1
dependencies: []
priority: medium
ordinal: 148000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-13: v3 load can take a long time with no feedback and the UI sometimes freezes (Chrome 'Page unresponsive'). (1) Loading screen shows staged progress: stage label, bar, per-stage ms, stall message names the last stage. (2) CSS-only tumbling d6 on the loading screen (compositor-driven, so it keeps moving while the main thread is blocked; costs no JS). Related: PD-104 (full 3D splash over a roll mat) is the richer, later idea; this loader is the cheap, load-safe precursor and PD-104 can replace it once load is fast. (3) Lag monitor window.__lag: heartbeat + longtask + long-animation-frame observers, named spans around heavy work, input breadcrumbs, app context, worker watchdog that reports a hang that never recovered on next load, toast with copy-diagnostics. Finding so far: first frame shader compile blocks the main thread for seconds, and a second block follows around frame 11 (software GL numbers exaggerate; confirm on real GPU).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Boot overlay shows stage label, progress bar and elapsed time while loading
- [ ] #2 Rolling-dice animation keeps moving while the main thread is blocked
- [ ] #3 Pauses of 200 ms or more are recorded with active operation, input breadcrumbs and app state; 1 s or more shows a copy-diagnostics toast
- [ ] #4 A hang that never recovers is reported on the next load
- [ ] #5 Regression test covers boot stages and the lag monitor
<!-- AC:END -->
