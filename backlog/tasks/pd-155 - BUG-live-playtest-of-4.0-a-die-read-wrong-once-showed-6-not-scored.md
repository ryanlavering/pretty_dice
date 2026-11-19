---
id: PD-155
title: 'BUG (live playtest of 4.0): a die read wrong once (showed 6, not scored)'
status: To Do
assignee: []
created_date: '2026-11-19T02:39:00Z'
updated_date: '2026-11-19T03:29:00Z'
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
<!-- SECTION:NOTES:END -->
