---
id: PD-155
title: 'BUG (live playtest of 4.0): a die read wrong once (showed 6, not scored)'
status: Needs Review
assignee: []
created_date: '2026-11-19T02:39:00Z'
updated_date: '2026-11-20T00:53:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 351000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner live playtest, 2026-11-18: once a die was seen resting on the wrong side; it read 6 but was not scored (or scored as another value). Needs the exact symptom: did the die's top face differ from the value the scorecard used, or did the die show a 6 while not counting? Check the face-reading path for settled dice (leaning/cocked dice, a die resting against another, simultaneous settle) and whether the 'Fix leaning die' flag should have fired. Try to reproduce with repeated Yacht rolls and a log of die value vs scored value; add a self-check that warns when the read face and the visible top face disagree. Hotfix candidate for 4.0.1 if reproducible.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner hypothesis (2026-11-18): a non-saved (not held) die got bumped by another die after the roll was read, and was not re-counted. Check: a settled die disturbed by a later collision or held-die release changes its top face after scoring values were captured; scoring should re-read all dice at score time (or re-run the settle check when any die moves after settle). Add a spec that nudges a settled unheld die and expects the read value to update.

Hotfix lane findings (4.0.1, 2026-11-18): NO FIX MADE; could not reproduce. Method: 180 seeded rolls (90 Yahtzee, 90 Farkle) simulated to settle, then 1500 further physics steps (what the live loop does after settle), comparing the read top face of every die before and after. Result: no die that was not flagged leaning ever changed face after settle (0 of 180 rolls); 16 rolls ended with a lean flag, and a leaning die that later falls onto a face does change (e.g. 6 to 2), but that path is already handled: game scoring waits while any lean is flagged (gameOnSettled returns early) and refreshLeans() calls finishRoll() when the lean clears, which re-reads all dice. There is no user path that moves settled dice (die dragging exists only in the showcase, not the roll view), and holds only restore held dice, followed by a full re-read. So the owner's hypothesis (an unheld die bumped after the roll was read) has no source in the current code. Most likely reading of the symptom: a leaning/cocked die displaying a face of 6 (orange ring + Fix chip) that was not scored because scoring correctly waits for the lean to clear. Suggested for 4.1 if it recurs: the self-check from the card (log read face vs scored value, warn on disagreement) and the exact roll context (game, die count, whether the chip was showing).

Owner 2026-11-19: add the self-check as a backup. Before a score/total is taken (and after settle), compare each die's read face with its stored value; if they disagree re-read the die, log a console warning/diagnostic, and use the re-read value. Keep the unreproduced report open as a watch item. Queue after PD-173 lands (same files).
<!-- SECTION:NOTES:END -->
