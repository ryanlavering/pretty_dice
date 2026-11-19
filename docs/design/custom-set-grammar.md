# Custom set grammar: face blocks and deals (proposal)

Status: owner decisions folded in, 2026-11-19 (see "Owner decisions" at the end; the body below follows them). Brief: `custom-set-grammar-brief.md`. Extends the roll language in `roll-triggers.md` (PD-142.42); touches PD-127 (custom faces) and PD-160 (Story Dice).
Checked against the source: `parseNotation` / `fmtNotation` (`src/main.js` ~96-120), `fingerprint` / `dealGlyphs` / `poolFor` (`src/story.js`), `makeStoryDeal` (`src/main.js` ~2071), `loadBag` version check (`src/bagmodel.js` line 24). `r1` and triggers are not implemented yet; only today's notation is live.

## Problem

Story dice exist only inside the game: `makeStoryDeal` builds a global `storyDeal` from game options, and `specsFor` paints it onto whatever `state.notation` holds (`5d12`). Nothing in the notation, the set, or the bag says "these dice have glyph faces". The owner wants a set anyone can build and roll in normal mode; the game should only add arrangement and rating on top.

So a set must be able to say, per dice term, **what is on the faces**, including generated deals that are the same on every device, and roll results must be face symbols that tables, games and triggers can match.

## Principles

1. **One language.** Face content is a new part of a dice term, beside `@design` and `kh`. Triggers stay `:trigger(action)`. No second notation.
2. **Faces are content, not behaviour.** A face definition is not a trigger and never uses the `:name(...)` slot. Triggers react to rolls; face blocks say what the die *is*.
3. **Declarative.** No loops, no index arithmetic, no eval. The sketch's `x*face` indexing becomes a named deal mode.
4. **The design is the look; the set holds the faces; a design MAY carry default faces.** A set's own faces always override the design's (see "Design versus faces"). One design can carry numbers in one set and glyphs in another.
5. **Numbers are a face source like any other** (the default). Every string that parses today parses to the same model.
6. **Same model, two spellings, round trip** (from `roll-triggers.md`) applies to face blocks too.

## Decisions at a glance

| Question | Decision |
|---|---|
| Where face definitions live | A **face block** `{...}` right after `NdS` and its keep, before `@design`: `5d12{noto#1}@bone`. Not a `:` clause. |
| The `face<cond>` collision | The die-phase trigger is **`shows<cond>`** (`:shows1(reroll)`, `:shows=A(...)`). "Face" is kept for content. (Owner 1.) |
| The `x` collision | Index variables are **not** exposed; deal modes replace them. `5x d12` means five separate rolls of one d12; the story set is `5d12`. |
| Seed | `#1` after the pack: `{noto#1}`. (Owner 2.) |
| Deal: expression or call | A **source expression** inside the face block. Shorthand is a pack name plus `#seed` and `!flags`; longhand is `deal(...)` with every option spelled out. |
| Two mode axes | **Dice axis**: `different` (default, each die takes its own run of faces) or `same` (every die gets the same face list). **Order axis**: `shuffled` (default, pool shuffled by seed) or `ordered` (pool in its original order, no seed). Any combination. (Owner 3.) |
| Scope | A deal is shared by **every term in the set with the same deal identity** (packs + seed + order + dice axis). In `different` mode dice take consecutive runs in term order. |
| What is hashed | Deal identity only: `pd-deal1|<pack ids>@<pack revs>|<seed>`. Not the set name, not design ids, not the dice list, so **adding a die keeps the faces of the dice before it**. (Owner 3.) |
| Values | A face with no value counts as its **index** (1..n) in totals; `=value` overrides it per face or per glyph (`noto:cat=7`). `cards` preset: Ace 14, no wild unless `!wild`. (Owner 4, 5.) |
| Design vs set | A design may carry optional default faces; set-level faces override them. (Owner 7.) |
| Stored in the bag | The model (terms with `faces`), plus a `requires.packs` list. Text is printed from the model. Version 2 only when a bag needs it. (Owner 6.) |
| Results | Each die result is `{i, value, id, label}`: `i` the face index (1..n), `value` what totals add (index unless overridden), `id` the stable symbol (`A`, `noto:cat`, `7`). Matching uses `id`; totals use `value`. |
| Hard-coded first | Slice 1 hard-codes glyph packs and the four mode combinations behind a simpler grammar subset (`{pack#n}` plus `!same`/`!ordered`). The full grammar below stays valid and nothing in slice 1 contradicts it. |

## Grammar

EBNF, extending `roll-triggers.md`. Keywords are case-insensitive; face labels keep their case. Whitespace is free outside quotes.

```
roll        = [ group ] set { ":" trigger [ "(" action ")" ] } ;
group       = int ( "x" | "×" ) ;                         (* unchanged: 4x d20+2 *)
set         = term { ( "+" | "-" ) term } ;
term        = dice | int | var ;
dice        = [ int | var ] "d" ( int | "%" ) [ shorthand ] [ facesblk ] [ "@" ident ] ;
shorthand   = keep | "adv" | "dis" | reroll ;            (* reroll = r1, r<3 (Phase 1) *)
keep        = ( "kh" | "kl" | "dh" | "dl" ) [ int ] ;

facesblk    = "{" source { ";" override } "}" ;
source      = list | named | deal ;
list        = face "," face { "," face } ;                (* 2+ entries: a literal list; always ordered *)
named       = ident [ "#" int ] { "!" flag } ;            (* 1 entry: a preset or a pack *)
deal        = "deal" "(" packs { ";" dealopt } ")" ;
packs       = ident { "&" ident } ;
dealopt     = "seed" "=" ( int | var ) | "dice" "=" ( "different" | "same" | "each" | "repeat" )
            | "order" "=" ( "shuffled" | "ordered" ) | "value" "(" glyphref ")" "=" int ;
override    = glyphref "=" int ;                           (* {noto#1;noto:cat=7} *)

face        = label [ "=" int ] { "!" flag } ;
label       = word | quoted | glyphref ;
glyphref    = ident ":" ident ;                            (* noto:cat *)
word        = ( letter | digit ) { letter | digit | "_" } ;
quoted      = '"' { char - '"' } '"' ;
flag        = "same" | "ordered" | "each" | "repeat" | "wild" | ident ;   (* mode flags on packs; "wild" on faces; unknown kept *)

trigger     = "adv" | "dis" | "nat1" | "nat20" | "shows" cond | "total" cond
            | "pool" | "x" | "hit" | "miss" | "crit" | "if" "(" var ")" | ... ;
cond        = int | ( "<" | "<=" | ">" | ">=" ) ( int | var ) | "=" ( label ) ;
var         = "$" [ "?" ] ident { "." ident } ;            (* reserved, roll-triggers "Variables" *)
```

Rules the EBNF does not carry:
- A `list` must have exactly `S` entries for `dS`. A `named` source resolves first as a **preset** (`numbers`, `cards`, `pips`), then as a **pack id**. A pack id used as `named` is shorthand for `deal(<pack>; seed=<#n or 1>; dice=different; order=shuffled)`.
- Flags on a pack: `!same` (dice axis `same`), `!ordered` (order axis `ordered`), `!each`, `!repeat` (dice axis, later). Flags combine: `{noto#1!same}`, `{noto!ordered}`, `{noto!same!ordered}`. `!ordered` takes no seed (`{noto#2!ordered}` is an error); the original order is the pack array order, packs taken in the order written. Shuffled sorts pack ids.
- `#n` is only legal after a pack. `&` joins packs: `{noto&gameicons#4}`.
- `numbers` is the explicit "plain numbers 1..S" source; it exists so a set can opt out of a design's default faces.
- Face blocks are not allowed on `d%` (two physical dice). d4 and d10 parse but report "custom faces on d4/d10 are not supported yet" (atlas layout).
- **Values.** Every face has a value: the explicit `=value` if given, else (for a preset) its preset value, else its **index** `i`. So `kh`, `kl`, `adv`, `dis`, reroll and `+`/`-` all work on glyph and text faces, using the index. `{noto#1;noto:cat=7}` makes the cat count 7 wherever it lands. Overrides apply to the glyph, not the position.
- The `:x(N)` group longhand stays; the bare letter `x` is never a variable.

### Deal modes (what replaces `randomized_glyphs[x*face]`)

Two axes, set independently. First the **pool**: `shuffled` orders it by the stable shuffle below; `ordered` keeps the original order (so a specific glyph set can be authored by hand: `{noto!ordered}` is the first `S` glyphs of noto on die one, and so on). Then the **dice axis** hands faces out. Die `k` is 0-based in term order across the set, face `j` 0-based:

| Dice axis | Die `k`, face `j` | Meaning |
|---|---|---|
| `different` (default) | `order[offset_k + j]`, `offset_k` = faces of all earlier dice drawing on this deal | 5 different dice; every glyph unique across the set. Sketch equivalent: `randomized_glyphs[x*faces + face]`. |
| `same` | `order[j]` | 5 identical dice: every die carries the same face list; `offset` is always 0. |
| `each` (later) | each die reshuffles with seed `seed+k`, takes its first `S` | faces unique on a die, repeats across dice allowed |
| `repeat` (later) | `order[(offset_k + j) mod pool]` | allows a pool smaller than the set |

`different` fails if the pool is too small ("Set needs 60 faces; noto holds 141" style). Because the hash does not include the dice list, **adding a die keeps the faces of the dice before it** (owner decision 3): `6d12{noto#1}` is `5d12{noto#1}` plus one new die. The spike re-deals everything when a die is added.

**Stable shuffle.** Order the pool by `hash32(seed | glyph id)` rather than a Fisher-Yates over the pack array. A pack that gains a glyph then inserts it somewhere in the order without reshuffling the rest. The pack `rev` is still hashed so a deliberate pack change is visible.

## Worked examples

| # | Text | Meaning |
|---|---|---|
| 1 | `4d6+2d10@bone+3` | Today's notation, same model as today (no `faces` key). |
| 2 | `d20 adv+5` | Box shows `d20adv+5`; model `2d20kh1 +5` as today. Longhand `d20:adv+5`. |
| 3 | `d6{cards}` | Preset: faces `A,K,Q,J,10,9` with values `14,13,12,11,10,9` (Ace high, no wild). Result `id` is `A`...`9`. |
| 4 | `d6{A=14,K=13,Q=12,J=11,10,9!wild}` | The same die written out, with 9 as an opt-in wild face (the preset has none; flag parsed and stored, not yet acted on). |
| 5 | `d6{Yes,No,Maybe,"Ask again","Later, maybe",Never}` | Hand-listed oracle d6. Labels with spaces or commas need quotes. Values are the indices 1..6, so a total of two such dice is 2..12. |
| 6 | `5d12{noto#1}` | **Story Dice short form**: five d12, glyph faces dealt from `noto`, seed 1, `different` + `shuffled`, unique across the set. Total adds the face indices. |
| 7 | `5d12{deal(noto; seed=1; dice=different; order=shuffled)}` | Long form of 6; same model, prints back to either. |
| 8 | `3d6{noto&gameicons#4}@bone+2d12{noto&gameicons#4}@gold` | Mixed set, two designs, one deal: all 30 faces unique. |
| 9 | `3d6{noto#4}+3d6{memes#4}` | Two deals (different packs): unique within each, not across. |
| 10 | `9d6{symbols#1!repeat}` | 54 faces from a 13-glyph pack; repeats allowed (dice axis `repeat`, later). |
| 11 | `d20{noto:cat,noto:dog,...}` (20 entries) | Hand-picked glyphs; no shuffle, no seed. |
| 12 | `2d6{cards}:shows=A(label(ace!))` | Phase 2 trigger matching a face id (was `:face...` in the draft). |
| 13 | `$story_dice d12{noto#$set}` | Reserved: variable count and seed. Parses into the model with unresolved refs; rolling asks for the value (roll-triggers rule). |
| 14 | `4x d6{cards}` | Group: four separate rolls of one card die (not four dice). |
| 15 | `d6{1,2,3,4,5,6}` | Normalises to `d6` (a list equal to the default numbers is dropped). |
| 16 | `5d12{noto#1!same}` | Five **identical** dice: all carry the same 12 shuffled glyphs. |
| 17 | `5d12{noto!ordered}` | Five different dice taken from noto in its original order (glyphs 1-12, 13-24, ...); hand-authorable, no seed. |
| 18 | `3d12{noto#1!same!ordered}` | Three identical dice, the first 12 glyphs of noto in pack order. |
| 19 | `5d12{noto#1;noto:cat=7}` | The Story set where the cat counts 7 wherever it falls (the other faces count their index). |
| 20 | `d20{numbers}@dragon` | Opt out of design `dragon`'s default faces: plain numbers. `d20@dragon` alone uses the design's defaults, if it has any. |

## The model

Today: `{terms:[{count, sides, design?, keep?}], mod, group?}`. Additions only:

```js
term = { count, sides, design?, keep?, reroll?,      // reroll from Phase 1
         faces?: FaceSource }                        // absent = numbers 1..S, exactly as today
FaceSource =
  | { kind:'list',   faces:[ { label, glyph?, value?, flags?:['wild'] } ] }   // glyph = 'noto:cat'
  | { kind:'preset', name:'cards' | 'numbers' | 'pips' }
  | { kind:'deal',   packs:['gameicons','noto'], seed:1, dice:'different', order:'shuffled', values?:{'noto:cat':7} }
                                                  // packs sorted when shuffled, as written when ordered; seed absent when ordered
set  = { terms, mod, group?, clauses?, vars? }       // clauses: Phase 2 triggers, vars: reserved
```

A pure function `resolveFaces(set, packs, designs) -> [[Face] per physical die]` turns the model into faces (`Face = {i, id, label, value, glyph?, flags?}`; `value` is the index unless overridden). The source for a term is `term.faces`, else its design's default faces, else numbers. `specsFor` reads it instead of the global `storyDeal`; the game reads the same thing. Resolution never runs during parsing, so a set with a missing pack still parses and shows an error only when it is rolled or rendered.

### Bag file

- `sets[].terms[].faces` holds the `FaceSource` as above. Sets keep storing the model, not text (`roll-triggers.md`: nothing is stored as text only).
- `sets[].requires = {packs:[{id:'noto', rev:3, license:'OFL 1.1'}]}`, written from the model on save (a design's default faces list its packs the same way). Loading checks it and reports a missing pack per set ("Set Story: needs glyph pack noto, which this app does not have"); the set stays in the bag but cannot roll.
- **Version.** `loadBag` throws on any version other than 1, so a v2 file would be refused outright by today's app. Decided (owner 6): write `version: 2` only when the bag actually contains a face block or a design with default faces (or later, characters); otherwise keep writing `1`. A v1 reader never sees v2 content; a v2 reader loads v1 unchanged (no migration needed, `faces` absent = numbers). The characters bump (`design-format.md`) shares the same v2.
- The log entry stores the resolved labels and ids used (`items[].faces:[{i,id,label}]`), snapshotted like variables, so a pack update cannot rewrite history.

### Results and matching

- A die result is `{i, value?, id, label}`. For numeric dice `i === value` and `id === String(value)`: today's code that reads numbers keeps working.
- Totals add `value` of kept dice. A face with no explicit value counts as its **index** (1..n), so every roll has a total and `kh`/`kl`/`adv`/`dis`/`+` work on glyph and text faces. The readout shows the faces beside their values ("5d12{noto#1}: cat=7 + ship=3 + ... = 31") and, for glyph dice, the sentence.
- Matching (`:shows=A`, result tables, games) is on `id`. Labels are display only and may be localised later.
- Copy / Save text prints the normal form of the set, then the labels. The games engine receives `faces` per die; Story Dice keeps its arrangement and rating and later drops `makeStoryDeal`.

### Design versus faces

A design is mainly a look (substrate, colours, font, relief), but it **may carry optional default faces** (owner 7), e.g. a "card die" design or a story design. Face content on a set term overrides it, so `5d12{noto#1}@bone` and `5d12@bone` can share one design. Text faces use the design's numbers font; glyph faces use the atlas label object (`{path, vb}`).

How the two combine, per term:
1. The term has a face block: it wins, the design's defaults are ignored for that term (`{numbers}` is the explicit "plain numbers" block).
2. The term has none and the design has default faces: the design's faces apply. A default `deal` joins the set's deals by deal identity like any other, so two terms with the same default deal take consecutive runs.
3. Neither: numbers, exactly as today.

The design stores the same `FaceSource` model in an optional `faces` field. Because that changes what a die rolls, the notation text of a set never hides it: the printed normal form shows `@dragon` and the roll readout shows the resolved faces, and a design with defaults carries a marker in the set editor and bag. A design with no `faces` field is byte-for-byte unchanged (old files, no version bump for the design itself; a bag carrying such a design is v2).

## Round trip, normal form, errors

- **Round trip:** for each example above, parse(text) = parse(longhand) and print(model) gives the normal form, which parses back to the same model. Face blocks have one shorthand (`{pack#n}`, `!same`/`!ordered`/... only when not the default; value overrides after `;`) and one longhand (`deal(...)`); lists and presets print as written.
- **Normal form:** keywords lower case; labels as written; pack ids sorted and joined with `&`; `#1` is printed for shuffled deals (the seed is never implicit in saved text, so the set name never matters; `!ordered` prints no seed); mode flags print in the order `!same`, `!ordered`; a list equal to `1..S` is dropped; `deal(...)` is shown only when the set is in longhand mode (editor Expand).
- **Gentle rewriting** (roll-triggers rule): the box keeps the player's spelling; it only normalises spacing, case of keywords, and order of `{}` and `@`.

Errors (new; existing ones unchanged):

| Input | Message |
|---|---|
| `d6{A,K,Q}` | `d6 needs 6 faces, the list has 3` |
| `d6{noto#2!ordered}` | `An ordered deal has no seed; drop #2 or drop !ordered` |
| `d6{xyz}` | `No preset or glyph pack "xyz"` |
| `d6{cards#2}` | `"cards" is a fixed list; a set number only applies to a glyph pack` |
| `d%{noto#1}` | `Custom faces don't work on d% (two dice); use d10` |
| `d6{cards}kh1` / `3d6{noto#1}+2` | (none: glyph and text faces have index values, so `kh` and `+2` are valid) |
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
3. **The spike fingerprint hashes bag-local design ids** (`d1@...`), so the same Story set in two bags deals different glyphs, and it includes the dice list, so adding a die reshuffles everything. Replace with the deal identity hash. Cost: a saved spike game re-deals differently once (spike only, nothing shipped). Slice 1 leaves the game on its spike fingerprint and does not change it yet.
4. **`5x d12` in the sketch means a group of rolls**, not five dice. No change to the grammar; the guide and any game-generated text must use `5d12`.

## Reserved, and why it cannot corner us

- `$name` anywhere an int stands (count, seed, value, cond) and as a whole count (`$n d12`): already in the EBNF; parsed to `{var:'n'}` in the model.
- Per-face `!flag` (wild, and future roles): parsed and stored, no behaviour yet. Flags are an open list of idents; unknown flags are kept, not rejected, so new roles do not break old sets.
- Per-face `=value` and per-glyph `;noto:cat=7` overrides: in the grammar now, parsed from slice 2 (slice 1 uses index values only).
- Images: `glyphref` already covers `pack:id`; a user image becomes a glyph in a local pack (`mine:dragon`), so no new syntax is needed.
- Chains and traits stay in the `:` clause space; face blocks never use `:`, `(`, or `)` at the top level, so the two cannot overlap.
- New sources (e.g. weighted pools, `deal(...; draw=2)`) go in as new `dealopt` keys; unknown keys are an error today, a feature tomorrow.

## Slicing plan

Each slice ships alone and keeps every existing test green. **P** = touches `parseNotation`/`fmtNotation`.

1. **Story Dice set in normal mode (P, minimal; hard-coded glyph settings).** Subset of the grammar: one face block per term, `{pack#n}` or `{a&b#n}` with optional `!same` / `!ordered` flags (dice axis `different`/`same`, order axis `shuffled`/`ordered`), on d6/d8/d12/d20, values are indices. The block is a lowercase `[a-z0-9&]` word so the existing split-on-`+` parser survives it (the real tokenizer is slice 2). `faces` is added to the term model and `fmtNotation`; `resolveFaces` lives in a new pure module (`src/faces.js`) using the stable shuffle; `specsFor`/`buildDice` paint glyphs from the set; the result line shows glyph names with their values, the total adds indices, and a sentence line appears; the quick-roll (lightning) result and log show the names too. **As built (slice 1):** syntax `NdS[keep]{pack[&pack]#seed[!same][!ordered]}[@design]`, e.g. `5d12{noto#1}`, `4d6kh2{noto#1!same}`; implemented in `src/faces.js` (`parseFaceBlock`, `fmtFaces`, `dealTerms`, `dealError`), term model `faces:{kind:'deal',packs,seed?,dice,order}`; dice d6, d8, d12, d20 only; seed 0-999999; a group (`2x`) shares one deal across its copies and shows indices only. A normal roll shows `name=index` per die, the index total, and a sentence (`sentenceFor`, also logged as `story`). Everything else (label lists, values, presets, design defaults, `each`/`repeat`) is reserved, not implemented. The Story Dice game keeps its spike deal and is untouched; it moves to `<n>d<s>{<packs>#<seed>}` in a later slice.
   Tests (`tests/grammar-*.spec.mjs`): parse/print round trip of `5d12{noto#1}`, `3d6{noto&memes#2}@x`, `5d12{noto#1!same}`, `5d12{noto!ordered}`; every pre-existing notation string unchanged (existing notation specs); `6d12{noto#1}` keeps the first five dice of `5d12{noto#1}`; same-text-same-faces across two fresh pages; pool-too-small, unknown pack, d4/d10/d% and `!ordered` with a seed errors; dice cap; saving and reloading a bag set keeps faces and the bag stays v1; rolling `5d12{noto#1}` in normal mode shows glyph names, a sentence and an index total.
2. **Tokenizer (P).** Replace split-on-`+` with the tokenizer; case kept for labels. Golden test unchanged; add literal lists, quotes, `{cards}`, values, flags (stored only).
3. **Bag v2.** `requires.packs`, write v2 only when needed (a face block that older apps cannot read, or design default faces), missing-pack report, log face snapshot. Tests: v1 file round trip byte-equal; v2 written only when needed; old-version error text. (Slice 1 stores the face block in set terms and keeps the bag at v1: the field is additive and an old app only loses the glyphs, not the file. If the owner wants old apps to refuse such a bag, slice 3 flips it to v2.)
4. **Set editor.** Face source picker (numbers / preset / list / glyph deal, mode switches) writing the same model; design default faces; Expand / Collapse shows `deal(...)`.
5. **Matching (with roll-triggers Phase 2) (P).** `:shows<cond>`, `:shows=id`; result tables keyed by id; games engine reads `faces`.
6. **Modes and roles.** `!each`, `!repeat`, `value` overrides, wild behaviour, design default faces in the roller, then images via local packs.

## Alternatives rejected

- `:face(...)` / `:faces(...)` clause for definitions: puts content in the trigger slot and collides with the die trigger; triggers would need a "not really a trigger" phase.
- Keep `face<cond>` as the trigger and use `{}` for definitions: "face" would mean both a condition and content (rejected; owner chose `shows`).
- Exposing index variables (`x`, `face`) with arithmetic: needs an expression evaluator, collides with `Nx`, and every useful formula found is one of the mode combinations.
- Faces stored **only** on the design (no set-level faces): breaks one design in two sets. Optional design defaults overridden by the set are accepted instead.
- Hashing the set name or text: renaming or re-spacing a set would re-deal it.
- Bag v2 for every file: today's app would refuse files that have nothing new in them.

## Risks

- Pack revisions change deals; mitigated by the stable shuffle and a visible `rev`, not eliminated.
- Long labels on small faces (d20) read badly; the 16-character cap and editor preview help, PD-26 size balancing is the real fix.
- The tokenizer rewrite (slice 2) is where regressions would come from; the golden list is the guard.

## Open questions for the owner

All seven earlier questions are answered (below). Remaining, small:
1. Ordered deals over several packs: pack order as written (proposed) or alphabetical?
2. Should an old app refuse a bag that contains face blocks (flip to v2 in slice 1) or merely drop the glyphs (stay v1 until slice 3)? Slice 1 stays v1.
3. Design default faces: stored in the design file's optional `faces` (proposed); the bag then goes v2.

## Owner decisions (2026-11-19)

1. Rename the draft trigger `face<cond>` to `shows<cond>`.
2. Seed spelling is `#1` (`5d12{noto#1}`).
3. Adding a die keeps the earlier dice's faces. Two things the grammar must still express: (a) "5 different dice" versus "5 identical dice" (distinct faces per die versus the same face list on every die), and (b) "shuffle the pool by seed before choosing" versus "take the pool in its original order", so a specific glyph set can be authored by hand. The `unique` / `each` / `repeat` deal modes cover part of this; the doc needs an explicit identical-dice mode and an explicit ordered (no-shuffle) mode.
4. Faces with no numeric value count as their index (1..n) in totals. Leave a way for a glyph to specify its own value (`noto:cat=7`).
5. `cards` preset: Ace = 14, no wild by default (wild is opt-in with `!wild`).
6. Write a bag as version 2 only when it needs it.
7. A design MAY carry optional default faces (this reverses the doc's recommendation). Set-level faces override the design's; the doc must say how the two combine.

All seven are folded into the body above: 3 in "Deal modes" and the decisions table (two axes, `same`, `ordered`), 4 in "Values" and "Results", 5 in the presets, 7 in "Design versus faces".
