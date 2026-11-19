---
id: PD-127
title: Custom faces
status: To Do
assignee: []
created_date: '2026-11-12T17:54:00Z'
updated_date: '2026-11-18T19:40:00Z'
labels: []
dependencies: []
ordinal: 131000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the ability to fully customize face glyphs
- All under advanced options
- Full font support (including bring your own?) + font styling (bold, italic, etc.)
- Full unicode glyph support
- Custom image glyphs (SVG, JPG, PNG, etc.) 
- Totally off the wall, but would it be possible to use animated GIFs as face glyphs? Would simulate a die with a tiny LED screen embedded in the face. (Example usage: A flashing "#1" GIF for Nat1 as a joke.
- True depth rendering (not bump map)
- Deep inset / extrusion (with warning if extrusion projects beyond edges, affecting flatness)
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner idea 2026-11-18 (use case / acceptance example, v4.1 or later): a d6 with playing-card faces: Ace (one), King (K), Queen (Q), Jack (J), 10 (10-spot) and 9 (9-spot); the 9 could also be a Joker/Wild face. Enables poker-like dice variants (Poker Dice, Liar's Dice style hands, see PD-142.23 research on data-driven scorecards incl. Poker Dice). Requirements it implies: face labels that are text/glyph symbols (A K Q J 10 9), not only numbers or pips; per-face role flags (wild); roll result as a face id/symbol that games and notation can match (e.g. hand ranking), and a shared label layout on the number atlas (PD-26 size balancing) that fits 2-char faces like '10'. Labels v4.1+.
<!-- SECTION:NOTES:END -->
