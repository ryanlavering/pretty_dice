---
id: PD-185
title: >-
  Judge's ruling: amend or strike any roll in the log, and the game proceeds
  with the result
status: To Do
assignee: []
created_date: '2026-11-20T07:04:00Z'
labels:
  - v4.3
dependencies: []
priority: medium
ordinal: 378000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (2026-11-20), as a safety net if anything goes wrong mid-game (PD-155 bad read, accidental flick when passing the phone, etc.).

Design sketch:
- The roll log gets a (normally hidden) edit control per roll, exposed by ONE lock/unlock toggle at the top of the log. Anyone may act as judge.
- Per roll, two actions: AMEND the roll's score/values, or STRIKE it from the record. Strike has two forms: strikethrough with an OPTIONAL justification, or expunge with a MANDATORY explanation.
- The log always carries a visible record that an edit/delete happened (what it was, what it became, who/when if known, the justification). Nothing disappears silently.
- The game proceeds with the edited/removed result where that is possible: typically games whose scoring reviews the log (cumulative scoring); and the special case of deleting the LAST roll (undo), which we should look at supporting for most games (accidental flick when passing the phone, etc.). Games where the result cannot be recomputed from the log should say so rather than pretend.
- Related: Yacht Whoopsie (PD-156) is the existing narrow undo; the judge's ruling generalises it.

Open questions for the design pass: how each game engine replays or recomputes from an amended log; multiplayer turn state after striking the last roll; persistence/export of the ruling record; whether bots may be affected; golden/log format versioning.
<!-- SECTION:DESCRIPTION:END -->
