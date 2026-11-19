# Story dice spike (PD-160)

What exists, what was learned, what is left. Spike date 2026-11-19, branch v4.1.

## What is built

| Piece | File | State |
|---|---|---|
| 154 monochrome glyphs as SVG paths (101 common, 40 oddball, 13 out-of-style) with noun/adjective/adverb/verb banks | `scripts/story-glyph-manifest.txt` -> `scripts/build-story-glyphs.mjs` -> `src/story-glyph-data.js` | done |
| Seeded deal (fingerprint -> shuffled pool -> consecutive runs, unique across every face) | `src/story.js` `fingerprint`, `dealGlyphs` | done, tested |
| Sentence generator (1-, 2-, 3-glyph clause patterns, connectors and/but/so/then/until/or maybe, openers and closers) | `src/story.js` `sentenceFor`, `hintFor` | done, tested |
| Ring arrangement model (click-fill in order, drag with autoswap, bump to pool) | `src/story.js` `newArrangement`, `fillNext`, `dropDie`, `removeDie`, `poolOf`, `complete` | done, tested |
| Glyph labels in the numeral atlas (same bump + paint-mask passes, so enamel fill works as for numerals) | `src/atlas.js` (label object `{path}`) | drawn, not yet wired to a die |
| Standalone demo: roll, sweep to a pool row, rings 1..n, click or drag, sentence, hints, glyph sheet | `tools/story-dice-spike.html` (`/tools/story-dice-spike.html`) | working, DOM tiles not 3D |
| Tests | `tests/story-dice.spec.mjs` (model, @quick), `tests/story-dice-ui.spec.mjs` (page) | pass |

Set `STORY_SHOT=<dir>` when running the UI spec to keep screenshots.

## Glyph source: choice and licences

**Base style: Noto Emoji monochrome** (Google Fonts `notoemoji`, SIL OFL 1.1, Unicode glyphs). One consistent outline style, covers everyday picture-book nouns (animals, food, weather, buildings, tools, vehicles) and the oddballs (UFO, alien, radiation, biohazard, skull, ghost, robot, volcano, comet). Outlines are embedded as paths; OFL allows this with the notice kept in `src/story-glyph-data.js` and the licence text shipped with the app (TODO: add `OFL.txt` to `vendor/` or a credits page).
**Out-of-style set: DejaVu Sans symbols** (chess knight and queen, fleur-de-lis, scales, yin-yang, command key, hexagram...). These are Unicode glyphs from a common font (Bitstream Vera licence plus public-domain additions) and visibly differ in weight and detail, so they read as "special" faces. Rendered tinted in the demo to show the tier.

Word lists are my own, written in the style of Dolch / Fry sight-word picture-book vocabulary (nouns and verbs a child would use), not copied from any list.

Considered and not used (from memory, not re-verified this session, check before relying on them):
- OpenMoji black-and-white: CC BY-SA 4.0, share-alike obligation on the art.
- ARASAAC, Sclera: pictogram sets built for learning to read, but non-commercial licences.
- Mulberry Symbols: CC BY-SA 2.0.
- game-icons.net: CC BY 3.0, many styles (could supply a few deliberately off-style "rare" faces with attribution).
- Public-domain-only options (old clip-art collections) have inconsistent styles, which is why a single OFL font won.

## Findings

- The style holds together: the sheet (all 154 glyphs) reads as one set, and the DejaVu ones stand out without looking broken. A few glyphs (atom, charm, poop, hole) are solid shapes with cut-outs rather than outlines, which will paint as heavier blobs of enamel; fine as "special" faces, review on a die.
- Size: 505 KB raw, about 184 KB gzipped. Too heavy to inline in `index.html`; load the module only when a story set is first used. Coordinates are 0.1 precision; rounding harder or simplifying paths would roughly halve it.
- Pool is 154, so the largest set is 154 faces (nine d12 = 108, three d20 = 60, nine d20 is refused with a message). A bigger pool needs more manifest lines only.
- Sentences are good enough: they read as odd-but-plausible, and the same arrangement always gives the same text (re-word button changes the salt). Weak spots: some nouns are abstract ("glance", "wish"), mass nouns take "a" ("a merry music"), compound subjects after a connector can feel run-on. All are word-bank edits.
- Ring order matters to the text (tested), so ordering is the player's real choice.

## Not done (needed for the real feature)

1. **Die faces**: wire glyph labels through `assignLabels` / `buildDice` so a custom set paints glyphs on real 3D faces. Roll reading currently maps a face to a number; a story die needs face index -> glyph id. The filigree-big branch of `makeAtlas` measures `String(label)` and needs a glyph case. Check d4 (tips layout) and d6 (pips) specially: glyphs probably should override those layouts.
2. **Set definition**: a "story set" in the bag (`sets[].terms` plus a `story: true` flag and optional name salt); fingerprint from the set so the same set looks the same everywhere. The spec's `custom:x(:face(randomized_glyphs[x*face]))` notation maps to `dealGlyphs`; decide whether it becomes real roll notation or stays a set type.
3. **Mat flow in 3D**: after the roll settles, sweep dice (animate without physics) to a pool at the mat edge, show rings 1..n mid-mat, click to fill, drag to rearrange (autoswap setting), fire the sentence. The demo proves the model and timing; the 3D version needs input handling that coexists with the throw/flick gestures.
4. **Bot**: show per-glyph hints, speak the generated sentence, offer re-word.
5. **Credits and licence text** for the font outlines; decide lazy loading for the 184 KB data.
6. **Word-bank review** pass by the owner (the 154 entries are first drafts).
