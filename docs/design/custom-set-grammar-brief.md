# Brief: custom set formula grammar (for the design agent)

Status: brief, 2026-11-19. Written so a fresh agent can start without the Story Dice session history.
Deliverable: `docs/design/custom-set-grammar.md` (a design, not code). Do not edit `src/` or `games/`.

## Why
Owner (2026-11-19, after playing the Story Dice prototype): "How do I get story dice in non-story mode? We need to build out the design infrastructure and a custom set formula grammar so the story dice set can be expressed outside of the game. The game only adds logic and scoring to a set of dice anyone could construct and play on their own. Another card has ideas on the grammar. Get it right from the first; we need an expressive grammar without painting ourselves into a corner."

## What exists (read these, in this order)
1. `docs/design/roll-triggers.md`: the roll-language draft. Pipeline phases (setup, die, pool, total, result), `:trigger(action)` clauses, shorthand/longhand "same model, two spellings" rule, `$name` variables, round-trip test. Card PD-142.42 (+ .1-.5). **The new grammar must be a compatible extension of this, not a second language.**
2. `src/main.js` `parseNotation` (line ~96) and `fmtNotation` (~120): the live parser. Terms are `{count, sides, design?, keep?}`, `group`, `mod`; `@design` refs a bag design; `Nx` group prefix; `adv`/`dis`/`kh`/`kl`/`dh`/`dl`.
3. `docs/design/design-format.md`: design and bag JSON (version 1, `sets[].terms` refer to designs by id, `characters`/`jail` reserved, a version bump is planned for characters). Bag model: `src/bagmodel.js`.
4. Card PD-127 (Custom faces): face labels as text/glyphs/images, per-face role flags (wild), playing-card faces (A K Q J 10 9) with result as a face id/symbol that games and notation can match.
5. Story Dice spike: `docs/design/story-dice-game.md`, `docs/design/story-dice-spike.md`, `src/story.js` (`fingerprint`, `dealGlyphs`, `poolFor`), `src/story-packs.js` and `src/story-pack-*.js` (glyph packs: id, name, license, glyphs with nouns/adjectives/adverbs/verbs, SVG path, viewBox), `src/atlas.js` (a label object `{path, vb}` paints like a numeral), `main.js` `storyDeal`, `specsFor`, `buildDice` (glyph labels per die), `games/story.js`.
6. Owner's original sketch of the set, for the Story Dice idea: `5x d12custom:x(:face(randomized_glyphs[x*face]))`: five d12, each face filled from a pre-scrambled stable list of glyphs seeded by the set fingerprint, unique across all dice.

## Requirements to satisfy
- A set of dice (3-9 in Story Dice, any shapes, mixed designs) whose faces come from named sources: numbers, text, glyph packs, images later, hand-written per-face lists, and **generated deals** (seeded shuffle of a pool, unique across the set or per die).
- The set must be expressible and playable in normal (non-game) mode, in the quick-roll box, the set editor, and the bag file. The game then references a set and adds rules (arrangement, rating).
- Roll results must be face ids/symbols, not only numbers: games, tables, and notation need to match them (hand ranking, glyph words). Numeric faces keep working exactly as today; keep/drop/adv/dis/reroll still apply to numeric dice.
- Seeding: the same set text gives the same faces on every device. State what is hashed (set text, pack ids, seed number, set name).
- Packs are plug-ins chosen by name; a set must say which packs it needs and fail clearly if one is missing. Licence info travels with a pack.
- Shorthand and longhand, round-trip equivalence, normal form, and error messages per `roll-triggers.md`.
- Reserve space (do not implement) for variables `$name`, traits, chains, and per-face flags such as wild.
- Backward compatible: every notation string that parses today still parses to the same model; saved bags keep loading (describe the version bump and migration).
- Hostile or accidental input: size caps (dice count 24, faces per die, glyphs per pool), no code evaluation.

## Questions the design must answer
1. Where do face definitions live relative to `:trigger(action)` clauses? (The owner's sketch uses `:face(...)` for definition, but `roll-triggers.md` already uses `face<cond>` as a trigger. Pick names that cannot collide.)
2. A deal as a first-class expression versus a function call: how are `randomized_glyphs`, `x*face` indexing, `unique`, seed, and packs written? Can a user write the Story Dice set by hand? What is the short form for the common case ("5 story dice from noto, set 1")?
3. Per-die versus per-set scope: how does one die know its slot in the deal (die index `x`, face index `face`)? How does the grammar stay declarative (no loops, no eval) yet expressive?
4. The model: what data structure does the parser produce, how does it extend `{count, sides, design, keep}`, and what is stored in the bag file (text only, model only, or both)?
5. How a result is represented and matched (`face id` vs label vs value), and how the roll log, copy/save text, and the games engine consume it.
6. Where a die's look (design) ends and its face content begins: can one design have different face contents in different sets? (Today a design is a look; a set refers to designs by id.)
7. Anything in the existing grammar draft that should change now because this exposes a flaw. Say so plainly, with the cost.

## Deliverable shape
- Short problem statement and the chosen principles.
- The grammar (EBNF or equivalent) with ten or more worked examples: today's notation unchanged, advantage, a playing-card d6, a hand-listed custom d6, the Story Dice set in short and long form, a mixed set with two designs, one example with a reserved `$variable`.
- The internal model and bag-file change (version, migration, what old readers see).
- Round-trip and normal-form rules; the list of error messages.
- What stays reserved, and why that cannot paint us into a corner.
- A slicing plan for implementation: ordered small steps each shippable and testable, with the first slice being "Story Dice set usable in non-game mode" (with its test list). Mark which steps touch `parseNotation`.
- Risks and alternatives rejected, one line each.

Keep the document under about 250 lines. Verify claims against the source rather than the older docs.
