---
id: PD-104
title: >-
  Splash screen: title over a full-screen roll mat, shower of random dice rolls
  in, then morphs into the showcase
status: To Do
assignee: []
created_date: '2026-11-11T19:32:00Z'
labels:
  - idea
  - visual
dependencies: []
priority: low
ordinal: 110000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-11 (idea, explore later). On launch: the app title (Cinzel, accent) over a full-screen roll mat with a very large tray. A shower of individually randomized dice (each its own random design and shape) drops in for a dramatic roll-in. When they settle, the scene zooms or morphs into the showcase view with whatever state we load today (random, default or resumed). Questions to explore: how the morph works (camera fly-in to the active die while the others fade or sink, or the tray shrinking into the showcase stage); how long it runs (skippable by tap, shown once per session, prefers-reduced-motion skips it); load cost on phones (how many dice and materials; maybe reuse bag designs once PD-102 lands, so the splash shows your own dice); whether it doubles as the loading screen while the CDN or vendor libs load. Related: PD-102 (dice bag), PD-100 (roll feel presets), PD-93 (draw the tray), PD-65 (fullscreen).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Splash plays on first load and can be skipped with a tap
- [ ] #2 Dice are individually randomized and roll in on a large tray under the title
- [ ] #3 Transition lands in the showcase with the same state as loading without the splash
- [ ] #4 prefers-reduced-motion skips it
<!-- AC:END -->
