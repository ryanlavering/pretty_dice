# Custom set grammar: face blocks and deals (proposal)

Status: proposal for owner review, 2026-11-19. Brief: `custom-set-grammar-brief.md`. Extends the roll language in `roll-triggers.md` (PD-142.42); touches PD-127 (custom faces) and PD-160 (Story Dice).
Checked against the source: `parseNotation` / `fmtNotation` (`src/main.js` ~96-120), `fingerprint` / `dealGlyphs` / `poolFor` (`src/story.js`), `makeStoryDeal` (`src/main.js` ~2071), `loadBag` version check (`src/bagmodel.js` line 24). `r1` and triggers are not implemented yet; only today's notation is live.

## Problem

Story dice exist only inside the game: `makeStoryDeal` builds a global `storyDeal` from game options, and `specsFor` paints it onto whatever `state.notation` holds (`5d12`). Nothing in the notation, the set, or the bag says "these dice have glyph faces". The owner wants a set anyone can build and roll in normal mode; the game should only add arrangement and rating on top.

So a set must be able to say, per dice term, **what is on the faces**, including generated deals that are the same on every device, and roll results must be face symbols that tables, games and triggers can match.

## Principles

1. **One language.** Face content is a new part of a dice term, beside `@design` and `kh`. Triggers stay `:trigger(action)`. No second notation.
2. **Faces are content, not behaviour.** A face definition is not a trigger and never uses the `:name(...)` slot. Triggers react to rolls; face blocks say what the die *is*.
3. **Declarative.** No loops, no index arithmetic, no eval. The sketch's `x*face` indexing becomes a named deal mode.
4. **The design is the look; the set holds the faces.** One design can carry numbers in one set and glyphs in another.
5. **Numbers are a face source like any other** (the default). Every string that parses today parses to the same model.
6. **Same model, two spellings, round trip** (from `roll-triggers.md`) applies to face blocks too.

## Decisions at a glance

| Question | Recommendation |
|---|---|
| Where face definitions live | A **face block** `{...}` right after `NdS` and its keep, before `@design`: `5d12{noto#1}@bone`. Not a `:` clause. |
| The `face<cond>` collision | Rename the die-phase trigger from `face<cond>` to **`shows<cond>`** (`:shows1(reroll)`, `:shows=A(...)`). It is a draft name only, so the rename is free today. The word "face" is kept for content. |
| The `x` collision | The sketch's `x` (die index) collides with `Nx` and the `:x(4)` longhand. Index variables are **not** exposed; deal modes replace them. Note `5x d12` today means five separate rolls of one d12; the story set is `5d12`. |
| Deal: expression or call | A **source expression** inside the face block. Shorthand is a pack name (`{noto#1}`); longhand is `deal(...)` with every option spelled out. |
| Scope | A deal is shared by **every term in the set with the same deal identity** (packs + seed + mode). Dice take consecutive runs in term order. Unique across the set by default. |
| What is hashed | Deal identity only: `pd-deal1|<sorted pack ids>@<pack revs>|<seed>`. Not the set name, not design ids, not the dice list. |
| Stored in the bag | The model (terms with `faces`), plus a `requires.packs` list. Text is printed from the model. |
| Results | Each die result is `{i, value?, id, label}`: `i` the face index (1..n), `id` the stable symbol (`A`, `noto:cat`, `7`). Matching uses `id`; totals use `value`. |

## Grammar

EBNF, extending `roll-triggers.md`. Keywords are case-insensitive; face labels keep their case (see "Flaws exposed"). Whitespace is free outside quotes.

```
roll        = [ group ] set { ":" trigger [ "(" action ")" ] } ;
group       = int ( "x" | "×" ) ;                         (* unchanged: 4x d20+2 *)
set         = term { ( "+" | "-" ) term } ;
term        = dice | int | var ;
dice        = [ int | var ] "d" ( int | "%" ) [ shorthand ] [ facesblk ] [ "@" ident ] ;
shorthand   = keep | "adv" | "dis" | reroll ;            (* reroll = r1, r<3 (Phase 1) *)
keep        = ( "kh" | "kl" | "dh" | "dl" ) [ int ] ;

facesblk    = "{" source "}" ;
source      = list | named | deal ;
list        = face "," face { "," face } ;                (* 2+ entries: a literal list *)
named       = ident [ "#" int ] [ modeflag ] ;             (* 1 entry: a preset or a pack *)
deal        = "deal" "(" packs { ";" dealopt } ")" ;
packs       = ident { "&" ident } ;
dealopt     = "seed" "=" ( int | var ) | "mode" "=" mode ;
mode        = "unique" | "each" | "repeat" ;
modeflag    = "!" mode ;                                   (* {noto#1!each} *)

face        = label [ "=" number ] { "!" flag } ;          (* value and flags: reserved, see below *)
label       = word | quoted | glyphref ;
glyphref    = ident ":" ident ;                            (* noto:cat *)
word        = ( letter | digit ) { letter | digit | "_" } ;
quoted      = '"' { char - '"' } '"' ;
flag        = ident ;                                      (* wild; reserved *)

trigger     = "adv" | "dis" | "nat1" | "nat20" | "shows" cond | "total" cond
            | "pool" | "x" | "hit" | "miss" | "crit" | "if" "(" var ")" | ... ;
cond        = int | ( "<" | "<=" | ">" | ">=" ) ( int | var ) | "=" ( label ) ;
var         = "$" [ "?" ] ident { "." ident } ;            (* reserved, roll-triggers "Variables" *)
```

Rules the EBNF does not carry:
- A `list` must have exactly `S` entries for `dS`. A `named` source resolves first as a **preset** (`cards`, `pips`, `numbers`), then as a **pack id**. A pack id used as `named` is shorthand for `deal(<pack>; seed=<#n or 1>; mode=unique)`.
- `#n` is only legal after a pack (a preset is not shuffled). `&` joins packs: `{noto&gameicons#4}`.
- Face blocks are not allowed on `d%` (two physical dice). On d4 and d10 they parse but the first slice reports "custom faces on d4/d10 are not supported yet" (atlas layout, as in the spike).
- `kh`/`kl`/`adv`/`dis`/`r` and `+`/`-` totals need numeric values. A term whose faces have no values (text, glyphs) may not take keep or reroll-by-number; its dice add nothing to the total (see Results).
- The `:x(N)` group longhand stays; the bare letter `x` is never a variable.

### Deal modes (what replaces `randomized_glyphs[x*face]`)

The pool is shuffled once per deal identity. Then:

| Mode | Die `k` (0-based, in term order across the set), face `j` | Sketch equivalent |
|---|---|---|
| `unique` (default) | `order[offset_k + j]`, `offset_k` = faces of all earlier dice drawing on this deal | `randomized_glyphs[x*faces + face]` when all dice have the same face count |
| `each` | each die reshuffles with seed `seed+k`, takes its first `S` | faces unique on a die, repeats across dice allowed |
| `repeat` | `order[(offset_k + j) mod pool]` | allows a pool smaller than the set |

`unique` fails if the pool is too small ("Set needs 60 faces; noto holds 141" style). Because the hash does not include the dice list, **adding a die keeps the faces of the dice before it**: `6d12{noto#1}` is `5d12{noto#1}` plus one new die. The spike re-deals everything when a die is added.

**Stable shuffle.** Order the pool by `hash32(seed | glyph id)` rather than a Fisher-Yates over the pack array. A pack that gains a glyph then inserts it somewhere in the order without reshuffling the rest; a pack's array order and file layout stop mattering. The pack `rev` is still hashed so a deliberate pack change is visible (the faces differ, and the editor can say why).

## Worked examples

| # | Text | Meaning |
|---|---|---|
| 1 | `4d6+2d10@bone+3` | Today's notation, same model as today (no `faces` key). |
| 2 | `d20 adv+5` | Box shows `d20adv+5`; model `2d20kh1 +5` as today. Longhand `d20:adv+5`. |
| 3 | `d6{cards}` | Preset: faces `A,K,Q,J,10,9` with values `14,13,12,11,10,9`. Result `id` is `A`...`9`. |
| 4 | `d6{A=14,K=13,Q=12,J=11,10,9!wild}` | The same die written out, with 9 as a wild face (flag reserved: parsed and stored, not yet acted on). |
| 5 | `d6{Yes,No,Maybe,"Ask again","Later, maybe",Never}` | Hand-listed oracle d6. Labels with spaces or commas need quotes. No total. |
| 6 | `5d12{noto#1}` | **Story Dice short form**: five d12, glyph faces dealt from `noto`, set 1, unique across the set. |
| 7 | `5d12{deal(noto; seed=1; mode=unique)}` | Long form of 6; same model, prints back to either. |
| 8 | `3d6{noto&gameicons#4}@bone+2d12{noto&gameicons#4}@gold` | Mixed set, two designs, one deal: all 30 faces unique. |
| 9 | `3d6{noto#4}+3d6{memes#4}` | Two deals (different packs): unique within each, not across. |
| 10 | `9d6{symbols#1!repeat}` | 54 faces from a 13-glyph pack; repeats allowed. |
| 11 | `d20{noto:cat,noto:dog,...}` (20 entries) | Hand-picked glyphs; no shuffle, no seed. |
| 12 | `2d6{cards}:shows=A(label(ace!))` | Phase 2 trigger matching a face id (was `:face...` in the draft). |
| 13 | `$story_dice d12{noto#$set}` | Reserved: variable count and seed. Parses into the model with unresolved refs; rolling asks for the value (roll-triggers rule). |
| 14 | `4x d6{cards}` | Group: four separate rolls of one card die (not four dice). |
| 15 | `d6{1,2,3,4,5,6}` | Normalises to `d6` (a list equal to the default numbers is dropped). |

## The model

Today: `{terms:[{count, sides, design?, keep?}], mod, group?}`. Proposed (additions only):

```js
term = { count, sides, design?, keep?, reroll?,      // reroll from Phase 1
         faces?: FaceSource }                        // absent = numbers 1..S, exactly as today
FaceSource =
  | { kind:'list',   faces:[ { label, glyph?, value?, flags?:['wild'] } ] }   // glyph = 'noto:cat'
  | { kind:'preset', name:'cards' }
  | { kind:'deal',   packs:['gameicons','noto'], seed:1, mode:'unique' }      // packs sorted
set  = { terms, mod, group?, clauses?, vars? }       // clauses: Phase 2 triggers, vars: reserved
```

A pure function `resolveFaces(set, packs) -> [[Face] per physical die]` turns the model into faces (`Face = {i, id, label, value?, glyph?, flags?}`). `specsFor` reads it instead of the global `storyDeal`; the game reads the same thing. Resolution never runs during parsing, so a set with a missing pack still parses and shows an error only when it is rolled or rendered.

### Bag file

- `sets[].terms[].faces` holds the `FaceSource` as above. Sets keep storing the model, not text (`roll-triggers.md`: nothing is stored as text only).
- `sets[].requires = {packs:[{id:'noto', rev:3, license:'OFL 1.1'}]}`, written from the model on save. Loading checks it and reports a missing pack per set ("Set Story: needs glyph pack noto, which this app does not have"); the set stays in the bag but cannot roll.
- **Version.** `loadBag` throws on any version other than 1, so a v2 file would be refused outright by today's app. Proposal: write `version: 2` only when the bag actually contains a face block (or later, characters); otherwise keep writing `1`. A v1 reader never sees v2 content; a v2 reader loads v1 unchanged (no migration needed, `faces` absent = numbers). The characters bump (`design-format.md`) shares the same v2.
- The log entry stores the resolved labels and ids used (`items[].faces:[{i,id,label}]`), snapshotted like variables, so a pack update cannot rewrite history.

### Results and matching

- A die result is `{i, value?, id, label}`. For numeric dice `i === value` and `id === String(value)`: today's code that reads numbers keeps working.
- Totals add `value` of kept dice. A term without values contributes nothing; a roll with no values shows **no total**, just the faces ("5d12{noto#1}: cat · ship · moon · key · tree").
- Matching (`:shows=A`, result tables, games) is on `id`. Labels are display only and may be localised later.
- Copy / Save text prints the normal form of the set, then the labels. The games engine receives `faces` per die; Story Dice keeps its arrangement and rating and drops `makeStoryDeal`.

### Design versus faces

A design stays a look (substrate, colours, font, relief). Face content lives on the set term, so `5d12{noto#1}@bone` and `5d12@bone` share one design. Text faces use the design's numbers font; glyph faces use the atlas label object (`{path, vb}`). Per-design default faces are left out on purpose: a design that silently changes what a die rolls would surprise players.

## Round trip, normal form, errors

- **Round trip:** for each example above, parse(text) = parse(longhand) and print(model) gives the normal form, which parses back to the same model. Face blocks have one shorthand (`{pack#n}`, `!mode` only when not `unique`) and one longhand (`deal(...)`); lists and presets print as written.
- **Normal form:** keywords lower case; labels as written; pack ids sorted and joined with `&`; `#1` is printed (the seed is never implicit in saved text, so the set name never matters); a list equal to `1..S` is dropped; `deal(...)` is shown only when the set is in longhand mode (editor Expand).
- **Gentle rewriting** (roll-triggers rule): the box keeps the player's spelling; it only normalises spacing, case of keywords, and order of `{}` and `@`.

Errors (new; existing ones unchanged):

| Input | Message |
|---|---|
| `d6{A,K,Q}` | `d6 needs 6 faces, the list has 3` |
| `d6{xyz}` | `No preset or glyph pack "xyz"` |
| `d6{cards#2}` | `"cards" is a fixed list; a set number only applies to a glyph pack` |
| `d%{noto#1}` | `Custom faces don't work on d% (two dice); use d10` |
| `d6{cards}kh1` / `3d6{noto#1}+2` | `kh needs numbered faces; "cards" faces have values but "noto" faces don't` / `+2 can't add to glyph faces` |
| `25d12{noto#1}` | `Too many dice (25); max 24` (existing cap) |
| `9d20{symbols#1}` | `Set needs 180 faces; symbols holds 13 (add packs or use !repeat)` |
| unknown pack on load | `Set "Story": needs glyph pack noto (not in this app)` |
| `d6{A,B,C,D,E,` | `Missing "}" after the face list` |
| label too long | `Face label "..." is longer than 16 characters` |
| `d6{noto:nope,...}` | `No glyph "nope" in pack noto` |

**Caps (hostile input):** 24 dice (existing `MAXDICE`, groups included); faces per die = sides, max 20; label 16 characters; a face list 20 entries; 8 packs per deal; a resolved pool of at most 4000 glyphs; whole notation text 2000 characters. No expression evaluation: `seed` and `value` are integers or `$` refs, nothing else.

## Flaws exposed in the current grammar (change now)

1. **The parser cannot hold a face block.** `parseNotation` lowercases the whole string, strips all spaces, turns `-` into `+-` and splits on `+`. Labels like `Ask again`, `K`, or `"Later, maybe"` cannot survive that. Cost: replace the split with a small tokenizer (one function, ~60 lines) that is case-insensitive for keywords only and respects `{}` and quotes. Must be proven with a golden test of every string the current tests and guide use. This is the main implementation cost and is also needed for Phase 2 triggers anyway.
2. **`face<cond>` → `shows<cond>`** in `roll-triggers.md` (draft only, no code; open question 1 there becomes this one).
3. **The spike fingerprint hashes bag-local design ids** (`d1@...`), so the same Story set in two bags deals different glyphs, and it includes the dice list, so adding a die reshuffles everything. Replace with the deal identity hash. Cost: a saved spike game re-deals differently once (spike only, nothing shipped).
4. **`5x d12` in the sketch means a group of rolls**, not five dice. No change to the grammar; the guide and any game-generated text must use `5d12`.

## Reserved, and why it cannot corner us

- `$name` anywhere an int stands (count, seed, value, cond) and as a whole count (`$n d12`): already in the EBNF; parsed to `{var:'n'}` in the model.
- Per-face `!flag` (wild, and future roles): parsed and stored, no behaviour yet. Flags are an open list of idents; unknown flags are kept, not rejected, so new roles do not break old sets.
- Per-face `=value` beyond presets: in the grammar from slice 2.
- Images: `glyphref` already covers `pack:id`; a user image becomes a glyph in a local pack (`mine:dragon`), so no new syntax is needed.
- Chains and traits stay in the `:` clause space; face blocks never use `:`, `(`, or `)` at the top level, so the two cannot overlap.
- New sources (e.g. weighted pools, `deal(...; draw=2)`) go in as new `dealopt` keys; unknown keys are an error today, a feature tomorrow.

## Slicing plan

Each slice ships alone and keeps every existing test green. **P** = touches `parseNotation`/`fmtNotation`.

1. **Story Dice set in normal mode (P, minimal).** Accept a single `{pack#n}` / `{a&b#n}` block per term (mode `unique` only) by teaching the split to skip `{...}`; add `faces` to the term model and `fmtNotation`; `resolveFaces` in a new module using the stable shuffle; `specsFor`/`buildDice` paint glyphs from the set; readout and log show labels, no total; the game builds its set as `<n>d<s>{<packs>#<seed>}` and stops using `storyDeal`.
   Tests (`@quick` unless noted): parse/print round trip of `5d12{noto#1}`, `3d6{noto&memes#2}@x`, and every pre-existing notation string (golden list); same text gives the same faces in two fresh pages (seeded, `@slow`); `6d12{noto#1}` keeps the first five dice of `5d12{noto#1}`; pool-too-small error; unknown pack error; dice cap; saving and reloading a bag with a story set keeps faces; quick-roll box rolls `5d12{noto#1}` outside the game and the log shows five labels; Story Dice game still deals and scores (existing game spec).
2. **Tokenizer (P).** Replace split-on-`+` with the tokenizer; case kept for labels. Golden test unchanged; add literal lists, quotes, `{cards}`, values, flags (stored only).
3. **Bag v2.** `requires.packs`, write v2 only when needed, missing-pack report, log face snapshot. Tests: v1 file round trip byte-equal; v2 written only with faces; old-version error text.
4. **Set editor.** Face source picker (numbers / preset / list / glyph deal) writing the same model; Expand / Collapse shows `deal(...)`.
5. **Matching (with roll-triggers Phase 2) (P).** `:shows<cond>`, `:shows=id`; result tables keyed by id; games engine reads `faces`.
6. **Modes and roles.** `!each`, `!repeat`, wild behaviour, then images via local packs.

## Alternatives rejected

- `:face(...)` / `:faces(...)` clause for definitions: puts content in the trigger slot and collides with the die trigger; triggers would need a "not really a trigger" phase.
- Keep `face<cond>` as the trigger and use `{}` for definitions: workable (no rename), but "face" would mean both a condition and content; kept as alternative A if the owner prefers no rename.
- Exposing index variables (`x`, `face`) with arithmetic: needs an expression evaluator, collides with `Nx`, and every useful formula found is one of the three modes.
- Faces stored on the design: breaks "design is a look" and one design in two sets.
- Hashing the set name or text: renaming or re-spacing a set would re-deal it.
- Bag v2 for every file: today's app would refuse files that have nothing new in them.

## Risks

- Pack revisions change deals; mitigated by the stable shuffle and a visible `rev`, not eliminated.
- Long labels on small faces (d20) read badly; the 16-character cap and editor preview help, PD-26 size balancing is the real fix.
- The tokenizer rewrite (slice 2) is where regressions would come from; the golden list is the guard.

## Open questions for the owner

1. Rename the die trigger to `shows` (recommended) or keep `face<cond>` with `{}` definitions (alternative A)?
2. Seed spelling: `{noto#1}` (recommended) or `{noto set 1}` / `{noto:1}`? (`:` is taken by glyph refs.)
3. Should adding a die keep the earlier dice's faces (recommended, deal identity excludes the dice list), or should any change to the set reshuffle like the spike?
4. Text faces without values: no total (recommended), or count them as their face index?
5. Is `{cards}` the right preset name, and which values (Ace high 14, or 1)? Is the 9 wild by default?
6. Bag v2 only when needed (recommended), or always v2 once this ships?
7. Should a design be allowed a default face source later (rejected for now), e.g. a "card die" design?

## Owner decisions (2026-11-19)

1. Rename the draft trigger `face<cond>` to `shows<cond>`.
2. Seed spelling is `#1` (`5d12{noto#1}`).
3. Adding a die keeps the earlier dice's faces. Two things the grammar must still express: (a) "5 different dice" versus "5 identical dice" (distinct faces per die versus the same face list on every die), and (b) "shuffle the pool by seed before choosing" versus "take the pool in its original order", so a specific glyph set can be authored by hand. The `unique` / `each` / `repeat` deal modes cover part of this; the doc needs an explicit identical-dice mode and an explicit ordered (no-shuffle) mode.
4. Faces with no numeric value count as their index (1..n) in totals. Leave a way for a glyph to specify its own value (`noto:cat=7`).
5. `cards` preset: Ace = 14, no wild by default (wild is opt-in with `!wild`).
6. Write a bag as version 2 only when it needs it.
7. A design MAY carry optional default faces (this reverses the doc's recommendation). Set-level faces override the design's; the doc must say how the two combine.

Section updates for 3 and 7 are still to be folded into the body above.
