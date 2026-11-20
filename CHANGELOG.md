# Changelog

User-facing changes. Versions are git tags.

## 4.1 (unreleased)

### New
- **Story Dice.** A new game: roll a set of picture dice (emoji, symbols, icons, hieroglyphs and more), put them in story order on numbered rings, and rate the story they tell with five buttons: Bad 0, Weak 3, Fair 5, Good 7, Great 10. After the roll the dice fly into rows facing the camera. The others at the table judge; computer players tell their own ridiculous ad-lib stories, and the game waits for a human rating, even at a table of only computer players (alone, you rate your own story). The dice stay editable until you submit and are then locked until the next roll. The sentence is drawn on the mat (it wraps) and the rating buttons sit in the dock, so you can play with the side pane closed. A game over screen shows the winner (or your total) and the scores, with **Play again** and **Done**; **End game** asks "End the game? Scores will be lost." first. The roll log keeps each roll's story and names picture dice instead of adding a meaningless sum. Dice you drag grow only a little and stay clear of their neighbours; the arrangement re-spreads when you resize the window or turn the phone, and uses one row on a landscape phone. A game with more than five dice splits into two rows.
- **Story Dice never touches your designs.** It uses a temporary plain look: the Bag shows your own design plus a dashed "Story Dice look (draft)" tile, and your design, unsaved edits, sets and Undo are left alone. A design you deliberately pick mid-game is kept afterwards. The look stays while you are on the Games tab and is released when you pick another game or leave it; a quick roll with Story Dice selected but not started and a formula typed in the dock rolls that formula on your own dice (with an empty roll box it still throws the preview dice: a known issue).
- **Story Dice sets.** Under Games, **Story Dice sets...** lets you see, create, edit, copy and delete sets (glyph packs, number and size of dice, seed, same or different dice, shuffled or in pack order) with a live preview and copyable set text. Saved sets are ordinary bag sets.
- **Picture dice in normal rolls.** A roll formula can deal picture faces, for example `5d12{noto#1}` or `3d6{memes&noto#2}` (add `@name` to deal onto a design from your bag). The same text deals the same faces on every device, and keep highest, advantage and the rest work on them.
- **Gravity slider.** Play > Roll feel > Gravity runs from 1/64x to 2x on a log scale, where 1x is real gravity for a 20 mm d20. The default is the slow-motion feel the dice always had (about 1/23 of realistic) and is marked; Reset puts it back. Throws scale with gravity, so a flick travels and tumbles about the same at any setting.
- **Change a die's design during a game.** In a running game you can pick another design from the Bag, a set with the same dice, or press Randomize: only the look changes. Dice, values and holds stay put. Any design from the Bag works, whatever dice it was saved with (the game keeps its own dice and only takes the look); a set with different dice (another shape or count) is still declined with a message.

### Changed
- **Yacht: no more accidental scores.** On a touch screen, a tap on the scorecard only previews a box; long press it to score (the default; a **Score entry** menu under the card switches to double tap, and shows only on touch screens). A single tap never scores on a phone. With a mouse, a single click scores.
- **Whoopsie! Undo.** After a Yacht score, a 3-second **Whoopsie! Undo** button with a countdown takes the score back. Computer players wait for the window to close.
- **Start game** stays in view in the Games panel, and a tap on the phone's eye button says **Hold to look from above**.
- **Antique relief preset removed.** The Patina and relief sliders still do the same by hand.
- **Slow start no longer breaks the quick roll bar.** If the page took more than ten seconds to start (a slow phone or a busy computer), the die chips and Roll button under the table could lose their layout for the rest of the session. They now keep it.
- **Fixed: Story Dice no longer touches your designs.** The game's look used to be saved into the design you had picked.
- **Fixed: game over screen and Play again.** Story Dice now ends on a proper screen instead of just stopping.
- **Fixed: five-point rating.** Story Dice ratings of 0 / 1 / 2 produced many ties; they are now 0 / 3 / 5 / 7 / 10. Games already in progress keep their totals.
- **Safety net for a misread die.** After dice settle, and again before a score is taken, the game re-checks that each die's value matches the face showing, and corrects it if not.
- **Better stories.** Story Dice sentences read more naturally: a story never repeats a word or echoes itself, "a" and "an" and "some" agree with the noun, long stories end with a closing line that calls back to the hero, and violent or disease verbs are softened around people unless the secret setting is on.

### Under the hood
Main code split into modules (sound, geometry, materials and more) with no change in behaviour, and faster, sharded tests in CI.

## 4.0.1 (2026-11-18)

Fixes from live play of 4.0.

- **Computer players no longer get stuck on a leaning die.** A bot now re-rolls the leaning die itself and carries on with its turn.
- **Picking a design or set in the Bag during a game no longer changes the game's dice.** The game declines the pick ("The game fixes the dice: end it to pick another design or set") until it ends. Long-press design swaps on a single die still work (look only).

## 4.0 (2026-11-18)

### New: the game table
- **Games tab.** Pick a game in the Play room's **Games** tab, set the players, and press **Start game**. The game puts its own dice on the table and your dice come back when it ends. Five games ship: **Yacht** (1 to 6 players, joker rules, a scorecard that suggests what each box would score), **Ten Thousand** (the Farkle-style game: set aside scoring dice, bank, hot dice), **Pig**, **Craps** (play money, line, come, numbers, hardways, props and one-roll bets, odds, a **Rules** help and **Cash out**) and **Liar's Dice** (hidden dice per player, bidding, a **Pass the device** screen).
- **Computer players.** Tick **Bot** next to any name and that seat plays itself.
- **Hold dice.** Tap a settled die to hold it (gold ring); the next roll throws only the rest. A held die that gets bumped is lifted and set back on its face. Leaning dice cannot be held until they settle flat.
- **Scorecard and status.** While a game runs, the Games tab becomes **Scorecard** and the big total is hidden; the status line shows whose turn it is. Bust, hot dice and bank have small animations. Hold the status line (on a phone, the eye in the top-right corner) or the `t` key for a top-down look. Liar's Dice peeks are noted in the roll log, by name only.
- **Resume.** A game in progress is saved on your device and **Resume** restores it after a reload.
- **Change a die's design in play.** Long-press a die on the mat to give it a different design (the look only; it does not change the rules).

### New: roll notation and the quick roll bar
- **Advantage and disadvantage** (`d20adv`, `d20dis`, with a modifier such as `d20+5 adv`) with **Adv** and **Dis** buttons. The dropped die is marked, and a dropped natural 20 or 1 triggers no effect.
- **Keep highest / lowest and drop** (`4d6kh3`, `kl`, `dh`, `dl`; the number defaults to 1).
- **Group rolls**: `4x d20+2` rolls each die separately with the modifier on each; saved sets keep it.
- **Quick roll bar** (the dock along the bottom of the table): type a formula, pick a saved set or a plain die, and roll. A formula that does not parse shows the reason as text.
- **Result tables.** A set can carry a result table that is shown on the roll, in the log and in the text export.
- **Roll log.** Entries have notation titles, per-roll labels and the roller's name; **Copy** and **Save as text** export it. **Initiative tracker**: add a roll to an ordered initiative list with turn and round, or add a named entry with a score by hand.

### New: navigation (two rooms)
- **Design | Play.** One switch changes between the **Design** room (the die floats and turns; the **Look** settings, Undo and Redo) and the **Play** room (dice on the table; tabs **Table**, **Games** and **Log**). Switching never throws the dice.
- **One Roll button.** The gold **Roll** in the dock along the bottom of the table is the only control that throws dice. The dock holds the formula box and chips for d4 to d%, **Adv** and **Dis**; tap a chip to replace, double-click or long-press to add. Games put their actions (Bank, Set aside, Cash out) in the dock.
- **Utilities drawer** with sound, Reset view, Full view, Hints, Pause spin and the Design | Play switch. **Full view** hides the panel; on a phone its handle sits in the tab row.
- **Bag view and Log.** The Log is a tab in the Play room's panel. One round **Bag** button, bottom left, opens the Bag view (Designs and Sets), which is also where the bag is saved, loaded and copied.
- **Set editor is draft-first.** Nothing joins the bag until **Save**; **Close** discards. **New set** opens an empty draft.
- **Undo and Redo** moved to a strip at the top of the Design panel.
- **Phone layout.** The Design | Play switch lives in the Utilities drawer; the leaning and held chips and the look-from-above handle sit at the top right; the dock keeps the formula box and Roll on one row while the chips scroll; long breakdown lines wrap.
- **Shape buttons** work the same in Design and Play and never roll: tap picks one die, double-click or long-press adds one to the formula.

### New: design and feel
- **Base and Numbers.** The Design pane is split into **Base** (substrate, colours, stone, epoxy, face panel, patina), **Numbers** (paint numbers first, font, size, relief, then Filigree) and **Showcase** (spin and Save & export).
- **Flick to roll.** A flick on the mat throws the dice in the direction you flicked, at the speed you let go.
- **Filigree** now runs out to the face edges, including the d20 corners; etched lines go dull like the rest of the surface.
- **Rhombic d12** is available as a d12 shape option.
- **Dropped dice** are shown faded and translucent with no ring.
- **Sliders** Finish and Rotation line up with the Colors sliders; Rotation has -180/0/180 hints.
- Resting dice sit lower in the Play view, and shape or formula changes keep the dice you already have in pose.

### New: loading and diagnostics
- **Boot progress screen** with a tumbling die, the step name, "step N of M" and the elapsed time, so a slow first load is no longer a blank page.
- **Lag monitor** reports long freezes in a toast with copyable diagnostics; it sits clear of the Bag button.
- **"New" callouts.** New or changed controls carry a pulsing dot with a short note; **Got it** dismisses one and **Seen all** the rest on screen.

### Changed
- **Showcase | Roll** is replaced by **Design | Play**; the round mode button is gone.
- **Reset to defaults** is removed from the utilities drawer.
- The game picker offers the five games above; Shut the Box, Ship Captain and Crew and Bunco are not in 4.0.
- Dice that are placed but not rolled no longer leave the Roll button disabled; **End game** stays in the Play room.
- The artifact and offline builds inline the games engine.
- Liar's Dice odds and suggested bids are off by default; turn them on with **Show odds and suggested bids (practice)** in the game's setup.

## 3.0 (2026-11-13)

### New: the dice bag
- **A bag of designs.** The shelf along the bottom holds your dice designs as cards with a picture of each. Tap a card to select it; the mouse wheel scrolls the shelf sideways. Every design keeps its own look, shape and numbers. Add, copy, rename, move and delete from each card's menu; **Randomize** makes a draft you can Keep or Discard without touching saved designs. A changed design shows **Modified** with Save, Revert and Save as copy.
- **Sets.** A set is a named handful of dice (for example `2d6+3` or a mix of designs) that you can roll in one tap. In the **Sets** tab: **Quick roll** gives a total and logs it without leaving the screen; **Open and roll now** puts the dice on the mat and throws them. **Save current dice as a set** turns what is on the mat into a set and opens its editor.
- **Set editor.** Edit the name, the dice terms and the modifier. **Save** and **✕** sit together in the header; ✕ asks before discarding changes. A corner dot and a yellow Save show unsaved edits, and opening another set's editor asks before dropping them. Open it with **Edit…**, the ✎ button (wide screens) or a **long press** (phones). Only one editor is open at a time, and nothing is focused until you tap it.
- **Roll log.** The last 200 rolls with their totals, the set name and the design as colour chips. Tap a set name to bring that set to the mat without rolling it.
- **Unique names.** Sets and designs get the next number on a clash (`Goblin 2`) when copied or renamed.
- **Save, load and copy the whole bag** as one file, with the bag name editable in the sheet title. Single design files still load, as a bag of one. Invalid designs and dangling references are dropped and reported.
- Thin dark scrollbars match the interface.

### New: sound
- **A new sound engine.** Impacts are short recordings of real dice (public-domain CC0 sources, credited in `sounds/CREDITS.md`) chosen by how hard each die hits. Pick a **Sound set** in settings: **Blend** (the default), **Kenney samples**, **Best-of samples**, **Procedural synth** or the **Classic synth**, and switch while you roll. **Audition** plays a sample roll.
- **Best ↔ Kenney blend.** The slider mixes the bright, clacky recordings (wood, plastic) with the darker, richer ones (felt, leather). *Layered* plays every hit from both sets, *Per hit* picks one set for each hit, *Auto* chooses by hardness.
- **Surface (for sound).** Pick felt, carpet, leather, cardboard, wood, plastic, stone, metal or glass. Together with the die material it sets how sharp each hit is, so stone on glass clacks brightly and plastic on felt thuds softly. It changes the sound only, not how the dice roll.
- **Metal / glass ring.** Metal dice, and metal or glass surfaces, ring when struck, more strongly on harder hits. A slider sets the amount (0 is off).
- **Spatial width (stereo).** Each hit is placed left or right by where it lands in the view, and is quieter and duller the farther it is from the camera. 0 is mono; the default is half. It shows on headphones or stereo speakers.
- **Rolling sound.** Soft ticks as each die tumbles across the mat, played with the same sounds and the same stereo placement as impacts. Off by default.
- Overlapping hits are limited so a big roll cannot clip.

### Changed
- **Existing saved settings become a bag of one design** the first time 3.0 opens; nothing is lost.
- **The rolling rumble is gone.** The continuous low noise sounded like wind on a phone microphone. The option is now **Rolling sound** (see above).
- Turning sound on no longer plays a blip (the Test sound button still does).
- The offline copy and the artifact build carry the sound samples inside the file.

## 2.0 (2026-11-11)

### New
- **Roll feel & sound** section: **Bounciness**, **Dice friction** and **Mat friction** sliders. The defaults are slipperier, so dice slide apart instead of snagging. The section moves to the top of the settings pane while you roll.
- **Leaning dice are flagged.** A die resting propped on another, or balanced on an edge, gets an orange ring on the mat and a warning. **Re-roll leaning** drops only those dice in again from above. Nothing hops or nudges on its own.
- **The roll tray is sized from the dice**, by their count and size, instead of from the screen. The camera starts far enough back to show the whole tray, and zoom works freely on top. Standard 7 and big custom sets have room.
- **Showcase and Roll have separate cameras** (angle and zoom), so repositioning one leaves the other alone.
- **Layout toggle:** hide the settings for a full-screen view and bring them back with one button. Settings are visible by default; on a phone they sit under the view.
- **Toolbar along the bottom of the view:** layout toggle, sound, pause/play for the spin, control hints (ⓘ) and the Showcase/Roll switch. The hint text lives behind ⓘ.
- **Sound button on the view.** Sound is now **off by default**; turn it on when you want it. The continuous rolling rumble is a separate option (off by default). **Test sound** plays a blip and reports the audio state.
- **Shared colors:** the three base colors are kept when you change substrate or stone type. A shuffle button beside the swatches re-rolls only the base colors; a paintbrush button next to the stone type paints in that stone's natural colors.
- **Number size from 0.45 to 5 times the face** on a log slider. Big sizes are cropped by the face edges.
- **Clear button** for the custom set: back to a single d20.
- **Spin speed** moved into a Showcase section in settings; the pause button stays on the view.
- Randomize sits in one row with Undo / Redo, with an "Also randomize substrate / shape" line under it. The Export section is now **Save & export**.

### Fixed
- **Load design works on phones.**
- **iPhone:** tapping a text field no longer zooms the page in and cuts off the play field.
- **iPhone sound:** it plays with the ring/silent switch on silent, and wakes up again after you switch apps.
- Toggling the layout on a phone no longer leaves the view pushed up with its title cut off.
- Zoom in the roll view works again; zooming out no longer clips the back of the table.
- A result and a natural 20 effect no longer stay on screen after a die balanced on an edge tips over onto a different face: the dice are read again.
- Rolls that could stall are guarded: an error in one frame can no longer stop the display, a roll that never settles is finished after 25 seconds, and returning to the tab restores audio and size.
- A single die can no longer be left leaning on nothing; the d4 numbering at the corners is the default.

### Under the hood
- A Playwright test suite with CI (`npm test`), covering the physics, the settings and the phone layouts. See [docs/design/testing.md](docs/design/testing.md).

## 1.0 (2026-11-09)

First tagged version: procedural polyhedral dice with swirl, metal, epoxy and stone substrates, numbers, relief and filigree, physics rolling, and design files.
