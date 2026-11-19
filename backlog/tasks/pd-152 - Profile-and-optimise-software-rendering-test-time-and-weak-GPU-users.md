---
id: PD-152
title: Profile and optimise software rendering (test time and weak-GPU users)
status: To Do
assignee: []
created_date: '2026-11-18T14:52:00Z'
labels:
  - v4.1
milestone: m-2
dependencies: []
priority: high
ordinal: 341000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-18: after the 4.1 factoring, review and optimise software rendering; it may dominate test time and be the next long pole. Evidence so far (docs/design/v41-baseline.md on branch v4.1): --disable-accelerated-2d-canvas took the full suite from 52 to 17.8 min wall (85.5 to 26.6 min summed); with swiftshader a frame costs ~300 ms and the big number-atlas 2D canvases (blur filters) leave seconds of hidden GPU backlog that stalls the next WebGL call. Not yet measured: how the remaining 17.8 min splits into GPU/raster, waiting on frames, and app logic (slowest files: bagbrowser 183 s, owner-comments 182 s, smoke 135 s, bagsets 108 s, nav-dock 94 s). Plan: (1) MEASURE per spec with scripts/profile.mjs and scripts/boottimes.mjs; (2) app-side: cache atlases per design, smaller canvases and cheaper blurs for thumbnails/bag view, avoid atlas rebuilds on every tweak (also helps real weak-GPU users); (3) test-side: lower resolution/deviceScaleFactor, fewer redundant boots, worker count matched to cores. Guard: every rendering change must keep the golden set (tests/golden, including the rendered-frame hash) identical or explain each diff. OWNER NOTE TO INCLUDE: also look at/for 'fable' results from the investigation (wording unclear: confirm with owner whether this means viable/candidate results, results from a Fable-model investigation, or something else) and report them in the writeup.
<!-- SECTION:DESCRIPTION:END -->
