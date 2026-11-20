---
id: PD-184
title: >-
  Story Dice: no dangling "Judge 's story" when the name is blank; mat sentence
  cut off on mobile
status: To Do
assignee: []
created_date: '2026-11-20T06:21:00Z'
labels:
  - v4.1
dependencies: []
priority: high
ordinal: 377000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner (2026-11-20), on PD-181: (1) if the player/bot name is blank, do not show a dangling "Judge 's story" (use e.g. "Judge this story" or the bot's default name). (2) The story sentence drawn on the mat (.ssent, src/storyui.js) was cut off twice on mobile: move it upward and give room for at least one more line, better two (allow wrapping to 2 lines without clipping, portrait and landscape phone).
<!-- SECTION:DESCRIPTION:END -->
