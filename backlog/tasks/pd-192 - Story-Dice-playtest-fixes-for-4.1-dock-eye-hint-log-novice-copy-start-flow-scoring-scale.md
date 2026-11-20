---
id: PD-192
title: >-
  Story Dice playtest fixes for 4.1: dock, eye hint, log, novice copy, start
  flow, scoring scale
status: Needs Review
assignee: []
created_date: '2026-11-20T20:08:00Z'
updated_date: '2026-11-20T20:30:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 385000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner decision 2026-11-20 (Q1 'as recommended'): from docs/playtests/story-dice-round1 take into 4.1: 
A. Novice copy: explain the rating scale once and who judges; fix solo wording ('The bot's version is a prompt: tell your own'); reconcile bot-turn texts ('Bot 2: tell it, then rate the story' vs 'Judge Bot 2's story (an ad-lib)'); stop 'Re-word' wrapping as 'Re-/word'; real game-over screen with 'Play again'; confirmation before End game wipes scores. SCORING: owner wants ratings 0 / 5 / 10 instead of 0/1/2, and to consider either a sliding scale or 5 buckets (0-3-5-7-10) to reduce ties (decision pending).
B. Start flow: 'none' entry in the Game selector; Start game visible without scrolling at 800 px high; quick roll with Story Dice selected-not-started must not jump the panel to the Table tab / roll white cubes (see PD-191 for the look lifetime rules).
C (trimmed): steadier dock during a game with bigger rating chips (no clipping dice, 48->70 px growth); a touch hint on the eye button ('Hold to look from above'); tap targets >= 44 px where cheap. Rest of C (shorter setup/sets editor on phone) -> 4.2.
D (small, 4.1 only): applying a Set mid-game must not log a fake numeric roll ('5d12: 7+12+4+9+4 = 36') in the Log during Story Dice. Rest of D (Rename marks Modified, 'Random draft' label on Blank draft, toast on discarded game-look edits, word-hint labels) -> 4.2.
Sequence: PD-191 (look lifetime) lands first; then B, then A (needs the scoring decision), C and D in parallel lanes on separate files where possible.
<!-- SECTION:DESCRIPTION:END -->

Owner decision (2026-11-20): rating = FIVE BUTTONS worth 0 / 3 / 5 / 7 / 10 points (labels: Bad 0, Weak 3, Fair 5, Good 7, Great 10). Replaces Bad 0 / Fair 1 / Good 2. Saved games in progress keep the totals they already have.

Owner decision (2026-11-20): REMOVE the 'No game' entry from the Game selector ('I don't like No game as a choice'). The preview lives only while the Games tab shows it (PD-191), so leaving the tab / quick roll releases it without a 'none' choice. Lane v41-nonone.
