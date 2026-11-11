# Dice bag — conceptual design (PD-102)

Status: draft for owner review, 2026-11-11. Mock-ups: https://claude.ai/artifact/8mKiUWPknCMLQqevH5PCAk

## Problem

Today one session holds one design, and one design file is one JSON file (`docs/design/design-format.md`). A real player owns a bag: a favourite d20, a cheap set of d6s for damage, a metal "lucky" die, a set per character. Pretty Dice should hold that whole bag, let you flick through it, and roll sets that mix designs ("my gold d20 + two bone d6s + 3").

## Goals

1. **One bag, many designs.** Saved together, survives reloads, exports as one file.
2. **Browse fast on a phone.** Swipe through designs and pick one with one thumb.
3. **Mixed-design sets.** Each die or term in a set can point at a different design.
4. **Named sets.** "Perception", "Eldritch blast", "Longsword damage", optionally grouped by character, with stat bonuses (PD-73).
5. **Roll log keyed to sets** (PD-68): "Perception 17 (d20 12 + 5)".

## Non-goals (this milestone)

- Accounts or cloud sync. The bag stays in the browser plus import/export.
- Sharing links to a bag (later: a compressed bag in the URL hash).
- Full character sheets. A character is a name, a few stat numbers and a list of sets.
- Semi-random generators per character (PD-72). The model leaves room for them.

## Concepts

| Term | Meaning |
|---|---|
| **Design** | Today's design object (shape-independent look: substrate, colours, numbers, relief, filigree). Gets an `id` and a `name`. |
| **Bag** | The list of designs + sets + characters + roll log. One per browser, one per export file. |
| **Active design** | The design the sidebar edits. Selecting a design in the bag makes it active. |
| **Set** | A named roll: terms (`count`, `sides`, `design`) + modifier (number and/or stat references). The current "Custom set" box becomes the unnamed *scratch set*. |
| **Bag set** | A set owned by the bag itself, with no character: Standard 7, Advantage, Stats roll, Fireball. This is the level between designs and characters, and it is enough on its own for most players. |
| **Character** | Optional. A name, stats (`str: 1, wis: 3, prof: 2`...), the character's own sets, and *sheet rolls*: sets the app generates from the stats (skill checks, saves, initiative, and later attacks from a known character sheet). Sheet rolls are not stored; they are rebuilt from the stats and use the character's default d20 design. |

Hierarchy: **Bag → designs + bag sets + characters → each character's own sets + sheet rolls.**

**Rolling direction:** every way into a set leads to the 3D roll mat. Watching the dice tumble and waiting for the result is the heart of the app, so the main control on a set always *sets the dice out on the mat, ready to roll* (showing the faces from the last roll when there is one). Quick roll, which gives the result without leaving the current screen, is the small secondary control.

Key rule: **a design does not own a shape.** The same "Amethyst swirl" can be a d20 in one set and d6s in another. Today `shape` sits inside the design; in a bag it moves to the set term. The showcase keeps a per-design *preview shape* (the shape last shown) so the carousel has something to draw.

## Editing, saving and randomizing

**Modified designs.** Editing a saved design does not overwrite it straight away. The design picks up pending edits and shows a **Modified** badge: a dot on its shelf card and grid tile, and "Modified" beside its name in the editor. Three actions sit beside the badge:
- **Save:** overwrite the saved design. If other sets use it, the button says so first ("Save · changes 3 sets").
- **Save as copy:** a new design next to the original, which goes back to its saved state.
- **Revert:** drop the pending edits.

Pending edits are kept in localStorage, so a reload or switching to another design loses nothing. The badge stays until you save or revert. The showcase, the roll mat and every set that uses the design show and roll it with pending edits included (owner decision). The exported bag file holds only saved designs, plus a pending-edits block so nothing is lost on export or import.

**Randomize makes a draft, not a scramble.** Randomize never scrambles a saved design. It makes a **random draft**: an unsaved design that appears as a ghost card at the end of the shelf, marked "Draft". There is one draft slot:
- Pressing Randomize again replaces the draft, so mashing the button never fills the bag.
- **Keep** adds the draft to the bag as a real design. Editing a draft keeps it a draft until you Keep it.
- Choosing another design leaves the draft in its slot, and **Discard** drops it.
- Undo and redo step back through earlier drafts, so a good roll of the randomizer that you mashed past can still be recovered.

**Rearranging the bag.** Everything in the bag can be reordered:
- **Designs:** drag on the shelf or in the grid (long-press then drag on a phone). The grid also has "Move to start / end".
- **Sets and characters:** drag in their lists.

The order is saved in the bag file. The shelf and grid show bag order. Sorting by name or material is only a view and doesn't change the stored order.

## Dice jail

A die that has been rolling badly can be sent to jail by the player. It then sits out of the game until the player lets it out.

- **Who goes in:** either one die (a design plus a shape, e.g. "Old Bone d4") or a whole design (every shape of "Old Bone").
- **Sentence:** a number of rolls, a date, or forever. Serving the sentence does **not** release the die. Only the player can let it out, and only when they choose to. When the time is up the die shows as "eligible for parole" and the player is asked.
- **Effect at the table:** whenever a set would roll a jailed die, a stand-in of the same shape takes its place. The stand-in is picked 50/50:
  - another design from the bag that isn't in jail, if there is one;
  - or a brand-new random design from the existing randomizer.

  The stand-in is picked when the set is chosen and stays for as long as that set is active, across any number of re-rolls. Once you roll a different set, coming back to the first one picks a new stand-in. On the mat the stand-in carries a small badge ("standing in for Old Bone d4").
- **History:** each roll log entry records its stand-ins: who they replaced, and the full design for a random stand-in (the same JSON as a design file, seed included). Any stand-in can be recovered and adopted into the bag later, from the log or straight from the mat.
- **Counting the sentence:** a roll counts as time served only when the jailed die would have been in that roll. Rolls of other sets don't count. (Owner decision, 2026-11-11.)
- **Ways in:** a "Send to jail" action on a die on the mat (long-press or right-click it). After a natural 1 the app suggests it once. Jail can also be reached from the design's menu in the bag.
- **Where it lives:** a Jail section in the bag (shown as bars over the design's tile). It lists each prisoner, the reason, time served, and Release.
- **Data:** `bag.jail: [{ "design": "bone", "shape": "d4" | null, "since": "<ISO time>", "sentence": { "rolls": 10 } | { "until": "<date>" } | "forever", "served": 3, "reason": "three nat 1s in a row" }]`. It is saved in the bag file, so a die stays jailed across sessions and devices.

Tracked as PD-105.

## File format

```json
{
  "format": "pretty-dice-bag",
  "version": 1,
  "name": "Ryan's bag",
  "designs": [
    { "id": "amethyst", "name": "Amethyst swirl", "preview_shape": "d20",
      "design": { "format": "pretty-dice", "version": 1, "substrate": "swirl", "colors": ["#6f8fe8", "#a784f5", "#d8c4f5"], "...": "today's fields" } }
  ],
  "sets": [
    { "id": "perception", "name": "Perception", "character": "vex",
      "terms": [ { "count": 1, "sides": 20, "design": "amethyst" } ],
      "mod": { "flat": 0, "stats": ["wis", "prof"] } }
  ],
  "characters": [ { "id": "vex", "name": "Vex", "stats": { "wis": 3, "cha": 4, "prof": 2 } } ],
  "active": { "design": "amethyst", "set": "perception" },
  "log": [ { "t": "2026-11-11T19:02:11Z", "set": "perception", "dice": [ [20, 12] ], "mod": 5, "total": 17 } ]
}
```

- The inner `design` objects are byte-for-byte today's v1 design format, so `design-format.md` keeps owning them and validation is reused.
- Ids are short slugs made from the name at creation (`amethyst`, `amethyst-2`), stable after renames.
- **Loading** checks `format`: `pretty-dice` (a single design) → a bag of one, named after the design; `pretty-dice-bag` → validate each design with the existing loader, drop terms that point at missing designs (fall back to the active design) and report what was dropped.
- **Import into an existing bag** (not replace) is the default on load: designs are appended, id clashes get `-2`. "Replace bag" is a second button.
- **Exporting one design** still writes today's single-design file (for sharing a single look, and for the future manufacturing/quote path).
- **Storage:** new localStorage key `prettydice.bag.v1` beside today's `prettydice.v1`; the current saved state migrates on first run into a bag of one. A design is about 1 KB, so 100 designs plus a 200-entry log fit well under the quota. The log is capped (oldest dropped).

## Set notation

Extends PD-27. Adds an optional `@design` suffix per term and stat names in the modifier:

```
d20@amethyst + wis + prof
2d6@bone + 1d8@gold + 3
4d6                      (no suffix = active design, exactly as today)
```

The text box stays the power-user path. Most people will build sets with steppers and tap a design chip per term (mock-ups below). Unknown `@name` or stat names are errors shown under the box, as other parse errors are today.

## Rendering mixed sets

The roll and showcase scenes already build one mesh per die. Each die now gets its material from its term's design rather than from the global state. Cost: one material and texture set per *distinct* design in the set (not per die), cached by design id plus a hash of its settings. A 24-die set with 3 designs builds 3 materials. Editing the active design in the sidebar refreshes only the dice that use it.

## UI concepts (three mock-ups)

All three keep the current app shell: stage, bottom toolbar, Showcase/Roll switch, settings pane. They differ in where the bag lives and what comes first.

### A. Carousel shelf (design-first)
A row of large die cards over the bottom toolbar. Swipe to flick through designs; the centre card is the active design and the stage shows it. Long-press a card for Rename, Duplicate, Delete, Move. A "+" card at the end adds a design (blank, randomized, or loaded from file). Sets live in the existing settings pane under "Sets".
- **Getting there:** there are two ways in from the main UI: a new bag button in the toolbar, and a row at the top of the settings pane showing the active design ("Amethyst Swirl · 1 of 6 in Ryan's bag"). On a phone the shelf slides up over the settings pane, and the stage keeps showing the die. "Edit look" closes the shelf, and the usual settings then edit that design and save it into the bag. The row then reads "Editing Dragon's Gold", and tapping it opens the shelf again.
- **Good:** the most direct answer to "carousel browser"; it is fun and shows off the dice; adds little chrome.
- **Weak:** sets and characters stay buried in the pane; big bags (30+) need search or filters.

### B. Bag drawer (inventory-first)
A pull-up sheet from a new toolbar button (a bag icon). It holds a grid of design tiles with filter chips (All, Metal, Stone, Epoxy, Favourites) and a "Sets" tab beside the "Designs" tab. Tap a tile to make it active; tap "Edit" to drop into the sidebar editor.
- **Good:** scales to big bags; one obvious home for import/export; works the same on desktop (side panel) and phone (sheet).
- **Weak:** it is a modal step between you and the dice; less playful than A.

### B+. Bag sets
The bag's Sets tab: bag sets (no character) at the top, characters below as cards that open their own sets. Same row behaviour as C.

### C. Character sets (play-first)
A character's screen: stats, the character's own sets (Eldritch blast damage, Hex, Dagger), then "From Vex's sheet" (attacks to hit, skills, saves) marked ATTACK/SKILL/SAVE. Each row shows which design each die uses as small coloured chips. Tap a chip to swap that term's design from the bag. Two controls per set:
- **The row (main):** selects the set and switches to the 3D roll mat with the dice set out at random on the mat, showing the faces of the set's last roll. Roll with the Roll button or by flicking the dice. "Roll again" and "Done" return to the list.
- **Lightning button (secondary):** quick roll without leaving the screen. The total appears on the row and in the roll log.

### Desktop
The same concepts in today's layout (310 px sidebar plus stage):
- **A:** the sidebar is the editor for the active design, and the shelf is a strip along the bottom of the stage with a "Whole bag" button.
- **B / B+:** a wider bag panel (Designs, Sets and Characters tabs) replaces the sidebar. The stage previews the selected design, or the selected set laid out on the mat, with "Take to the roll mat".
- **C:** in roll view the sidebar lists sets by scope (Bag sets, Vex, Mira). Clicking one sets its dice out on the mat, which fills the stage. Roll with the button, Space, or a flick. A narrow roll log sits on the right.
- **Good:** what you actually want mid-game; brings in PD-73 and PD-68 naturally.
- **Weak:** the most new UI to build; useless until the data model and mixed sets exist.

### Recommendation
Build **A then C**, with the B grid as A's "see all" view.
1. A's carousel is cheap and fixes the main gap (many designs, quick switching).
2. B's grid appears only when you tap "All designs" from the carousel. It is the management screen: bulk delete, import/export, reorder.
3. Bag sets (B+) come with named sets. Characters and sheet rolls (C) follow as their own phase. In roll view the carousel swaps for the set list, and every set opens onto the mat.

## Phasing (matches PD-102's suggested order)

| Phase | Scope | Done when |
|---|---|---|
| 1. Data model | Bag object, migration, localStorage, import/export, single-design load = bag of one. No new UI beyond Save bag / Load bag buttons. | AC #1: round-trip spec; a v1 design file loads. |
| 2. Bag browser | Carousel (A) + "All designs" grid (B): pick, add, duplicate, rename, delete, reorder. | AC #2. |
| 3. Mixed-design sets | `design` per term, `@name` notation, chips in the custom-set editor, per-design material cache. | AC #3: a set with 2 designs rolls and reads correctly. |
| 4. Bag sets | Named sets owned by the bag (B+), opened onto the roll mat; quick roll; roll log (PD-68). | AC #4. |
| 5. Characters | Character stats, own sets, generated sheet rolls (skills, saves, initiative), default d20 design per character (PD-73). Attacks from imported character sheets come later. | New card. |

Each phase is its own card or branch and ships to `main` on its own. Tests: a round-trip spec for phase 1; one spec per phase for the carousel actions, mixed-material counts (`__pd`) and log entries.

## Open questions for the owner

1. **Shape in the design or in the set?** This plan moves it to the set (one look, any die). Is there a case for a design locked to a shape (e.g. a d20-only metal die)?
2. **Editing a design used by several sets:** settled 2026-11-11. Edits stay pending behind a Modified badge, with Save, Save as copy and Revert (see "Editing, saving and randomizing"). Rolls use pending edits: what you see is what rolls (owner, 2026-11-11).
3. **Does the carousel stay visible in Roll view,** or does Roll view always show the set panel (C)?
4. **Characters:** settled 2026-11-11: bag sets come first, and characters are a separate later level that adds sheet rolls. Still open: which system's sheet comes first (5e skills and saves?) and whether the sheet is imported or typed in.
5. **Bag size:** expected tens or hundreds of designs? Hundreds needs search and thumbnails cached as images.
6. **Thumbnails:** render live (expensive on phones) or snapshot each design to a small PNG when it changes (cheap browsing, stored in the bag)? Plan: snapshots, not saved in the export file.
