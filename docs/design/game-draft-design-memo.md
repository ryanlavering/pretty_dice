# PD-187: the game look as a true draft design (decision memo)

Date 2026-11-20. Read against `origin/v4.1` at cb9488a (PD-187 commits 6babae1, 02c05bf). Design only, no app code changed.
Line refs are `src/main.js` unless stated. Storage keys: settings `prettydice.v1` (STORE), bag `prettydice.bag.v1` (BAG_STORE), game save `prettydice.games.game` (GSAVE).

## 0. Summary

- The owner is right: the game look piggybacks on the player's design. While `lookSnap` is set, the Bag still treats the
  plain Story look as "the active design", so the player's own tile and the Bag header show the white Story dice under the
  player's design name (`slots()` l.832 and `renderBag()` l.839-841 use `liveJSON()` for the active tile).
- The code already has a real draft entity: `bag.draft` plus `bag.active.draft` (bagmodel.js `emptyBag`, `parseBag`;
  main.js `enterDraft` l.681, `bagOps.keep/discard` l.694-696, ghost tile with a dashed outline, app.css l.141 `.ghost .th`).
  It has exactly one slot, used by Randomize/Blank, labelled "Random draft".
- A Story Dice round before fbba641 used that slot (`gameSnap.undraft=...; enterDraft(); plainLook()`). It was replaced by
  the snapshot because (a) a game would wipe the player's own random draft (`enterDraft` sets `bag.draft=null`) and
  (b) setup-preview rebuilds became slow. Both problems have known fixes (a second slot; do not go through `activate()`,
  which awaits `idleThumbs()`).
- I found two overwrite paths that still exist today (section 1.3). They are real data loss and are worth fixing in 4.1
  whatever the owner decides about the full model.
- Recommendation: ship 4.1 with a small mitigation (about 25 lines and 1 spec), and build the first-class game draft
  (option B) as the first 4.1.1/4.2 item. If the owner would rather hold 4.1 for it, the work fits in about one Sonnet lane-day.
  It changes no golden file or screenshot that I can find, but it does change core state handling at final-candidate stage.

## 1. What the system does today

### 1.1 Where the look lives

| Holder | What it is | Persisted |
|---|---|---|
| live `state` (one shared mutable object) | everything the dice render from: look + `shape` + `notation` | yes, via `save()` l.79 to STORE |
| `lookSnap` l.362 | JSON `snapshot()` (DESIGN_KEYS, includes shape/notation/seed) of the player's look, taken by `lookSwap` | no (memory only) |
| `gameSnap` l.1328/1903 | `{shape,notation}` from before the game | no |
| `gameKeep` l.668 | the game's shape/notation while `activate()` loads a design | no (during one call) |
| `storyPrev` l.1974 | setup-preview flag `{rolling,key}` | no |
| `bag.active` `{design,set,draft}` | which entry is live; `draft:true` means the live state is `bag.draft` | BAG_STORE |
| `bag.pending[id]` | unsaved edits of a design (written by `syncLive` l.645) | BAG_STORE |
| `bag.draft` | the single random draft slot | BAG_STORE |
| GSAVE | `{id,state}` engine state (no look) | yes |

Invariant (comment l.636): "the live state is always the active design plus any pending edits". `lookSnap` breaks it
on purpose, and only some readers were patched to know that (`syncLive`, `isLiveModified`, `save`, `enterDraft`,
`normalizeActive`, `activate`).

### 1.2 Transitions today (Story Dice, the only game that sets a look)

| # | Transition | Code | live state | lookSnap | bag.active / pending / draft | STORE | Corruption or wart |
|---|---|---|---|---|---|---|---|
| T1 | Select Story in setup ("selected, not started") | `storyPreviewOn` l.1974 → `lookSwap` l.368 | plain look, custom NdS | player look | `syncLive()` first (writes pending if modified); then frozen | player look (overlay in `save()`) | The Bag header and the active tile show the white dice under the player's design name |
| T2 | Pick another game or close the setup | `storyPreviewOff` l.1976 → `lookRestore` | player look back | null | unchanged | player look | Design-room edits made during the preview are dropped without a word |
| T3 | Start | `startGame` l.1902 | plain, custom NdS | player look (if not already set) | frozen | player look | Undo history is not reset (see T5) |
| T4 | Roll | `gsaveGame` l.1901 | unchanged | same | frozen | same | Log/chips attribute the dice to the player's design (`dieDesignOf` l.1354 uses `bag.active.design`) |
| T5 | Design room while the game runs | `goDesign` l.1523 | edits change the plain look | same | `syncLive` skips; `isLiveModified` returns `!!pending` l.642 | player look | Edits go nowhere and vanish at the end. Undo (`restore` l.383) has no game guard and the history crosses the game start, so it can bring back the pre-game look and the pre-game shape/notation on a running game (likely; verify) |
| T6 | Pick a design in the Bag | `activate` l.669 (`lookDrop`, `gameKeep`) | the picked look, game dice | null | active.design = pick; bag live again | live | Works. The pick stays after the game (rule in 6babae1) |
| T7 | Randomize / Blank | `enterDraft` l.681 | random look, game dice | null | active.draft = true, **bag.draft = null** | live | Wipes any earlier random draft (single slot, by design) |
| T8 | Pick a set | `setOps.open` l.944 | notation/shape = the set's | unchanged | active.set = id | look overlay | The gate `sameDiceAsGame` is fine. `active.set` stays after `endGame` restores the old notation (set marker vs dice may disagree; verify) |
| T9 | End the game | `endGame` l.1907 | shape from gameSnap, then `lookRestore` overrides shape/notation/look again | null | unchanged | player look | Two snapshots restore shape/notation in sequence (ordering-dependent) |
| T10 | Reload mid-game | boot | STORE = player look + pre-game shape | lost | as before | | The game look is not visible until Resume. Edits to it are lost |
| T11 | Resume | Resume button l.2112 → `startGame(..., resume)` | fresh `plainLook` | player look | frozen | | Fine, but rebuilt from scratch |
| T12 | Close the Games panel mid-game | `closeGamesUI` l.1826 | unchanged (storyPrev is null after start) | same | | | Fine |
| T13 | Switch game | setup: T2 then T1; mid-game: End first | | | | | as T2/T9 |
| T14 | Save / Revert / Save bag file mid-game | `bagOps.save/revert` l.687/693, `commitDesigns` l.748 | | | | | **Overwrite bug**, see 1.3 |

Yacht and the other games set no look. They only set shape/notation (gameSnap). T5's undo issue applies to them too.

### 1.3 Overwrite paths that exist today (verified in code, no spec covers them)

1. **Save bag file / Copy bag JSON mid-Story with unsaved edits on the active design.** `commitDesigns()` l.748 runs
   `bagOps.save(id)` for every pending id. For the active id, `isOther(id)` is false, so it falls through to
   `e.design={...liveJSON()}` l.687. `liveJSON()` is the plain Story look. The player's design is overwritten with
   white dice, and their pending edits are deleted.
2. **The active tile's Modified menu, or the Bag block Save/Revert, mid-Story when the design had pending edits.**
   `isModified(active)` is `!!pending` while `lookSnap` is set, so the menu (l.899) and `#bagact` show Save. Save
   (`bagOps.save()`) writes the plain look into the design. Revert loads the player's design over the game look
   while `lookSnap` stays set, so `endGame` → `lookRestore` then puts back a stale snapshot.
3. (Minor) `$('savejson')` l.633 exports the game look under the player's design name (`dname` is never changed).

### 1.4 Why the warts keep coming back

- R1. **One shared mutable `state` stands for two things.** The bag reads `state` as "the active design + pending".
  `lookSnap` makes it secretly "the game's look" instead. Every reader has to be patched by hand. Six have been; at
  least eight have not (`slots`, `renderBag`, `bagOps.save/saveCopy/revert`, `commitDesigns`, `restore`/undo,
  `dieDesignOf`, `savejson`, the `dname` field). Each round of owner review finds the next one.
- R2. **`lookSnap` is a side channel.** It is in memory only and the Bag cannot show it, so there is nothing to see,
  save, rename or reload. The UI can only pretend.
- R3. **Four owners of shape/notation**: `gameSnap`, `lookSnap` (it snapshots shape/notation too), `gameKeep` and
  `storyPrev`, each with its own ordering rule (endGame applies gameSnap, then lookRestore overwrites it).
- R4. **The real draft has one slot and a slow entry**, which is why it was abandoned in fbba641. `enterDraft` drops
  `bag.draft`, and `activate()` awaits `idleThumbs()`.

## 2. The owner's model made concrete: the game draft

### 2.1 Data model (bag format stays version 1; the new fields are optional)

```
bag.gdraft = null | { game:'story', name:'Story Dice look', dice:{shape,notation}, design:{pretty-dice JSON} }
bag.active.draft = false | true | 'game'     // true = the random draft is live (unchanged); 'game' = the game draft is live
```
- `dice` holds the player's pre-game shape/notation, so the in-memory `gameSnap` becomes persisted data. The `design`
  carries the game's dice (custom, e.g. `5d12`) like any live design.
- The random draft (`bag.draft`) and the game draft are separate slots. A game never touches the player's random draft.
- `bag.active.design` is never changed by entering the game draft, which is the whole point: "nothing to restore
  because nothing was overwritten". `bag.pending` is written once by the `syncLive()` that runs before entry (the same
  thing `enterDraft` does today).
- `bagmodel.js parseBag`: accept `gdraft` when `designOK(gdraft.design)` and `typeof gdraft.game==='string'`. Set
  `active.draft = a.draft==='game'&&out.gdraft ? 'game' : !!(a.draft&&out.draft)`. Add `gdraft:null` to `emptyBag`.
  `bagFileJSON` l.741 strips `gdraft` and maps `'game'` to `false` (a bag file never carries a game draft). The import
  merge ignores it.
- Migration: none. Old bags have no `gdraft` and parse as today. Downgrade risk: a pre-change build reading a bag saved
  mid-game would see `active.draft:'game'` coerced to true/false. That only matters mid-game on the single artifact.
  Accepted and noted.

### 2.2 New and changed functions (main.js)

| Function | Change |
|---|---|
| `draftKind()` (new) | `'game'`, `'random'` or `null` from `bag.active.draft`. Truthy checks of `bag.active.draft` keep meaning "a draft is live", so `liveId`, `isLiveModified`, `isModified`, `dieDesignOf` and `normalizeActive` need no change |
| `gameDesignJSON(lookFn)` (new) | builds the plain design JSON from DEFAULTS. It replaces `plainLook()` mutating `state` (l.359); `plainLook` stays as the Story `lookFn` |
| `enterGameDraft(gameId,lookFn)` (new) | If `active.draft==='game'` for the same game, return. Else `syncLive()`. If `gdraft?.game===gameId` (resume), reuse it, else create it. `active.draft='game'`; `loadSlot(gdraft.design, gdraft.name)` directly, **not** `activate()` (no `idleThumbs` wait; this is the fbba641 slowness). `loadSlot` resets the undo history, which fixes the T5 undo issue |
| `leaveGameDraft()` (new) | If the game draft is live: `gdraft=null; active.draft=false;` load `pending[active]||design` with `gdraft.dice` as shape/notation; `normalizeActive()`. If it is not live (the player picked something): just `gdraft=null` |
| `syncLive` l.645 | `if(draftKind()==='game'){ bag.gdraft.design=liveJSON(); return; }` and drop the `lookSnap` guard |
| `enterDraft` l.681 | from `'game'`: `syncLive()` (it writes the game draft, which is fine), then the random draft as today. The game draft stays listed |
| `activate` l.669 | target `'gdraft'` → `active.draft='game'; loadSlot(gdraft.design)`; remove `lookDrop()` |
| `bagOps.keep/discard/rename` l.694-699 | kind-aware. Keep (shown as "Save as design") on the game draft: `addEntry({...j, shape:gdraft.dice.shape, notation:gdraft.dice.notation}, uniqueName('Story Dice look'))`, `active.design=new`, `active.draft=false`, `gdraft=null`. The live dice do not change (the game keeps playing with the new real design, which is now the player's pick). Discard on the game draft = `leaveGameDraft()` |
| `slots()` l.830 | add a ghost tile `{id:'gdraft', name:gdraft.name, draft:true, game:true}` before the random draft |
| `renderBag` l.839 | header `Story Dice look` / `draft for this game · bag of n`; buttons `Save as design` / `Discard`; the random draft keeps "Random draft" (owner-comments.spec l.47) |
| `pruneThumbs` l.769, thumb queue l.820 | keep/queue `gdraft.design`. `thumbKey` ignores shape/notation, so option changes in the preview never re-render it |
| `save()` l.79 | remove the `lookSnap` overlay; STORE is the live state again |
| `startGame` l.1902 | `if(info.look) enterGameDraft(id, info.look)` replaces `lookSwap()`; `gameSnap` comes from/goes to `gdraft.dice` for games with a look |
| `endGame` l.1907 | shape/notation from `gameSnap`, then `leaveGameDraft()` (one owner of shape/notation per game kind) |
| `storyPreviewOn/Off` l.1974-1976, `ssPreviewMat` l.2034 | see D2 |
| boot, after `initBag()` l.654 | if `active.draft==='game'`: make the player's design live (`active.draft=false`, load it with `gdraft.dice`). Keep `gdraft` only if `gsaved()?.id===gdraft.game`, else drop it |
| delete | `lookSnap`, `lookSwap`, `lookRestore`, `lookDrop`, the `gameRun()` special cases in `syncLive`/`normalizeActive` stay (they are about dice, not looks) |

Size: about 60-90 changed lines in main.js (long lines), 6 in bagmodel.js.

### 2.3 Decisions (my recommendation in bold; the owner should confirm D1-D3)

- **D1 End of game.** **If the game draft is still live, the Bag returns to the design the player had (with its own
  pending edits). If the player chose something during the game (picked a design, saved the draft, Randomize), that
  choice stays and the unsaved game draft is dropped.** This is today's rule (6babae1, specs story-draft-design l.38/56
  and game-design-change l.39), so no owner-accepted behaviour changes.
- **D2 Created when selected or when started?** **When the Story setup shows its dice (selection), and discarded when
  the setup closes or another game is picked without starting.** Otherwise the setup preview needs a `lookSnap`-style
  side channel again, and the Bag would lie during setup (scenario "selected but not started"). Fallback if the preview
  measures slow (step 1 of the plan): the preview keeps dice only (glyphs on the player's look) and the draft starts at Start.
- **D3 Shape of a saved game draft.** **The saved design takes the player's pre-game dice (`gdraft.dice`)**, like
  `normalizeActive`'s rule that "a running game's dice are the game's". Saving the Story look outside a game gives
  plain white dice of the player's usual shape. The glyph faces are never part of a design (they come from `storyDeal`).
- D4 Name: `Story Dice look` (tile), `Story Dice look · draft for this game` (header). The dashed ghost outline is shared
  with the random draft. Rename is allowed (it renames the draft; Save as design uses the name).
- D5 Modified: a draft never shows Modified (same as the random draft, l.839 `mod=!draft&&...`). The player's own
  design shows Modified only from its own `pending`, and its tile now shows its own picture (fixes the piggyback).
- D6 Discard on the game draft mid-game = "use my design for this game" (look only, game dice kept). There is no way
  back to the plain look in this round except ending the game. Optional later: Reset.

### 2.4 Transitions under the new model

| # | Transition | live state | bag.active | bag.gdraft | bag.draft (random) | STORE | GSAVE |
|---|---|---|---|---|---|---|---|
| T1 | Select Story in setup | game draft (plain, custom NdS) | draft='game', design=A (unchanged) | created `{game:'story',dice:A's}` | untouched | live | none |
| T2 | Pick another game / close setup | A + pending, A's dice | draft=false | null | untouched | live | none |
| T3 | Start | game draft (reused from T1) | 'game' | kept | untouched | live | written on rolls |
| T4 | Roll | unchanged | | | | | written |
| T5 | Design room edits | the draft changes | 'game' | `.design` = live via syncLive | untouched | live | |
| T6 | Pick design B | B, game dice | design=B, draft=false | kept, listed (can switch back) | untouched | live | |
| T7 | Randomize | random look, game dice | draft=true | kept, listed | replaced (single random slot as designed) | live | |
| T8 | Pick a set (same dice) | set dice; look of the live entity | set=id | kept | | | |
| T9 | End (draft live) | A + pending, `gdraft.dice` | draft=false, design=A | null | untouched | live | removed |
| T9b | End (player picked B mid-game) | B, `gdraft.dice` | design=B | null | | | removed |
| T10 | Reload mid-game | boot: A, A's dice | draft=false | kept if GSAVE matches | untouched | | kept |
| T11 | Resume | the persisted game draft (with the player's edits) | 'game' | reused | | | |
| T12 | Close the panel mid-game | unchanged | | | | | |
| T13 | Switch game in setup | T2 then T1 (fresh draft for the new game, or none) | | | | | |
| T14 | Save bag file mid-game | no overwrite possible: the game draft is not a design, and `commitDesigns` saves A's pending as A | | stripped from the file | | | |
| T15 | Save as design (game draft) | unchanged dice | design=new, draft=false | null | | | |

### 2.5 Game dice constraints (unchanged rules, cleaner reason)

- The game fixes the dice set (PD-154). A Bag pick of any design applies as a look only (`gameKeep` l.629/671; 02c05bf
  removed the design gate). Sets stay gated by `sameDiceAsGame` l.667 (4.0.1 declines).
- The game draft's `design.shape/notation` are the game's. Shape and count controls in the Design room stay game-locked
  as today.
- PD-158 (look-only swap mid-game, dice stay where they lie) keeps using `activate()`, `pendingLay` and `gameKeep`, now
  also for target `'gdraft'`.

### 2.6 Other games

- `GAMES.listGames()` info gets an optional `look` (or a `GAME_LOOKS` map in main.js): `story: plainLook`.
  PD-188 Yacht adds `yahtzee: pipsLook` (`d6Style` pips) and nothing else. Games without a look never create a draft and
  behave exactly as today.
- There is one game draft at a time (one game at a time). A new game of a different kind replaces it.

### 2.7 Deliberately not supported

- Several game drafts, game drafts per player, or a game draft that outlives its game without Save as design.
- A set term that points at the game draft, a game draft in jail or characters, and a game draft in a bag file
  (export strips it, import ignores it).
- Glyph or pip faces saved into a design (faces come from the game deal; a saved look gets the player's dice).
- Changing the game's dice from the Design room.
- Two-tab consistency (state-invariants-audit A-L5 stays open).

## 3. Alternatives

| | A. Keep lookSnap, harden | B. First-class game draft (owner's model) | C. Game "skin" layer that never touches designs |
|---|---|---|---|
| Idea | Patch the unpatched readers (bagOps, commitDesigns, slots/renderBag, undo, savejson) to respect `lookSnap` | Section 2 | Render the game look as a per-die override (like the foreign looks of mixed sets, `lookFor` l.256) on top of an untouched live state |
| Meets the owner's ask | No: still "piggybacking", not savable or editable as a design | Yes: dotted, listed, editable, savable, separate entity | No: not editable in the Design room (the Design room edits `state`); saving needs a converter |
| Fixes R1-R4 | R1 only by more patches; R2-R4 stay | All four | R1/R2 yes; adds a second render path |
| Size | ~25-40 lines, 1-2 specs; 2-3 h | ~70-100 lines in 2 files + 1 new spec + 2 spec rewrites; 6-10 h incl. full regression | ~150+ lines across buildDice/material paths; 1.5-2 days |
| Risk | Low per patch; the warts recur (each new reader of `state` must know about `lookSnap`) | Medium: touches syncLive/activate/renderBag/save and the stored bag shape | High: rendering core (atlas/material sharing in `partCache` l.254), perf, golden looks |
| Test impact | add to story-draft-design.spec | rewrite parts of story-draft-design.spec (l.14-24 `mid` assertions) and story-draft-artifact.spec (l.42-62 "stored equals before" becomes "designs/pending/draft equal; gdraft present"); new game-draft.spec; regression: bagbrowser (random draft l.53-57), owner-comments l.47, nav-rooms l.90, games-story-ui l.9-78, story-design-swap, game-design-change, games-resume | looks/golden at risk (golden `looks.json`, screens) |
| Migration | none | none (optional fields, file export strips) | none |

## 4. Recommended plan

### 4.1 Release call

4.1 is at final candidate (two clean full-suite runs, golden unchanged). B is not a large change, but it moves the
"what is live" truth (syncLive, activate, renderBag, save, boot) under every spec that boots a bag. Golden: I found no
golden capture with a game look live (golden.spec l.137 opens Games with the default `gameId:'yahtzee'`, and Bag
captures have no game), so golden and screens should not change. But the bag sheet, shelf and save paths are in
every run, and a regression there is costly at this stage.

**Recommendation: do not put B into 4.1. Ship 4.1 with mitigation M (below), and make B the first 4.1.1/4.2 item, in its
own worktree with the full pre/post regression.** If the owner says the dotted-draft model is a release blocker, B
fits in about one lane-day. Then 4.1 needs a third full-suite run and owner review of the new artifact afterwards.

### 4.2 Minimal 4.1 mitigation (M), about 25 lines in main.js plus 1 spec

- M1 (data loss, 1.3.1/1.3.2): while `lookSnap` is set, `bagOps.save/saveCopy/revert` on the active design act on its
  `pending` entry as if it were "other" (`isOther(id)` returns true when `lookSnap`), so `commitDesigns` saves the
  player's pending edits, never the game look. Revert drops pending without loading.
- M2 (piggyback, most visible): while `lookSnap` is set, `slots()` and `renderBag()` draw the active tile and header from
  `bag.pending[id]||e.design` (the player's look). A dashed ghost tile `Story Dice look (game)` is added, inert (no
  Save), so the Bag stops showing white dice under the player's name.
- M3 (undo): `lookSwap`/`lookRestore` reset the undo history (`history=[snapshot()];hIdx=0`). `restore()` keeps
  `state.shape/notation` while `gameRun()`, which also covers Yacht.
- Spec: extend story-draft-design.spec with the scenarios S7, S9 and S12 below.
- Golden/screens: unchanged (no capture with a game look live).

### 4.3 Steps for B (Sonnet lane, each step green on its own specs before the next)

1. **Measure first (30 min).** Time `enterGameDraft` in the setup preview with a 12-design bag, using a throwaway branch
   and the PD_PROFILE laps from db7040c. Decide D2 (selection vs start). Gate: preview rebuild at most +200 ms over today.
2. **bagmodel.js.** `gdraft` in `emptyBag`/`parseBag`, `active.draft:'game'`; unit tests in logic.spec (parse, roundtrip,
   old bag unchanged, bad gdraft dropped).
3. **Slots and syncLive.** `draftKind`, `syncLive`, `slots`, `renderBag`, `pruneThumbs`, thumb queue, `activate('gdraft')`,
   `bagOps.keep/discard/rename` kind-aware. Regression: bagbrowser, owner-comments, nav-rooms, bagsave-commit.
4. **Game wiring.** `enterGameDraft`/`leaveGameDraft`, `startGame`/`endGame`, the setup preview, the Story set preview
   `ssPreviewMat`. Delete `lookSnap` and its helpers and the `save()` overlay. Regression: games-story*, story-*,
   game-design-change, games-resume, games-ui.
5. **Boot and resume.** Boot reconcile and Resume reuse. New spec game-draft.spec (S1-S16).
6. **Export.** `bagFileJSON` strips gdraft; import ignores it (S14).
7. **Full suite twice, golden check, artifact build and owner artifact** (memory: milestone publish routine).

### 4.4 Acceptance scenarios (game-draft.spec; A = the player's design, with pending edits in half the variants)

Fixture: bag with designs A (swirl, d20, optionally with pending), B (red, d6), random draft R present in half the
variants, sets `Twenties` (5d20) and `Fivesix` (5d6). Assert on `pd.bag` and both localStorage keys.

- S1 Select Story in setup: the shelf shows a ghost `Story Dice look` tile, active. A's tile shows A's own picture and
  Modified only if A had pending. `bag.designs`, `bag.pending`, `bag.draft` are deep-equal to before.
- S2 Deselect (pick Yacht in setup) and close setup: no `gdraft`, `active.draft===false`, A live with A's dice and pending; storage equals before.
- S3 Selected but not started, then the Design room: an edit goes to `gdraft.design`; A unchanged; then close setup:
  the edit is gone and A is back.
- S4 Start → roll → End: A is live with pre-game shape/notation; designs, pending and the random draft are deep-equal to before; GSAVE removed.
- S5 Mid-game Play ↔ Design ↔ Play: 3D story arrangement kept (PD-180, existing story-design-swap still green); edits land in gdraft only.
- S6 Mid-game undo after edits: never goes past the game start; dice count stays the game's.
- S7 Mid-game, A had pending: Save bag file / Copy JSON → A's saved design = A's pending (not white); the file has no gdraft.
- S8 Mid-game pick B: look B, game dice and values kept; ghost tile still listed; pick the ghost again → plain look back with edits.
- S9 Mid-game pick B, End: B stays active (D1), A untouched, gdraft null.
- S10 Mid-game Randomize: R is replaced by the new random draft (documented); gdraft kept; End → the random draft stays active (D1), A untouched.
- S11 Mid-game set Twenties → declined with the "fixes the dice" message; Fivesix in Yacht → accepted (existing game-design-change).
- S12 Mid-game Save as design on the ghost: new design `Story Dice look` with A's shape (D3); the game continues unchanged; End → the new design stays active.
- S13 Reload mid-game: boot shows A with A's dice, ghost listed (gdraft kept). Resume → the ghost is live with the
  pre-reload edits; End → as S4.
- S14 Reload after End (no GSAVE) with a stale gdraft in storage: boot drops it, A live.
- S15 Ended but selected: End, reopen Games (Story still chosen) → a fresh ghost (no old edits); close → as S2.
- S16 Yacht (no look): the whole round creates no gdraft; existing game-design-change and games-resume are unchanged.

## 5. Top risks

1. Boot/resume reconcile (S13/S14): the live STORE and the bag's `active.draft` must agree at boot. A mistake shows the
   player white dice after a reload, or drops their pending edits.
2. Setup-preview performance (the reason fbba641 abandoned the draft): it must not go through `activate()`/`idleThumbs`.
   Measure before committing to D2.
3. Hidden readers of `bag.active.draft===true` / `bag.draft` that assume a single slot (grep `active.draft` gives 25+
   sites). Truthiness stays correct, but any site that reads `bag.draft` while the game draft is live would act on the
   random slot. Step 3 must audit each one.
