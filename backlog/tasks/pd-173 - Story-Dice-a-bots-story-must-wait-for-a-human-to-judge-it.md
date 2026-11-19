---
id: PD-173
title: 'Story Dice: a bot''s story must wait for a human to judge it'
status: To Do
assignee: []
created_date: '2026-11-19T22:14:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 366000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner comment on v4.1 Dev artifact 2026-11-19: with a bot player in Story Dice, the bot's story should not advance automatically; the game waits for a human to judge (accept/reject or rate) the bot's story before moving on. Look at games/story.js, games/bots.js (storyMove) and the judging step in src/main.js; make the judge step block on human input for bot turns, with a clear prompt.
<!-- SECTION:DESCRIPTION:END -->
