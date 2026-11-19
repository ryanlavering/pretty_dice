---
id: PD-156
title: >-
  Yacht (and scorecard games): accidental score entry; double-tap or long-press
  to score, plus a 2-second 'whoopsie' undo
status: Needs Review
assignee: []
created_date: '2026-11-19T02:39:00Z'
updated_date: '2026-11-19T09:37:00Z'
labels:
  - v4.1
milestone: m-2
dependencies: []
priority: high
ordinal: 352000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner live playtest, 2026-11-18: add an 'oopsie' mode for Yacht (and ideally all scorecard games): after tapping a category, allow undoing that score within the turn (e.g. an Undo/Oops button or confirm-on-tap setting) so a misclick does not cost the category. Considerations: only the most recent score; restores dice, rolls left and turn; works with computer players; resume/save. Maybe a 'tap twice to confirm' option in game setup as an alternative. Feature, so 4.1.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner spec, 2026-11-19: entering a score by accident is a real annoyance. (1) Make score entry deliberate: a double tap or a long press on the category (pick one, or a setting, default double tap; single tap only previews the value and highlights the row). (2) After a score is entered, show a 2-second 'Whoopsie' control (toast or button near the scorecard, with a visible countdown) that undoes the score and restores dice, rolls left and the turn; after 2 s the score is fully locked in. Must work with computer players (bot turns wait out the window or the window is human-only), resume/save (do not persist a score that is still inside its window, or persist the pending state), phone and desktop, and the other scorecard games where it fits. Specs for double-tap score, single-tap preview, whoopsie undo inside 2 s, lock-in after 2 s. Supersedes the earlier 'oopsie' note on this card. Version: default 4.1; the owner called it a minor fix, so 4.0.2 is possible if the owner asks (touches index.html, port to v4.1 src/, golden re-record).

4.1 implementation (v4.1 branch): single tap previews (highlighted box, hint in the dock), double tap scores (default); long press and single-tap modes via a Score entry select under the Yacht scorecard (not in game setup, so the golden Games screen is unchanged). Whoopsie button (scorecard and dock) with a 0.1 s countdown restores engine state (dice, rolls, turn, holds); locks at 2 s or on the next Roll. A pending score is never saved (resume sees the state before it). Bots get no window and a bot turn waits out the human's. Yacht is the only scorecard game in the 4.0 set, so no others to wire. Specs: tests/whoopsie.spec.mjs (5). Existing games-ui/games-phone specs now dblclick the box. Golden unchanged.
<!-- SECTION:NOTES:END -->
