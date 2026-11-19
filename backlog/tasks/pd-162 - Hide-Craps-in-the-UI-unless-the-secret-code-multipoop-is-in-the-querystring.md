---
id: PD-162
title: Hide Craps in the UI unless the secret code ?multipoop is in the querystring
status: Review Complete
assignee: []
created_date: '2026-11-19T17:42:00Z'
updated_date: '2026-11-19T19:50:00Z'
labels:
  - feature
  - v4.1
dependencies: []
priority: high
ordinal: 357000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Craps may be regulated in some places. Keep all Craps logic and code in place, but hide it from the UI (Games list, resume, setup) unless ?multipoop is present in the URL. Not security, just keeps casual users and kids away. Remembered for the browser session so reloads and resume keep working.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Gate in src/main.js (SECRET_GAMES/secretOn, keptGames): ?multipoop unlocks Craps, remembered in sessionStorage. Test helper and ui-audit pass it by default; tests/craps-secret.spec.mjs covers hidden and unlocked. 55 related specs pass. Open: docs/guide/10-games.md and README still name Craps publicly.
<!-- SECTION:NOTES:END -->
