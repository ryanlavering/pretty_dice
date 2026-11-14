# Navigation migration plan: Two rooms (PD-142.38, deliverable 3)

Status: 2026-11-14. The owner chose proposal A from [ui-navigation-proposals.md](ui-navigation-proposals.md). This plan turns it into slices that each land on `v4` alone and leave the app working. Evidence and control names (R1-R12, D1-D11) are from [ui-controls-audit.md](ui-controls-audit.md). Picture: [ui-navigation-mockups/a-two-rooms.jpg](ui-navigation-mockups/a-two-rooms.jpg).

## Owner decisions (2026-11-14)

1. **Two rooms**: one switch, **Design | Play**. It changes room and never throws dice.
2. **Full view** is required: a collapse handle on the pane (right end of the tab row on phone, panel edge on desktop) hides the side/bottom pane; a matching handle at the screen edge brings it back. "Full view" is also in the drawer and on the H key. Strip, dock and drawer stay visible.
3. **Die chips load, they do not throw.** Tap d20 loads a d20, tap again makes 2d20. Only the dock's Roll button throws.
4. **Desktop scorecard** moves into the left panel's Scorecard tab. Nothing floats over the mat.
5. **Randomize is not a mat action.** It stays in the Look tab with its substrate/shape checkboxes.
6. **Undo and Redo sit on the mat in the Design room**, always available there (full view included), on one row with the shelf. Not shown in the Play room; Ctrl+Z works everywhere.
7. **The shelf keeps its [+] slot** at the end. "Blank" and "Random" both open the same draft, differing only in the starting look.

## Target layout

| Part | Design room | Play room, free roll | Play room, game |
|---|---|---|---|
| Top strip, left | Design / Play switch (phone). On desktop the switch heads the side panel | same | same; a dot on Play while a game runs and you are in Design |
| Top strip, middle (hold = top-down) | die name | total, formula under it | game status; mat total hidden |
| Top strip, right | drawer | drawer | drawer |
| Mat bottom row | Undo, Redo, shelf, [+] | dock: formula box + gold **Roll** | dock: game actions (Bank, Cash out) + hint + gold **Roll N** |
| Above the row | none | result chips: "Fix leaning dice", "N held · release" | same |
| Tabs | Look · Bag · Sets | Table · Games · Log | Table · Scorecard · Log |
| Round mat buttons | none | none | none |

Drawer contents (paired-circles button; opens as a wide pill, then slides shut): Sound, Reset view, Full view, Hints, and Pause spin in the Design room.

Tab contents:

| Tab | Holds (from today's UI) |
|---|---|
| Look | Randomize + options, Shape, Custom set dice, Substrate, Colours, Finish, Numbers, Relief, Filigree, Showcase spin, Export image, design name, Save/Load design |
| Bag | design tiles with menus, + Add, Save/Load/Copy bag, "bag modified" state. Phone: an expand control opens today's full-screen sheet |
| Sets | saved sets list, set editor, "Save the current dice as a set" |
| Table | Dice to roll (chips incl. Adv, Dis), Saved sets (tap = load), Roll feel and sound, Shake to roll |
| Games / Scorecard | setup; while playing: scorecard, game actions that are not Roll, End game, Rules |
| Log | roll log with Copy, Save, Clear, roller name, labels, initiative (PD-142.14.1.8) |

Keys: R and Enter = press the dock button. Space = Randomize in the Design room only. H = Full view. T = top-down. Double-click still resets the view.

## Rules for every slice

- One lane edits one region; post `TOUCHING` first. Lanes: **games-ui** owns mat, strip, dock, room switch, game wiring. **settings** owns the panel, tabs, drawer, quick bar, notation. **guide** owns `docs/guide/`. **design** (this lane) reviews each slice against this plan and keeps the plan current.
- Per-feature tests only; the integrator runs a checkpoint after slices 3, 5 and 7.
- Element ids stay where a control survives (`#snd`, `#logpanel`, `#gamepanel`, `#scorepane`, `#paneltabs`). When a control is removed, its id goes in the same slice as the spec change.
- No slice may add a round mat button or a second roll button, even temporarily.

## Slices

| # | Slice | Lane | Depends on |
|---|---|---|---|
| 0 | Navigation test helpers | settings | none |
| 1 | Utility drawer, Reset view, Full view | settings | 0 |
| 2 | Dock with the one Roll button (free roll) | games-ui | 0 |
| 3 | Game roll moves into the dock | games-ui | 2 |
| 4 | Top strip and the Design / Play switch | games-ui | 2 |
| 5 | Panel sorted into room tabs | settings | 1, 4 |
| 6 | Scorecard, log and bag into tabs; last round buttons go | games-ui, then settings | 3, 5 |
| 7 | Duplicate cleanup, guide refresh | settings, guide | 6 |

Slices 1 and 2 can run in parallel (different lanes, different regions). 3 and 4 are both games-ui and run in that order.

### 0. Navigation test helpers (test code only)

Add to `tests/helpers/app.mjs`: `nav.toPlay()`, `nav.toDesign()`, `nav.openBag()`, `nav.openGames()`, `nav.openLog()`, `nav.openDrawer()`, `nav.roll()`, `nav.fullView(on)`, each wrapping today's selector. Switch the specs and `scripts/guide-shots.mjs` to them. Later slices then change one helper instead of many specs.

- Specs touched: the 5 using `#mode`, 3 `#gamesbtn`, 4 `#bagbtn`, 2 `#logbtn`, 1 `#layout`, 2 `#snd`, 1 `#spinbtn`, and `#gamepanel button.big` where it means "roll" (8 specs).
- Done when: no spec outside the helper names those selectors; the touched specs pass unchanged.

### 1. Utility drawer, Reset view, Full view

- Build the drawer per [ui-notes.md](ui-notes.md): wide pill on first show in a session, slides to the paired-circles button; tap to reopen; closes on outside tap.
- Move Sound, Hints, Pause spin and Layout into it (keep `#snd`, `#info`, `#spinbtn` ids on the items). Pause spin shows only in the Design room.
- New **Reset view** item calling the same code as double-click (angle and zoom of the current view).
- **Full view**: one state replacing "hide settings" and "calm". Add the collapse handle on the pane and the restore handle at the screen edge. H toggles it. The long-press on the layout button goes.
- Remove the panel's "Sound effects" checkbox (D3); volume and sound-set controls stay.
- Round buttons left after this slice: Games, Bag, Log, Mode.
- Tests: new `nav-drawer.spec.mjs` (pill then button, item count never 1, Reset view restores az/el/zoom, Full view hides the pane on both sizes and both handles restore it, drawer reachable in Full view). Update `nav.openDrawer`, `nav.fullView`, sound spec.

### 2. Dock with the one Roll button (free roll)

- New dock row at the bottom of the mat in roll view: the quick bar's formula box plus one gold button `#rollbtn`. Empty box = the current dice; placeholder shows what is loaded ("2d6+3 · Thorn axe").
- Die chips leave the dock. Until slice 5 gives them the Table tab, they sit at the top of the roll-view panel. A chip tap loads (adds one die of that type to the box); it does not throw. Adv/Dis join the chips and lose the "Roll..." titles.
- Set lightning button and "Open and roll now" become "Open" (load and go to the Play room, no throw) (R10, R11).
- "Re-roll leaning" is reworded "Fix leaning dice" (R5).
- The panel switch's Roll half stops re-rolling in roll view (R1 becomes a pure switch).
- R, Enter in the box, flick and shake all go through the same function as `#rollbtn`.
- Fixes PD-142.40's clipped quick bar on phone: the row is a box and a button, nothing scrolls.
- Tests: new `nav-dock.spec.mjs` (exactly one visible element that throws in roll view at 1280x800 and 390x844; chip tap changes the formula and not `rollT`; Enter and R equal a click; set Open does not throw). Update quick-bar tests in the notation/group-roll specs, bag sets spec (lightning), `nav.roll`.

### 3. Game roll moves into the dock

- In a game the dock shows the game's secondary actions and hint on the left and the gold button with the game's label ("Roll 5", "Roll 3 under the cup"). Disabled on bot turns and pass-the-device screens.
- Remove Roll from the desktop game panel, the phone strip and the Scorecard pane (R6-R9). The phone strip keeps status only and stays the top-down handle.
- Bank / Cash out move beside the dock button; scoring picks, craps spots, bids and Challenge stay in the panel.
- Tests: all 8 `#gamepanel` specs change their roll click to `nav.roll()` (one helper edit if slice 0 was thorough); `games-phone` asserts one roll control; Liar's Dice spec for the cup label; bots spec for the disabled state.

### 4. Top strip and the Design / Play switch

- The strip appears in every mode: switch (phone), middle text, drawer. Hold the middle for top-down in the Play room.
- Replace the panel's Showcase | Roll with **Design | Play** (desktop: panel head; phone: strip). Remove the round mode button (R2). The switch never throws; entering Play shows the dice as they last lay, or placed unrolled the first time.
- A running game survives a visit to Design; Play carries a dot. Both switch halves always work (fixes the dead buttons in games).
- Design room bottom row: Undo, Redo, shelf, [+] on one row. Remove Undo/Redo from the panel. [+] menu: Blank and Random open the same draft; "From a file" stays.
- Randomize is hidden in the Play room; Space does nothing there.
- Tests: new `nav-rooms.spec.mjs` (switch does not change `rollT`; game state kept across Design and back; Randomize and Space inert in Play; Undo/Redo visible in Design incl. Full view; strip hold = top-down). Update `nav.toPlay/toDesign`, logic undo/redo spec, hold spec line that leaves roll view, boot/smoke specs that click `#mode`.

### 5. Panel sorted into room tabs

- Generalise `#paneltabs` to both sizes: Design = Look · Bag · Sets, Play = Table · Games · Log, with the collapse handle at the end of the row. The last tab per room is remembered.
- Look and Table are today's panel sections re-sorted per the table above. "Reset to defaults" moves to the drawer.
- Bag and Sets tabs can start as buttons that open today's sheet on the matching tab; slice 6 brings them inline.
- Tests: update the phone tab spec (`games-phone`), settings/advanced specs that scroll to a section (use the tab first), `guide-shots.mjs` `panelAt`. New assertions in `nav-rooms.spec.mjs`: every screen reachable in at most two actions from every other, on both sizes.

### 6. Scorecard, log and bag into tabs; last round buttons go

- games-ui: the desktop floating game panel becomes the Scorecard tab content (`#scorepane` on both sizes); setup lives in the Games tab; the tab renames to Scorecard while a game runs and is selected when a game starts. Remove the round Games button.
- settings: the roll log renders in the Log tab (keep `#logpanel`); remove the round Log button. Bag and Sets render inline in their tabs on desktop; phone keeps the full-screen sheet as the expanded view. Remove the round Bag button and the panel bag row (D2).
- After this slice the mat has no round buttons.
- Tests: `games-ui`, `games-turn-ui`, `games-resume`, `games-button` (delete or repoint), log specs, bag browser and bag sets specs via `nav.openBag/openLog/openGames`. Check the craps table fits the panel width at 1280 and 1024.

### 7. Duplicate cleanup and guide refresh

- One place to save, load and copy the bag: the Bag tab (D4). One formula entry per room: Look's Custom set for the design, the dock for rolling; the set editor keeps its own (D8, D9). Pencil on set rows on phone too.
- Rewrite the hints text for the new layout.
- guide: redo pages 01, 03, 05, 06, 08, 10 and regenerate shots; update the playtest brief's "where things are".
- design: rerun `scripts/ui-audit.mjs` (update its state paths) and add an "after" table to the audit: round buttons 7 to 0, roll buttons on screen 9 to 1, switches 3 to 1.
- Integrator: full regression checkpoint, then owner review on phone.

## Acceptance for PD-142.38 AC #4

- At 1280x800 and 390x844, in every state the audit script visits, at most one visible control throws dice, and in the Design room none does.
- The drawer exists in every state, holds at least Sound, Reset view, Full view and Hints, and never holds one item.
- Full view hides the pane on both sizes and is reversible from a visible handle.
- From any screen, any other screen is at most a room switch plus a tab away.
- No round buttons remain on the mat.

## Open points

- Entering Play for the first time: dice placed unrolled, or the showcase die sitting on the mat? The plan assumes placed unrolled; cheap to change in slice 4.
- Initiative tracker and table lookup (settings, landed after the audit) are assumed to live in the Log tab and the Table tab; settings to confirm in slice 5.
- Landscape phone (844x390) is not designed here; the pane should default to Full view there.
