---
id: PD-143
title: >-
  IDEA: Big screen mode (TV/projector table view, linked to players' own
  devices)
status: To Do
assignee: []
created_date: '2026-11-14T01:39:00Z'
labels:
  - idea
  - games
  - network
  - later
dependencies: []
priority: low
ordinal: 184000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea 2026-11-13 (not scheduled; v5 candidate, idea only).

Big screen mode: the app is projected or cast to a large screen (TV, projector, shared screen) and the game mat shows the whole table: multiple bags / players / scorecards at once, large dice and chips, a spectator-friendly layout (big readable status, whose turn, bets on the Craps table, scores).

Optionally linked to the players' own devices (network mode): each player's phone shows their own dice/bag/hand and controls, plus an inset picture-in-picture strip of the other players (Zoom-participant style tiles: their last roll, score, bankroll) so people at a distance see everyone; the big screen is the shared table. Hidden information (Liar's Dice) stays on the owning device only.

Open questions to research later: transport and pairing (room code / QR on the big screen, WebRTC peer-to-peer vs a small server; v4 has no server), what runs the physics (one authority, e.g. the big screen, streaming dice results vs every device simulating from a shared seed), layout rules for 16:9 and 4K, a remote-less mode (big screen as a pure display of one device's table), accessibility and font sizes at a distance.

Related: PD-142.26 (networked multiplayer research), PD-142.17 (hidden information, engine viewer rule already supports per-player redaction), PD-142.30 (shared panel layout), roadmap sections on table sessions (v5) and stream/VTT overlay.
<!-- SECTION:DESCRIPTION:END -->
