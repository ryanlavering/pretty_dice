---
id: PD-118
title: 'Docs refresh for v3.0: README, CHANGELOG, design-format, dice-bag-design, testing'
status: To Do
assignee: []
created_date: '2026-11-12T08:30:00Z'
updated_date: '2026-11-12T08:30:00Z'
labels:
  - v3.0
  - docs
milestone: m-0
dependencies: []
priority: high
ordinal: 118000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner 2026-11-12: a docs refresh run before v3.0 ships. Bring every doc in line with what the app now does, then cut the 3.0 changelog section (versions are git tags; main stays untouched until release).

Things the docs must now say (decisions made while landing PD-107/108/110/112/116, easy to miss):
- Load design adds the file as a new design at the end of the bag and activates it; bag files go through Load bag / Add to the bag > From a file.
- Load bag replaces the bag; if the bag is unsaved a Save / Discard / Cancel prompt comes first. Replace bag button is gone. Add to the bag > From a file appends.
- Bag Modified badge, Save bag links, dots; "unsaved" means the bag differs from the last file save/load (localStorage prettydice.bagsaved.v1), not the browser autosave.
- Save bag writes every design's current state with no pending section; a loaded file comes in clean. The live session keeps its pending edits so Revert still works.
- Shelf: scrolling or dragging never changes the selection, a tap does; mouse drag scrolls; desktop uses the phone card spacing.
- Design pictures (thumbnails): single d20, cached in localStorage prettydice.thumbs.v1 by look, taken only when the camera is at rest; stale pictures need that key cleared.
- Testing: PD_PORT override so worktrees do not reuse another checkout's server on 8124; machine-wide test lock (scripts/with-test-lock.sh); poll timeouts; new specs.
- Test API additions on window.__pd (bagFileJSON, thumbBusy, thumbKey, camBlend).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 README.md describes the bag UI (shelf, All designs, Save/Load bag, Load design, Modified badges) and keyboard/mouse controls as they are now
- [ ] #2 CHANGELOG.md has a 3.0 section (user-facing: bag, shelf, mixed sets, bag sets, roll log, sound if it ships) and no stale "Replace bag"
- [ ] #3 docs/design/design-format.md covers the bag file format as written (no pending in files; version, sets, characters, jail, log)
- [ ] #4 docs/design/dice-bag-design.md: phasing table statuses, open questions answered, shelf/save/load behaviour, no outdated text
- [ ] #5 docs/design/testing.md: new specs, PD_PORT, test lock, background-run tip, flaky-under-load note
- [ ] #6 In-app hint text and button titles match the docs (spot check)
- [ ] #7 Links and file names checked; docs reviewed once by the owner
<!-- AC:END -->
