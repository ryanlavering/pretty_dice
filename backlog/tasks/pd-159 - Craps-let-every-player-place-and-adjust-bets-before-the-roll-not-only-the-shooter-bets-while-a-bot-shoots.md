---
id: PD-159
title: >-
  Craps: let every player place and adjust bets before the roll, not only the
  shooter (bets while a bot shoots)
status: To Do
assignee: []
created_date: '2026-11-19T07:18:00Z'
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
