---
id: PD-157
title: >-
  BUG (live playtest of 4.0): a bot's roll with a leaning die gets stuck; the
  bot should apply Fix leaning die immediately
status: Needs Review
assignee: []
created_date: '2026-11-19T03:29:00Z'
updated_date: '2026-11-19T05:41:00Z'
labels:
  - v4.1
milestone: m-2
dependencies: []
priority: high
ordinal: 353000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner live playtest, 2026-11-18: when a computer player rolls and a die is leaning, the game gets stuck. Expected: the bot immediately applies the re-roll-leaning action (the same as the human 'Fix n leaning dice' chip) and continues its turn. Check the bot turn driver for a wait on settled dice that never ends when a leaning flag is set; also check bots that hold dice (held dice leaning?) and the last-roll-of-turn case. Add a spec with a forced leaning die during a bot turn (Yacht and Ten Thousand/Farkle). Hotfix candidate for 4.0.1 (owner decides; related PD-154, PD-155).
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
4.0.1 hotfix (lane v4-hotfix). Cause: gameOnSettled() returns early while any die is flagged leaning and gameAwaiting stays true; botPump/botStep bail on gameAwaiting, and only the human chip calls rerollLeans(), so a bot's turn never continued. Fix: in gameOnSettled, if a lean is flagged and it is a bot's turn (botLock()), setTimeout(rerollLeans,0). Same path as the chip, so held/leaning behaviour is unchanged. Spec: tests/hotfix-401.spec.mjs (Yahtzee and Farkle, a die pinned propped on another).
<!-- SECTION:NOTES:END -->
