# 4.2: one model for designs, sets, game looks and lobby dice (PD-202, PD-190, PD-188, PD-206)

Date 2026-11-21. Read against `v4.2` at 1481b51. Design only: no app code or test changed.
Builds on `game-draft-design-memo.md` (D1-D3 owner-approved) and keeps every 4.1 rule listed in the brief.
Line refs are `src/main.js` unless stated. Storage keys: `prettydice.v1` (STORE, live state), `prettydice.bag.v1`
(BAG_STORE), `prettydice.games.game` (GSAVE).

## 0. The model in ten lines

1. **A design is a look.** Picking one (Bag tile, shelf card, Load file, import, Revert, Duplicate) never changes the dice, in any room.
2. Its stored `shape`/`notation` stay in the file (format unchanged, version 1) and mean **"suggested dice"**: Design shows a `Suggested: d20` chip that applies them on tap.
3. **A set is the dice.** It may name one design (`set.design`, new, optional); picking the set applies that look every time (look-only), unless the set says "Keep my look".
4. Per-die `@design` on set terms stays as it is (mixed sets). It is a different thing: dice that always wear that design.
5. **The live dice have a small, closed set of owners**: the shape picker or Custom editor, the dock formula, a set pick, the Suggested chip, Randomize with "also shape", and the game hold.
6. **The game hold** (`bag.hold`, new, BAG_STORE only) replaces `storyPrev`, `gameSnap`, `gameKeep` and `lookSnap`. It is the only record of the player's own dice while a game's dice are on the mat: in the lobby (PD-206) and during the game.
7. A hold can carry a **game draft** (PD-190): the game's look as a dashed, editable, savable Bag entry that is never a design. It comes in two kinds, `whole` (Story: plain white dice) and `tweak` (Yacht: your design plus pips, PD-188).
8. If it is on screen, a saved design, the random draft or the game draft is behind it (D2). A game draft never reaches a bag file, and it never overwrites a design.
9. The hold ends on release (lobby) or End game. Your dice come back from `hold.mine`. Your look stays whatever you last picked, as in D1.
10. Save as design on a game draft makes a design **plus a set that names it**: D3 ("saves its dice set too"), expressed in the new model.

## 1. Current model as found

### 1.1 Entities and where they live

| Thing | Shape today | Where | Refs |
|---|---|---|---|
| Live state | one mutable `state`: look keys, `shape`, `notation`, `seed`, settings | STORE via `save()` | l.79, DEFAULTS l.64, DESIGN_KEYS l.374 (includes `shape`, `notation`) |
| Design file | `{format:'pretty-dice', version:1, name, shape, substrate, colors, …, notation, numbers{…d6_style}, …}` | export `#savejson` l.633, bag entries | `designToJSON` l.599; `loadDesign` l.622 rejects `version!==1` (l.625) |
| Bag entry | `{id, name, preview_shape, design}` | BAG_STORE, bag file | bagmodel.js `parseBag`; `addEntry` l.689 |
| "Modified" | `canonD` ignores `shape`/`notation` | | bagmodel.js `canonD`; `isLiveModified` l.647 |
| Design shape drift | an unmodified active design's stored `shape` follows the live shape | | `syncLive` l.655, `normalizeActive` l.667 (skipped while `gameRun()`) |
| Set | `{id, name, terms:[{count, sides, keep?, faces?, design?}], mod, group?, table?, last?}`; `terms[].design` = per-die look (`@id`) | BAG_STORE, bag file | `setOps` l.941; `lookFor` l.256 renders foreign looks; `bagOps.remove` strips `t.design` l.712 |
| Story set | an ordinary set with one face-block term; the editor draft keeps the term's `design` | | storysets.js `isStorySet`, `draftOf`, `draftTerm` |
| Random draft | `bag.draft` + `bag.active.draft:true`, one slot | BAG_STORE | `enterDraft` l.687, `bagOps.keep/discard` l.700-702 |
| Active pointers | `bag.active {design, set, draft}`; `rollSetId` (memory) | | l.932, `setOps.open` l.954, `tableRoll` clears both l.978 |
| Game look (Story) | `lookSnap` = JSON snapshot of the player's look **and dice**; `plainLook()` mutates `state` | memory; `save()` overlays it into STORE | l.358-371, l.79 |
| Game ghost tile | inert dashed tile while `lookSnap` is set (4.1 mitigation M2) | | `slots()` l.841; `frozenId` l.646 blocks Save/Revert |
| Lobby preview (Story only) | `storyPrev {rolling, key}`, uses `lookSwap` | memory | `storyPreviewOn` l.2046, `syncGameLook` l.2049, `storyPreviewOff` l.2050, `ssPreviewMat` l.2110, setup call l.2203 |
| Game dice | `gameSnap {shape, notation}` from before Start; `gameKeep` during `activate()` | memory | l.1396, `startGame` l.1974-1978, `endGame` l.1979, l.673 |
| Running game | `game {id, info, state, setup}`; GSAVE `{id, state}` (no look, no dice owner) | GSAVE | l.1971-1973, Resume l.2189 |
| Game dice needs | `info.dice {count, sides}`: Yacht 5d6, Ten Thousand 6d6, Pig 1d6, Bunco 3d6, Craps 2d6, Shut the Box 2d6, Ship 5d6, Liar's Dice 5d6 (hidden), Story 5d12 (options `dice`/`sides`) | | games/*.js `info` |

### 1.2 What a design pick does today

| Route | Room | Dice change? | Code |
|---|---|---|---|
| Bag tile / shelf card | Play, idle, rolling | no (`stayPlay` keeps shape/notation, PD-197) | `activate` l.676 |
| Bag tile / shelf card | Design | **yes**: shape and notation from the design | `loadDesign` l.628, `lookFromDesign` sets `L.shape` |
| Bag tile / shelf card | running game | no (`gameKeep`) | l.676, l.631 |
| Load design file, Duplicate, Remove active | any | yes (Design) or no (Play) | `addLoaded`, `duplicate`, `remove` → `activate` |
| Import bag "Replace" | any | **yes** | `importBag` → `loadSlot` |
| Revert / Discard | any | **yes** | `bagOps.revert/discard` → `loadSlot` |
| Set open | not in game, or same dice in game | yes (that is the set's job) | `setOps.open` l.954 |

### 1.3 Problems the new model must remove

- P1. A design pick changes the formula in Design (PD-202's complaint). It also happens on Revert, Load and Replace.
- P2. With look-only picks, the shape drift in `syncLive` l.655 and `normalizeActive` l.667 would overwrite a design's
  stored shape with whatever dice are on the mat the moment it is picked. The suggestion would be lost on first use.
- P3. Four owners of shape and notation (`gameSnap`, `lookSnap`, `gameKeep`, `storyPrev`), each with its own ordering
  rule (memo R3). `endGame` applies `gameSnap`, then `lookRestore` overwrites it.
- P4. Story lobby + Bag pick: `activate` calls `lookDrop()`, so `lookSnap` (which also held the player's **dice**) is gone.
  `storyPreviewOff` → `lookRestore` is then a no-op and the 5d12 preview dice stay as the player's dice. Likely a 4.1
  bug (verify with a spec in slice S3). The same applies to Randomize in the lobby.
- P5. Lobby + set pick: `setOps.open` writes the set's dice under a held preview, and the release then restores stale
  dice (lookSnap) or none.
- P6. Reload mid-Yacht: `save()` writes the game's `custom 5d6` to STORE and `gameSnap` is memory-only, so after a
  reload and End the player's own dice are not restored (likely; verify in S3).
- P7. The game look is a side channel (`lookSnap`): it cannot be edited for real, saved or listed (memo R1/R2).

## 2. Proposed model

### 2.1 Entities

| Entity | Fields (new in **bold**) | Owner / lifetime | Persisted |
|---|---|---|---|
| Design | `{id, name, preview_shape, design}`. `design.shape`/`notation` = **suggested dice** (meaning changes, field does not) | the user; lives until deleted | BAG_STORE, bag file, design file (all v1) |
| Set | `{…, **design?**: designId}` (set-level look link); `terms[].design` unchanged | the user | BAG_STORE, bag file (v1; an additive field that 4.1 keeps on load, because parseBag clones sets whole) |
| Random draft | unchanged (`bag.draft`, `active.draft:true`) | Randomize/Blank until Keep/Discard | BAG_STORE, bag file (as today) |
| **Hold** | `bag.hold = null \| {game, phase:'lobby'\|'game', key, mine:{shape, notation, set, rollSet}, draft:null\|GameDraft}` | created when a game's dice first go on the mat (lobby selection or Start); ends on release or End | BAG_STORE only; `bagFileJSON` strips it |
| **Game draft** | `{kind:'whole'\|'tweak', name, design, base:designId\|null}` | inside the hold; dropped with the hold unless saved | BAG_STORE (inside hold) |
| Active pointers | `bag.active.draft: false \| true \| **'game'**` ('game' = the hold's draft is the live look) | | BAG_STORE; the file maps 'game' to false |
| **Game look declaration** | `GAME_LOOKS` map in main.js: `story:{kind:'whole', name:'Story Dice look', build:plainLookJSON}`, `yahtzee:{kind:'tweak', name:'pips', patch:{numbers:{d6_style:'pips'}}, pref:'look', label:'Use d6 pips', default:true}` | code | the per-game toggle lives in `gprefs.opts['<game>.look']` (UI prefs, **not** engine options, so engine state and GSAVE `state.options` stay byte-identical); GSAVE gains a top-level `look:bool` |

Why `hold` and not the memo's `gdraft`: the memo's `gdraft.dice` only existed for games with a look. PD-206 puts every
game's dice on the mat in the lobby, so the player's dice need one owner whether or not the game has a look. `hold` is
`gdraft` with the dice moved up a level. The memo's function plan (`enterGameDraft`, `leaveGameDraft`, `draftKind`,
kind-aware `bagOps`, `slots`, boot reconcile) carries over unchanged.

### 2.2 Invariants (each one gets a spec assertion)

- **I1 Look-only picks.** Any design load (`activate`, `loadSlot`, `loadDesign`, Revert, Discard, Keep, Duplicate,
  Remove-active, Load file, import Replace, set look link) leaves `state.shape` and `state.notation` untouched.
  `gameKeep` disappears: "keep the dice" is always true.
- **I2 Dice owners.** `state.shape`/`notation` change only through: the shape buttons or Custom editor, the dock formula
  (`tableRoll`), `setOps.open`, the Suggested chip, Randomize with "also shape" (not while a hold exists), and hold
  enter/leave/re-key.
- **I3 Suggestion is written only by an explicit save.** Save, Save as copy, Keep, New/Blank and Load file write the live
  dice as the suggestion. The exception: while a hold exists, or while a set's dice are on the mat (`rollSetId`), Save
  keeps the stored suggestion. `syncLive` and `normalizeActive` never write `shape`/`notation`/`preview_shape`.
- **I4 One record of my dice.** `hold.mine` is captured once, when the hold is created, and never rewritten while the hold
  exists (switching games in the selector re-keys and keeps `mine`). While a hold exists, `save()` writes `mine.shape`/
  `mine.notation` to STORE instead of the live dice. No other overlay remains.
- **I5 Something behind the look (D2).** The live look is always exactly one of: the active design plus pending, the
  random draft, or the hold's draft. `syncLive` writes edits to that entity only. A game draft is never written into a
  design (only "Save as design" makes a new one) and is never in a bag file.
- **I6 One hold.** At most one hold. Ending it restores `mine` (dice, `active.set`, `rollSetId`) and drops the draft. The look
  stays whatever is live, and returns to the player's design only if the draft was live (D1).
- **I7 Undo boundaries.** Undo history resets on hold enter, leave and re-key, and on every design load (as `loadSlot`
  does today). `restore()` never changes `shape`/`notation` while a hold exists.
- **I8 Set look link.** It is applied only when the set is picked (`setOps.open`), look-only, through the same path as a
  Bag pick. A dangling id is ignored. Quick roll (lightning) never changes the look.
- **I9 Typed formulas are yours.** A typed formula, or a set pick, while a lobby hold exists releases the hold first, then
  acts on the player's own dice (PD-192 B, generalised).

### 2.3 Action table

A = the player's active design, B = another design, R = random draft. "dice" = `state.shape`/`notation`.

| # | Action | Context | Dice | Look / bag.active | Hold | Notes |
|---|---|---|---|---|---|---|
| 1 | Pick B (tile, card) | Play, no hold | unchanged | B; `active.design=B` | n/a | as 4.1 |
| 2 | Pick B | Design, no hold | **unchanged** (was: B's shape) | B | n/a | chip `Suggested: d6` appears if B's suggestion ≠ live dice |
| 3 | Pick B | lobby (whole draft live) | unchanged (lobby dice) | B; draft stays listed (ghost), `active.draft=false` | kept | fixes P4: `mine` lives in the hold, not in a look snapshot |
| 4 | Pick B | lobby or game, tweak kind (Yacht pips) | unchanged | draft rebuilt as B+patch; `active.design=B`, `active.draft='game'`, `draft.base=B` | kept | the tweak follows the pick (Q5) |
| 5 | Pick B | game, whole kind | unchanged (PD-158 `pendingLay`) | B, `active.draft=false` | kept | as 4.1 |
| 6 | Pick the game ghost tile | hold with a draft | unchanged | draft live again with its edits | kept | |
| 7 | Load design file / Duplicate / Remove active | any | unchanged | new or next design | unchanged | smoke.spec l.90 changes (intended) |
| 8 | Import bag, Replace | any | unchanged | the file's active design | dropped first (release) | bag.spec l.32/42 change (intended) |
| 9 | Tap `Suggested: dN` | Design, no hold | the design's suggested dice (same path as a shape-button tap or Custom formula; one checkpoint) | unchanged | n/a | the chip is hidden whenever a hold exists |
| 10 | Pick set S (no link) | no hold | S's dice | unchanged; `active.set=S` | n/a | as 4.1 |
| 11 | Pick set S with `design:B` | no hold | S's dice | B applied (look-only, as #1/#2), **every time** | n/a | the set editor's "Keep my look" turns it off per set (Q1) |
| 12 | Pick set S | lobby | release (restore `mine`), then S's dice; pane → Table | as #10/#11 | released | fixes P5 |
| 13 | Pick set S | game | same dice only (`sameDiceAsGame`), else declined as today | link applied look-only | kept | |
| 14 | Quick roll S (lightning) | any | unchanged | unchanged | unchanged | log chips use `t.design\|\|S.design` |
| 15 | Randomize / Blank | no hold | unchanged unless "also shape" | R; `active.draft=true` | n/a | as today |
| 16 | Randomize / Blank | game | unchanged (the "also shape" box is ignored) | R live; the game draft stays listed | kept | D1: R stays after End |
| 17 | Design edits | game, draft live | unchanged (shape controls locked) | edits go to `hold.draft.design` | kept | |
| 18 | Save / Save copy / Revert | the game ghost | n/a | ghost menu: **Save as design** (see #19) and **Discard** (= use my design) | | the active design's Save/Revert act on its own pending only (memo M1 kept) |
| 19 | Save as design (ghost) | lobby or game | unchanged | new design N (look = draft, suggestion = the game's dice); new set "<game> dice" = the game's formula with `design:N` (Story: its face-block term); `active.design=N`, draft dropped | kept, `draft=null` | D3 via the set model (Q2) |
| 20 | Undo / Redo | hold | look only; never crosses hold enter | | | I7 |
| 21 | Open Games, game G selected | no game | G's dice (`G.dice`, Story: options) | G has a look (and the toggle is on): game draft live; else A unchanged | **created** `phase:'lobby'`, `mine` captured | PD-206 |
| 22 | Change options (count, sides, packs, seed, pips toggle) | lobby | rebuilt to the new key | draft rebuilt or dropped (pips off: dropped, A live) | re-keyed, `mine` kept | the Story 5d12→7d12 path from 4.1, now for every game |
| 23 | Select another game H | lobby | H's dice | H's look or A | re-keyed to H, `mine` kept | the old draft is dropped. If the user had picked B, B stays |
| 24 | Roll (empty box) | lobby | the lobby dice are thrown in place on the Games tab | unchanged | kept | PD-205 generalised |
| 25 | Typed formula + Roll | lobby | release, then the typed dice; pane → Table | look → A if the draft was live | released | I9 |
| 26 | Leave Games tab / Design room / close panel / Full view | lobby | `mine` | A if the draft was live, else the pick stays | released | PD-191 |
| 27 | Start | lobby or none | the game's dice (already there from the lobby) | draft reused from the lobby | `phase:'game'` (created if absent) | GSAVE gains `look` |
| 28 | End game | game | `mine` | A if the draft was live, else the pick stays (D1) | released | if Games is still showing G: #21 again (PD-191 "after a game ends") |
| 29 | Reload, lobby hold | boot | `mine` (STORE) | A | dropped. If the app opens on Games, #21 runs fresh | |
| 30 | Reload, paused game | boot | `mine` (STORE) | A; ghost listed | kept if GSAVE id = hold.game, else dropped | PD-191 (c); the Games tab shows G's dice as a lobby (#21 with `mine` from the hold) |
| 31 | Resume | paused | the game's dice | the hold's draft with its pre-reload edits | `phase:'game'` | |
| 32 | Save bag file / Copy JSON | any | | `commitDesigns` saves A's pending as A | stripped | memo S7 |
| 33 | Delete design B | any | | sets with `design:B` lose the link; `terms[].design` as today | if `draft.base=B`: base → active | |

### 2.4 Game looks

| Kind | Built from | A pick of B mid-hold | Save as design | Example |
|---|---|---|---|---|
| `whole` | `build()` from DEFAULTS (today's `plainLook`, made pure: returns JSON and does not mutate `state`) | B replaces it; ghost stays listed | look = draft; name `Story Dice look` (uniqueName) | Story Dice |
| `tweak` | the active design (pending included) + `patch` | the draft is rebuilt from B | look = B + patch; name `<B> pips` | Yacht `Use d6 pips` |

- A tweak whose patch changes nothing (the design already has pips) creates no draft: the saved design is on screen.
- `patch` touches look fields only (`numbers.d6_style`). It never touches faces, dice or shape.
- Glyph faces stay out of designs. They come from the deal (`storyDeal`), as the memo says.
- Games without an entry in `GAME_LOOKS` create a hold with `draft:null`. Their lobby shows their dice in A's look.

## 3. Persistence and back-compat

| Item | Decision | Why |
|---|---|---|
| Design file version | **stays 1, no new field.** `shape`/`notation` keep their names and now mean "suggested dice" | `loadDesign` l.625 and bagmodel `designOK` reject anything but 1, so a bump would make 4.1 refuse every 4.2 export. Old files load unchanged; 4.1 still applies the shape on load, which is fine |
| Bag file version | **stays 1.** New optional `sets[].design` | 4.1's parseBag clones sets whole: it keeps the field and ignores it. v2 stays reserved for faces/characters (custom-set-grammar.md "Version") |
| `bag.hold`, `active.draft:'game'` | BAG_STORE only; `bagFileJSON` strips `hold` and maps 'game' to false; parseBag accepts `hold` only if `game` is a known id, `mine.shape` is in SHAPES and, when `draft` exists, `designOK(draft.design)`. Otherwise it drops it with a note | memo 2.1. Downgrade risk (a 4.1 build reads a 4.2 BAG_STORE mid-game: `draft:'game'` reads as "the random draft is live" if one exists) accepted, artifact only |
| parseBag / importBag | remap `st.design` through `ref()` / `map` like `t.design`. Dangling → drop the link with the note `set <name>: design "<id>" is missing, the set keeps your current look` | |
| Existing saved designs | no migration. Their `shape`/`notation` (often drifted to the last dice used) become the suggestion. Noisy but harmless: a chip the user can ignore | |
| STORE | unchanged keys. `save()` overlay: `mine` dice while a hold exists (I4); the look overlay goes when `lookSnap` goes (S4) | |
| GSAVE | `{id, state, look?}`. An old GSAVE without `look` resumes with the game's default | |
| URL | no formula in the URL today (`?shape=`, `?seed=` are test hooks): unchanged | |
| Golden | must stay identical: `looks.json`, `rolls.json`, `notation.json`, `atlas.json`, `boot-*.json` (boot reads STORE, and `designToJSON` keeps shape/notation), `build.json`, screens `play`/`design`/`bag`. The chip and the set Look control are **not rendered** when they would show nothing (no hidden node), so the design/bag DOM snapshots do not change | |
| Golden, one expected diff | S3 (PD-206): `screens-*.json games.ids.name.text` goes from `D20 · METALLIC PLASTIC` to the Yacht lobby dice (`5D6 · …`), because golden.spec l.141 opens Games with Yacht selected. It is intended, and this is the only re-record (Q4). S5 (pips default on) changes the same shot only through the dice texture, which snapDom does not record | |

## 4. UI spec (existing visual language, no new screens)

| Element | Where | Wording | Behaviour |
|---|---|---|---|
| Suggestion chip | Design room, Look tab, in the Shape section header next to the `#shapes` grid; a small pill styled like the dock die chips | `Suggested: d20` · `Suggested: 3d6+2` (custom) · `Suggested: Standard 7`; title `This design was saved with these dice. Tap to use them` | rendered only when the active design's suggestion ≠ the live dice and no hold exists. A tap applies the dice like a shape-button tap. No chip for the random draft or the game draft |
| Bag tile tooltip | tile/card title | `<name> · suggested d20` | text only |
| Set look link | set editor, a row under the name: `Look` select, the same control as the existing `Dice use`, and only when the bag has 2+ designs | options `Keep my look` (default, no link), then the design names | writes `set.design`. The set list row shows the linked design's chip before the name (the term chip machinery, l.1157) |
| Set pick feedback | status line after `setOps.open` applies a link | `Look: <design> (from <set>)` | no new control. The user restyles by picking another design |
| Story sets editor | unchanged in 4.2. Term-level `@design` stays the Story set's link (`draftOf`) | | the set-level link is not offered on Story sets (one term: `@design` already does it) |
| Lobby dice | the mat (Play room, Games tab), the same as the Story preview today; the setup panel gets one line under the Game select: `On the mat: 5 × d6` (Story: `5 × d12 · Story Dice look`) | | updates on every option change. Released per #25/#26 |
| Pips toggle | setup checkbox row for games with a tweak look: `Use d6 pips`, default per game | | toggling rebuilds or drops the draft in place |
| Game ghost tile | dashed tile as in 4.1, now live and tappable. Header `Story Dice look · draft for this game` / `<B> pips · draft for this game` | menu: `Save as design`, `Rename…`, `Discard` (Discard = "use my design") | never shows Modified (memo D5) |
| Bag header while the draft is live | `draftname` = draft name, `draftpos` = `draft for this game · bag of n`, buttons `Save as design` / `Discard` | | replaces the 4.1 hiding of `#draftact`/`#bagact` (`!!lookSnap`, l.846-847) |

Guide and CHANGELOG (each slice updates its own lines):
- `docs/guide/04-sets-and-editor.md`: a "Sets and designs" paragraph (a set can carry its look: the Look row; picking a design never changes your dice; the Suggested chip). Fix "Dice use" wording if it overlaps.
- `docs/guide/10-games.md`: rewrite "Look and your designs" (l.76-89): every game shows its dice in the lobby, the lifetime rules, the ghost is editable, Save as design makes a design plus a set, Yacht `Use d6 pips`.
- `docs/guide/03-bag-and-shelf.md` (l.3 "tap one to switch to it") and `02-designing-a-die.md` (l.3 "remembers its own look"): add that switching never changes your dice, and that a design's saved dice show as **Suggested**. `07-save-load.md`: loading a design file brings its look; its dice are a suggestion. (The 3.0 CHANGELOG line "Every design keeps its own look, shape and numbers" is history: leave it, and supersede it in 4.2.)
- CHANGELOG 4.2: "Designs are looks", "Sets can carry a look", "Every game shows its dice in the lobby", "The game look is a real draft", "Yacht: Use d6 pips"; Fixed: P4, P5, P6.
- Screenshots: `img/36-story-bag.png` re-shot in S4.

## 5. Edge cases and risks

| # | Case | Decision |
|---|---|---|
| E1 | Design B (suggested d20) picked during a d6 game | look-only, as 4.1. No chip during a hold |
| E2 | Set names a deleted design | link dropped on delete (`bagOps.remove`) and on parse. A stale id at pick time is ignored (I8) |
| E3 | Set names a design; the user restyles, then rolls again with the formula box | no re-apply. The link fires only on a set pick |
| E4 | Set names the design that is already active | no reload, no Undo reset |
| E5 | Set with a link and per-term `@X` terms | link = the live look for unannotated dice; `@X` dice keep X (lookFor) |
| E6 | Imported design or bag with unknown fields | design: `lookFromDesign` ignores them and a re-save drops them (as today). Bag: unknown set fields are kept by `structuredClone`; unknown top-level keys are dropped. Not a regression |
| E7 | Imported 4.2 bag into 4.1 | loads. `sets[].design` is ignored and kept. Design picks there still change the shape (old behaviour) |
| E8 | Old design with `shape:'custom', notation:'2d6+d20+3'` | chip `Suggested: 2d6+d20+3`. A bad or unparsable notation gives no chip |
| E9 | Story sets vs normal sets | the Story editor keeps term-level `@design`. A Story set's "Use in game" ignores the look (the game look rules win). "Roll it" applies its term look as today |
| E10 | Switching Yacht (5d6) → Craps (2d6) → Story (5d12) in the selector | one hold, re-keyed each time. `mine` is never re-captured from lobby dice (I4). The draft is rebuilt for the new game, or dropped |
| E11 | Liar's Dice lobby | shows 5d6 openly (nothing is hidden before Start). Hidden dice begin at Start, as today |
| E12 | Bots | no bots run in the lobby. A pick during a bot's throw queues through `actNext` (unchanged). The bot never picks looks |
| E13 | Lobby preview speed (the reason fbba641 dropped the draft) | enter the draft with `loadSlot`, never `activate()`. Thumbnail key ignores dice (`thumbKey`), so re-keys never re-render pictures. Gate: lobby rebuild ≤ +200 ms over 4.1 (memo 4.3 step 1) |
| E14 | Reload mid-lobby with unsaved edits on the game draft | dropped (lobby drafts are throwaway, PD-191). Edits to a **game** draft survive (#30/#31) |
| E15 | Two tabs open | out of scope (audit A-L5 stays open) |
| E16 | `rollSetId` / `active.set` during a hold | saved in `mine` and restored on release, so the set marker and the dice agree (memo T8 wart) |
| E17 | Randomize "also shape" in Design while a hold exists | cannot happen in a lobby (Design releases it). In a game it is ignored, as today (l.331) |
| E18 | Save on A while A's suggestion differs and set dice are on the mat | Save keeps A's stored suggestion (I3), so a 3d6@x set never becomes A's suggestion by accident |
| E19 | Save as design on a ghost when a design or set name clashes | `uniqueName` on both (`Story Dice look 2`, `Story Dice dice 2`). It never overwrites |
| E20 | Grammar "design default faces" (custom-set-grammar.md, deferred owner 7) | still compatible: faces are not dice count or shape, so a design may later carry faces without carrying a formula |
| R1 | 25+ `bag.active.draft` sites assume one draft slot | audit in S4 (memo risk 3). Truthiness stays "a draft is live" |
| R2 | Boot reconcile (STORE `mine` vs `active.draft:'game'`) | S3 owns the dice half, S4 the look half. Each has a reload spec |
| R3 | Specs that encode "a pick in Design loads the shape" | bagbrowser l.95, smoke l.90, bag.spec l.32/42: intended changes, rewritten in S1 with the reason in the commit |

## 6. Slicing (one worktree and one Sonnet lane each, in order; main stays shippable after each)

| # | Slice | Cards | Files | Specs | Proof | Needs |
|---|---|---|---|---|---|---|
| **S1 (first)** | **Look-only picks + Suggested chip + frozen suggestion.** `loadDesign` stops assigning `shape`/`notation` (drop `L.shape`, the `state.notation=` line l.628 and `gameKeep`); `activate` drops `keep`/`stayPlay` dice logic but keeps `holdRoom` (PD-197); `syncLive`/`normalizeActive` stop writing shape (I3); Save-family writes the suggestion per I3; the chip (rendered only when shown) | PD-202 (part 1) | main.js (~30 lines), index.html (chip slot), app.css | new `design-look-only.spec.mjs` (#1, #2, #7, #8, #9, Revert/Discard keep dice, suggestion survives a pick, I3); update bagbrowser l.95, smoke l.90, bag.spec l.32/42 | the specs above + `test:quick` + golden unchanged (chip not rendered at boot) | none (owner decision 1). No data change: format and version stay 1 |
| S2 | **Set → design link.** `sets[].design`; parseBag/importBag remap; `bagOps.remove` strips it; `setOps.open` applies it (look-only via `activate`); set editor Look row; list chip; quick-roll log chip | PD-202 (part 2) | main.js, bagmodel.js | logic.spec (parse, remap, dangling, 4.1 round trip), `set-look-link.spec.mjs` (#11, #13, E2-E5) | specs + golden unchanged (row hidden with a one-design bag) | Q1 |
| S3 | **Game hold, dice half: every game's dice in the lobby.** `bag.hold` with `mine`; replaces `gameSnap`, `gameKeep`, `storyPrev` (dice part); lobbyOn/lobbyOff for all games; re-key on options and on game switch; Roll in place; release triggers; I9; `save()` writes `mine`; boot drops lobby holds and keeps paused ones; Story keeps `lookSnap` for its look in this slice | PD-206 | main.js (~60 lines), bagmodel.js (parse hold) | new `lobby-dice.spec.mjs` (#21-#30 without drafts, E10, E11, P4/P5/P6 regressions); story-look-lifetime, games-story-ui, game-design-change, games-resume stay green unchanged | specs + full suite + golden with the one named diff (Q4) | Q4 |
| S4 | **Game hold, look half: the game draft.** `hold.draft` kind `whole`; `active.draft:'game'`; kind-aware `bagOps`, `slots`, `renderBag`, thumb queue; ghost Save as design (+ linked set, D3) and Discard; delete `lookSnap`, `lookSwap`, `lookRestore`, `lookDrop`, `viewJSON`, `frozenId` and the `save()` look overlay; boot reconcile | PD-190 | main.js (~80 lines), bagmodel.js | new `game-draft.spec.mjs` (memo S1-S16, adapted: S12 now asserts design + set); rewrite parts of story-draft-design and story-draft-artifact (memo table 3); regression: bagbrowser, owner-comments l.47, nav-rooms, bagsave-commit, story-* | full suite twice, golden unchanged vs S3 | Q2 |
| S5 | **Tweak looks: Yacht `Use d6 pips`.** `GAME_LOOKS.yahtzee` (and others per Q3); the setup toggle; GSAVE `look`; the tweak follows picks (#4) | PD-188 | main.js (~25 lines) | `game-look-pips.spec.mjs` (toggle on/off in the lobby, pick B mid-game → B+pips, End → B, base already pips → no draft, resume keeps the toggle) | specs + golden (pips are texture only; verify) | Q3, Q5 |
| S6 | **Docs and release pass.** Guide pages 04/10 and the Bag page, CHANGELOG 4.2, screenshot re-shoot, artifact (milestone publish routine) | all four | docs/, CHANGELOG.md | none new | owner artifact review | |

S1 and S2 do not depend on S3-S5. S3 can run in parallel with S2 (different areas of main.js: sets vs games) if the
integrator wants two lanes. S4 needs S3. S5 needs S4.

## 7. Open questions for the owner

| # | Question | Recommendation | Cost if wrong |
|---|---|---|---|
| Q1 | A set that names a design: apply that look **every time** the set is picked, with a per-set `Keep my look` option to turn it off? | Yes (your lean). The off switch is per set, not global | Low: a one-line rule in `setOps.open`. A global opt-in toggle can be added later |
| Q2 | D3 in the new model: Save as design on a game look makes the design (with the game's dice as its suggestion) **and** a set with those dice that names it, e.g. `Story Dice look` + set `Story Dice dice` (5d12 with the same faces)? | Yes. Formulas live in sets now, so "saves its dice set too" means a set | Medium: an unwanted set per save clutters the Sets tab (deletable). Without it, D3's dice live only as a suggestion chip |
| Q3 | `Use d6 pips`: only Yacht, or offered on every d6 game (Ten Thousand, Pig, Bunco, Craps, Shut the Box, Ship, Liar's Dice), on by default only for Yacht? | Offer it on every d6 game, on only for Yacht | Low: a map entry per game |
| Q4 | PD-206 changes one golden value on purpose (the Games screen's dice label, Yacht's 5d6 now on the mat). Re-record only that, in S3? | Yes. It is the feature itself. Everything else stays byte-identical | Low. Refusing it means the lobby cannot show Yacht dice by default |
| Q5 | Yacht pips is a tweak: if you pick another design mid-game, is it shown with pips (the tweak follows your pick) or exactly as saved? | Follows the pick (your PD-188 note: "overrides the default dice properties from the selected design") | Low: one branch in the pick path. Wrong means pips vanish on a pick (or appear when not wanted) |

### Card text edits

- **PD-202** title → `Designs are looks: picks never change the dice; 'Suggested: dN' chip; sets can name a design`. Replace
  the description's 'default set' and 'design includes several sets' text with the owner decisions already recorded. Acceptance:
  (1) a pick in Design, Play, a game or a lobby, and Load file, Revert, Duplicate or import Replace, never changes the dice;
  (2) a design's saved dice show as `Suggested: …` in Design and apply on tap; (3) the suggestion survives picks and only changes on
  Save; (4) a set can name a design (Look row), applied on every pick, with `Keep my look`; (5) deleting the design drops the
  link; (6) 4.1 bag and design files load unchanged, and 4.2 files load in 4.1. Note: lands as slices S1 and S2.
- **PD-206** title → `Every game shows its own dice in the lobby (held like Story Dice; Roll rolls them in place)`.
  Add: `Dependencies: none (S3). Introduces bag.hold (one owner of the player's dice). Fixes: a Bag pick or set pick in the Story lobby
  loses the player's dice (P4/P5), reload mid-Yacht loses the player's dice (P6)`. Acceptance = table rows #21-#30. Note
  the one golden diff (Q4).
- **PD-190** title → `Game look as a dotted draft design in the Bag (editable, Save as design + set)`. Dependencies: PD-206.
  Replace "separate bag.gdraft slot" with "bag.hold.draft (docs/design/designs-sets-model.md §2)". Acceptance = memo
  S1-S16 with S12 per Q2.
- **PD-188** keep the title. Dependencies: PD-190. Answer the card's open needs: pips come from `numbers.d6_style`;
  override = a look-only patch (tweak draft), never faces or dice; UI = a setup checkbox row `Use d6 pips`. Add Q3/Q5.
- No merge. The four cards map one-to-one onto S1+S2 / S3 / S4 / S5. S6 rides on the last card to land.
