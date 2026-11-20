---
id: PD-181
title: 'Story Dice: lock the dice once a story is submitted for judging'
status: Needs Review
assignee: []
created_date: '2026-11-20T05:01:00Z'
updated_date: '2026-11-20T05:32:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 374000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (2026-11-20): while judging a bot's story the dice can still be moved around the mat; they should be locked as soon as the bot submits for judgement. For human players, judging likewise locks the dice in place until the next roll. Applies to the story tray drag handling in src/storyui.js and the rate phase in games/story.js. Queue after the v41-fix2 lane (PD-179/180) to avoid conflicts in src/main.js.
<!-- SECTION:DESCRIPTION:END -->

Owner clarification (2026-11-20): a HUMAN story must not lock the moment the dice fill the rings. It stays editable (dice can be rearranged) until the player submits it for judgement. Lock only at submission (bot: when its story is submitted; human: when they submit), then keep locked until the next roll.
