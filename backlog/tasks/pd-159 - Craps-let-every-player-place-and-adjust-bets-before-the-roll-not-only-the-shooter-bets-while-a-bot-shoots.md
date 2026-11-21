---
id: PD-159
title: >-
  Craps: let every player place and adjust bets before the roll, not only the
  shooter (bets while a bot shoots)
status: Done
assignee: []
created_date: '2026-11-19T07:18:00Z'
updated_date: '2026-11-19T19:50:00Z'
labels:
  - v4.1
dependencies: []
priority: medium
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner live playtest, 2026-11-18 (filed for later): in Craps all players should be able to adjust their bets before the game moves on. Playing against a bot is not pleasant because the human cannot bet during the bot's turn (the bot is the shooter, so the human has no betting window). Wanted: a betting window before every come-out and point roll in which every seated player (human or bot) can place, change or remove bets, with a clear Ready/Roll step so the shooter does not roll until bets are set; bots place their bets in the same window; human can keep betting while a bot shoots. Check the engine's bet-lock rules (which bets may be changed after the point is set, odds, come bets) and the table UI on phone. 4.1, not 4.0.x. Note: the owner wrote 'bat'; read as 'bot'.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
4.1 implementation: the engine already let any seat bet; the gap was the UI. Bets now default to the first human while a bot shoots; a bot shooter places its bets then waits (crapsHold) for a Ready button in the dock (hint 'Place your bets, then Ready'); the human shooter's Roll is its own Ready. All-bot tables skip the wait. Bet-lock rule unchanged (no betting while dice roll). Specs: tests/craps-bet-window.spec.mjs (desktop, phone, all-bot). Hotseat-with-bots and the phone panel layout of the Ready step are only checked headlessly.
<!-- SECTION:NOTES:END -->
