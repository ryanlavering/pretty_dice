# Story Dice: game prototype (PD-160)

Spike worktree `pretty_dice-story`, branch `story-dice-spike` (from v4.1). Owner asked for a playable prototype 2026-11-19; decisions below were made without the owner present and are open to change.
Companion: `story-dice-spike.md` (glyph and sentence findings).

## How it plays

1. Games -> Story Dice. Pick 1-6 players, dice (3-9), faces per die (d6, d8, d12, d20), stories each, a set number, word hints on or off, and which **glyph packs** to deal from.
2. The active player rolls (real 3D dice, glyphs painted in enamel like numerals).
3. The dice are swept off the mat into a tray: a pool row at the bottom and rings 1..n above. Click dice in story order to fill the rings, or drag them (autoswap swaps two filled rings; clicking a placed die returns it to the pool). Autoswap is a checkbox, on by default.
4. When every ring is filled the panel shows the bot's sentence (a prompt, with Re-word) and, if hints are on, each glyph's nouns, adjectives, adverbs and verbs.
5. The player tells their own story out loud. The table then enters **Bad (0), Fair (1) or Good (2)**. The turn passes. After the set number of stories each, the highest total wins (ties share rank 1).

## Decisions made while building

| Topic | Decision | Why / how to change |
|---|---|---|
| Scoring | Manual rating, bad 0 / fair 1 / good 2, one rating per story from the whole table | Owner: manual points, simple rating. Mapping is `RATINGS` in `games/story.js`. A future rule could let each listener rate and average, or let the teller earn bonus points for using hints. |
| Who rates | The table agrees on one button press (solo: the player rates themselves) | Simplest for one shared device. |
| Game length | Each player tells `rounds` stories (default 2) | Short sessions; option 1-10. |
| Players | 1-6; solo is a practice/play-for-fun mode | Matches other games. No bots (`noBots` hides the Bot checkbox): a bot cannot tell a story. |
| The bot's role | Shows its sentence and per-glyph hints; never scores | Owner: bot gets a hint per glyph and a simple sentence generator. |
| Faces | d6, d8, d12, d20 only | Labels 1..N map to face index. d4 (corner-number layout) and d10 (0-9 labels) deferred. Glyph dice ignore the d6 pip layout. |
| The set | Faces are dealt from a shuffle seeded by the set fingerprint: `story2|set<seed>|<sorted pack ids>|<faces per die>` | Same options give the same dice on every device and after a reload. Change the **Set number** for a different deal. Pack order does not matter. |
| Uniqueness | Every face of every die has a different glyph. Pool must hold dice x faces glyphs; setup disables Start and says so when it does not | 5 x d12 = 60 needs 60 glyphs; the default pack has 141. |
| Packs | Chosen a la carte at setup (default: Everyday pictures). Any mix; the pool is the union | See table below. |
| Word banks | Hand written for the Everyday and Unicode packs; the others take their noun from the glyph's name and frozen seeded picks from shared category pools (`scripts/story-category-words.mjs`) | Fast to extend; quality is "plausible", owner review pending. |
| Tray | DOM tiles over the mat (glyph on a coloured tile), not the 3D dice | A 3D sweep and rings (physics-free animation of the real dice) is the follow-up. The 3D dice are hidden while the tray is up and return on the next roll. |
| Sentence | Same arrangement and re-word number give the same text; ordering matters | `sentenceFor` in `src/story.js`. |
| Saving | The engine state (including options) is plain JSON like other games; a resumed game re-deals the same glyphs | `gsaveGame` unchanged. |
| URL | `?game=story` opens the Games setup on Story Dice | Used by the shared artifact. |

## Glyph packs

Pulled everything usable (six packs); all are safe to share with credit (the owner chose "shared, safe packs only"). Packs are plug-ins: a manifest in `scripts/story-packs/` or `scripts/story-glyph-manifest.txt`, built by `scripts/build-story-packs.mjs` into `src/story-pack-<id>.js`.

| Pack | Glyphs | Licence | Source |
|---|---|---|---|
| Everyday pictures (`noto`) | 141 (101 common, 40 oddball) | OFL 1.1 | Noto Emoji monochrome |
| Unicode symbols (`symbols`) | 13 | Bitstream Vera / public domain | DejaVu Sans |
| Memes (`memes`) | 48 | OFL 1.1 / Bitstream Vera | Meme-staple emoji from Noto Emoji (moai, clown, melting face, stonks, doge, eyes, sus...) plus text memes typeset in DejaVu Sans Bold (F, L, GG, 404, XD, UwU, OwO, table flip) |
| Fantasy and adventure (`gameicons`) | 121 | CC BY 3.0 | game-icons.net (Lorc, Delapouite and others) |
| Plain icons (`fontawesome`) | 119 | CC BY 4.0 | Font Awesome Free solid |
| Hieroglyphs (`hiero`) | 49 | OFL 1.1 | Noto Sans Egyptian Hieroglyphs (descriptions hand-assigned from the Gardiner list; check) |

Memes: the famous meme images (Distracted Boyfriend, Grumpy Cat, Doge photo, Trollface and other rage comics) are copyrighted photos or art and do not survive monochrome, so the pack uses emoji and typeset text only. Pepe is left out on purpose. Wide text such as a shrug kaomoji came out too small on a square face and was dropped; the table flip is set on two lines. Hand-drawn original meme icons would be the next step if more are wanted.

Not pulled, and why: OpenMoji (CC BY-SA 4.0, stroke-based multi-element SVGs, not a single fill path), ARASAAC, Sclera and Mulberry (coloured pictograms, and non-commercial or share-alike licences). A credits screen listing each pack's `credit` string is still to do; the strings are in every pack file.
Missing from the first wish list (not found under that name in game-icons): kraken, phoenix, yeti, hot-air-balloon, pickaxe, shovel, wand; Font Awesome `ladder-water`.

## Known gaps

- All packs are bundled into the main script (about 1 MB raw, roughly 300 KB gzipped). The single-file builds can only inline static imports, so lazy loading needs a build change. Fine for a spike.
- Glyph size on the die is set by the atlas fit, not by the glyph; the Numbers size slider scales it. Dense glyphs (game-icons) read small on d20s.
- Mobile layout of the tray and panel was not tuned; the existing phone strip shows the status line.
- 3D sweep/rings, per-listener rating, a credits screen, and word-bank review are the next steps.
