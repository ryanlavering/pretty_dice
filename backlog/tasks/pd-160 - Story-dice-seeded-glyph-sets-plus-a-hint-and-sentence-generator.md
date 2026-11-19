---
id: PD-160
title: 'Story dice: seeded glyph sets plus a hint and sentence generator'
status: Needs Review
assignee: []
created_date: '2026-11-19T08:21:00Z'
updated_date: '2026-11-19T20:15:00Z'
labels:
  - feature
  - v4.1
milestone: m-2
dependencies: []
priority: low
ordinal: 356000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New game. A set of 3-9 dice of any shape whose faces are filled from a pre-scrambled, stable pool of glyphs, seeded by the set fingerprint (e.g. 5x d12 with custom:x(:face(randomized_glyphs[x*face]))). Every glyph is unique across the whole set. Roll, arrange the dice in an order that makes sense, tell a story from the glyphs.

The bot gets a hint per glyph (a few nouns, adjectives, adverbs, verbs) and a simple sentence generator: a preset series of patterns joined by simple grammar rules (and, or, but, ...). Output only has to be plausible at surface level. No gimmicks: two overlaid random picks from small pools is good enough for infinity for most users, and those who see the trick will not mind.

## UI proposal (owner, 2026-11-19)

Choosing and ordering the dice needs new UI:
- After a roll, the dice are swept (not rolled away) from the middle of the mat to make room for a row of rings 1..n.
- The player clicks the swept dice in order to fill them into the rings.
- Filled dice can be rearranged by dragging; autoswap enabled (dropping on an occupied ring swaps the two).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Set of 3-9 dice, any shape; glyph assignment is deterministic from the set fingerprint, unique across all faces
- [ ] #2 Each glyph carries a small word bank (nouns, adjectives, adverbs, verbs); bot can show hints for the rolled glyphs
- [ ] #3 Sentence generator: preset patterns plus connectors (and, or, but); reads plausibly from the dice in arranged order
- [ ] #4 After a roll, dice sweep to the side without rolling away; rings 1..n appear; clicking dice fills rings in order; drag to rearrange with autoswap
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Spike 2026-11-19: glyph packs (5, 443 glyphs), seeded deal, sentence generator, real 3D glyph dice, Story Dice game in the Games table (ring tray, hints, bad/fair/good rating). Decisions and gaps: docs/design/story-dice-game.md. Worktree pretty_dice-story, branch story-dice-spike. Artifacts: playable https://claude.ai/artifact/8z5hMjPSZAK8pxr5M47i6L, glyph dice https://claude.ai/artifact/BubM2F4kfPn9Puoe7SpMsj

Merged into v4.1 (Merge story-dice-spike (PD-160) into v4.1); full regression run on the merge.
<!-- SECTION:NOTES:END -->

## Notes 2026-11-19
3D arrangement view, hi-vis option, story order in roll log committed on branch story-dice-spike; grammar design in docs/design/custom-set-grammar.md; follow-up PD-161 (custom glyph controls).
