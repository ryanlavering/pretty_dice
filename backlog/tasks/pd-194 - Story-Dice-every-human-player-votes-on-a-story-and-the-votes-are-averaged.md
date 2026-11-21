---
id: PD-194
title: 'Story Dice: every human player votes on a story and the votes are averaged'
status: To Do
assignee: []
created_date: '2026-11-20T20:10:00Z'
labels:
  - v4.2
dependencies: []
priority: medium
ordinal: 387000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (2026-11-20), for 4.2: instead of one judge rating, ALL human players (other than the teller, or including? decide) get a vote on each story and the points are the average. Builds on the five rating buttons (0/3/5/7/10, PD-192). Questions for the design pass: does the teller vote on their own story (probably not); pass-the-device flow for collecting votes (hidden votes then reveal, or sequential); rounding of the average to a score (nearest whole point; show decimals?); bots (do bots vote? the PD-173 rule says a bot's story waits for a human grade: with several humans, all must vote); solo play (no voters: self-rating or none); engine change in games/story.js (rate action per voter, tallies in saved state, resume of a half-collected vote); scoreboard/result wording; tests for 1, 2, 3+ humans.
<!-- SECTION:DESCRIPTION:END -->
