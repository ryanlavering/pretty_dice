# UI controls audit (PD-142.38, deliverable 1)

Status: 2026-11-14, taken from the running app at `v4` b266154 (design lane, port 8136).

How it was made: `scripts/ui-audit.mjs` boots the app under software GL in 23 UI states at two sizes (desktop 1280x800, phone 390x844 with touch), lists every visible interactive element with its position and whether something covers it, and takes a screenshot. A second pass performs each roll trigger, key and mat gesture in four contexts and records what changed in `window.__pd`. Raw data: [ui-audit/controls.json](ui-audit/controls.json), [ui-audit/behaviours.json](ui-audit/behaviours.json), screenshots in [ui-audit/](ui-audit/). Regenerate with `PD_LOCK_NOTE="..." sh scripts/with-test-lock.sh node scripts/ui-audit.mjs` (about 35 minutes; pass state names to run a subset).

Not covered: the phone set editor (the script used the desktop pencil, which phones do not have), the sound audition tool, the model lab (`Load model`), file dialogs, shake-to-roll (needs a motion sensor) and touch pinch. A synthetic mouse flick did not start a roll, so flick is listed from the hints text, not measured.

## Headline numbers

| | Desktop | Phone |
|---|---|---|
| Controls in the page, showcase | 88 | 89 |
| Controls on screen at once, showcase | 41 | 27 |
| Controls on screen at once, roll view | 41 | 26 (2 covered by other controls) |
| Round buttons on the mat, every mode | 7 | 7 |
| Buttons on screen that throw dice, roll view | 9, plus "Re-roll leaning" when shown | 6 (2 more clipped, 3 off-screen) |
| Buttons on screen that throw dice, in a game | 2 | 2 |
| Other ways to throw | R key, flick, Enter in the quick bar, shake (phone), set lightning button, set menu "Open and roll now" | same |
| Ways to change Showcase/Roll | 3 (panel switch, round button, R key) | 3 |
| Ways to open the bag | 2 buttons, plus the shelf | 2 buttons, plus the shelf |

## The seven round mat buttons

They never leave, in any mode, including inside a game. Two change meaning with the view.

| Button | Position | Showcase | Roll view | In a game | Duplicate of |
|---|---|---|---|---|---|
| Games `#gamesbtn` | left column, top | opens game setup | same | reopens the panel | phone tab "Games/Scorecard" |
| Bag `#bagbtn` | left | opens the bag sheet | same | same | panel bag row `#bagopen` |
| Sound `#snd` | left | sound on/off | same | same | panel "Sound effects" checkbox |
| Layout `#layout` | left, bottom | hides the settings panel; icon becomes a gear | same | same | H key and long-press give a different "calm" view |
| Pause spin `#spinbtn` / Log `#logbtn` | right, top | pause spin | **swaps to** roll log | log (pause spin in Liar's Dice before the first roll) | none |
| Hints `#info` | right | shows the shortcut text | same | same | none |
| Mode `#mode` | right, bottom | die-face icon: go to roll view and throw | **cube icon: back to showcase** | **does nothing** | panel Showcase/Roll switch, R key |

## Every control that throws dice (ROLL)

| # | Control | Where | When visible | What it does (measured) |
|---|---|---|---|---|
| R1 | Panel switch, "Roll" half `#roll` | settings panel, top | always (phone: when the Settings tab shows) | showcase: go to roll view and throw. Roll view: throw again. In a game: takes a game roll (rolls used 1 -> 2) |
| R2 | Round mode button `#mode` | mat, bottom right | always | showcase: go to roll view and throw. Roll view: leaves to showcase. In a game: nothing |
| R3 | Quick bar "Roll" | mat, bottom | roll view, not in games | throws the typed formula; with an empty box throws the current dice |
| R4 | Quick bar die chips d4, d6, d8, d10, d12, d20, d% (7 buttons) | mat, bottom | roll view, not in games | replaces the dice with one die of that type and throws (5 dice -> 1) |
| R5 | "Re-roll leaning" chip | mat, under the total | when a die settles cocked | re-rolls the leaning dice |
| R6 | Game panel big button ("Roll", "Roll 5 dice", "Roll (set aside first)") | desktop: floating panel top right | in a game | takes a game roll |
| R7 | Game strip "Roll" / "Roll 5" | phone: strip at the top of the mat | in a game | takes a game roll |
| R8 | Scorecard pane big button | phone: Scorecard tab | in a game | same as R7; **R7 and R8 are on screen together** |
| R9 | "Roll N dice under the cup" | game panel / Scorecard tab | Liar's Dice | private roll; also duplicated by the strip Roll on phone |
| R10 | Set row lightning button | bag sheet, Sets tab | per saved set | opens the set and throws |
| R11 | Set menu "Open and roll now" | bag sheet, Sets tab, row menu | per saved set | same as R10 |
| R12 | Advantage / Disadvantage `#notadv` `#notdis` | settings panel, Custom set | custom set selected | changes the set to 2d20 keep high/low (titled "Roll the d20 with...", does not throw by itself) |
| G1 | R key | anywhere | always | same as R1, including inside a game |
| G2 | Flick on the mat | mat | roll view | re-roll from where the dice lie (hints text; not reproduced by the script) |
| G3 | Enter in the quick bar box | mat | roll view | same as R3 |
| G4 | Shake the phone | n/a | phone, opt-in checkbox | re-roll (not measured) |

Count on screen at one moment: roll view desktop R1 + R3 + seven R4 = 9, plus R5 at times. Phone roll view shows R1, R3 and four R4 chips; d8 sits under the round mode button, d10 is cut by the screen edge, and d12, d20, d% are off-screen in a scrolling bar ([roll-phone.jpg](ui-audit/roll-phone.jpg)). In a game: desktop R1 + R6, phone R7 + R8 (and R9 in Liar's Dice).

## Controls by mode

### Showcase ([desktop](ui-audit/showcase-desk.jpg), [phone](ui-audit/showcase-phone.jpg))

| Area | Controls |
|---|---|
| Mat | 7 round buttons; shelf of design cards with "+ Add" (menu: New blank design, Random draft, From a file); die name caption |
| Panel head | Showcase / Roll switch (R1); bag row (opens the bag sheet; "Save bag" link once the bag is modified); Randomize, Undo, Redo; "Also randomize" substrate and shape checkboxes |
| Panel body (scrolls, 47 more controls on desktop) | Shape (12 buttons), Custom set editor when Custom is chosen (formula box, Apply, Adv, Dis, reset, per-die steppers, modifier, set name, Save as set), Substrate (6), Colours, Finish sliders, Numbers, Relief and patina, Filigree, Showcase spin, Roll feel and sound (13 controls), Export image, Files (design name, Save/Load design, Save/Load/Copy bag), Reset to defaults |
| Phone difference | Mat is the top half; the panel head starts at y=467 of 844, so the switch, bag row and Randomize fill the rest of the first screen |

### Roll view ([desktop](ui-audit/roll-desk.jpg), [phone](ui-audit/roll-phone.jpg), [held dice](ui-audit/roll-held-phone.jpg), [log](ui-audit/roll-log-desk.jpg))

| Area | Controls |
|---|---|
| Mat | 7 round buttons (log replaces pause spin); total (hold for top-down); breakdown line; chips "N dice are leaning", "Re-roll leaning" (R5), "N dice held · release"; quick roll bar: formula box, Roll (R3), 7 die chips (R4); shelf hidden |
| Roll log panel (from the log button) | Copy, Save, Clear, close, "Who is rolling?" box, "+ label" per entry. Desktop: floats top right. Phone: over the mat |
| Panel | Same head as showcase, **including Randomize**; the body reorders so "Roll feel & sound" comes first |
| Phone difference | Quick bar is clipped as above. With held dice the chips and breakdown cover the panel head (3 covered controls) and the dice (owner screenshot [2026-11-14-phone-crowding-20d4.png](screenshots/2026-11-14-phone-crowding-20d4.png)) |

### Game ([Yahtzee desktop](ui-audit/game-yahtzee-rolled-desk.jpg), [Yahtzee phone](ui-audit/game-yahtzee-rolled-phone.jpg), [Craps phone](ui-audit/game-craps-phone.jpg), [setup desktop](ui-audit/games-setup-desk.jpg), [setup phone](ui-audit/games-setup-phone.jpg))

| Area | Desktop | Phone |
|---|---|---|
| Setup | floating panel top right: Close, Game, Players, name + Bot per seat, per-game options, Start game | same content in a Games tab; [Settings / Games] tab row appears above the panel |
| Playing | floating panel: title, "Scorecard" collapse, End game, status line (hold for top-down), big Roll (R6), game actions (Bank, Cash out, suggestion buttons, craps table with 30+ spots and 5 chip sizes, Rules), scorecard cells | strip on the mat: status (hold for top-down) + Roll (R7), plus Bank in Pig. Tab row [Settings / Scorecard]. Scorecard tab: End game, status again, Roll again (R8), actions, scorecard |
| Mat | all 7 round buttons stay; total and quick bar are hidden; holds by tapping dice | same |
| Left panel | unchanged: Showcase/Roll switch, bag row, Randomize, all settings | hidden while the Scorecard tab shows |

### Bag sheet, sets and editor ([designs](ui-audit/bag-designs-phone.jpg), [sets + menu](ui-audit/bag-sets-saved-phone.jpg), [set editor](ui-audit/bag-set-editor-desk.jpg), [design menu](ui-audit/bag-design-menu-desk.jpg))

Full-screen sheet over everything (the 40 or so controls beneath stay in the page but are covered).

| Area | Controls |
|---|---|
| Header | title, "Bag modified" badge, Save bag to file, Load bag file, Copy bag JSON, Close (Esc also closes) |
| Tabs | Designs, Sets |
| Designs | tile per design (tap = make active; menu: Rename, Duplicate, Move left/right/start/end, Delete), "+ Add" tile |
| Sets | "Save the current dice as a set"; per set: main button (open the set), lightning (R10), pencil (edit; **desktop only**), menu (Edit, Make a copy, Open and roll now (R11), Move up/down, Delete) |
| Set editor (inline card) | name, Save, close, 10 preset buttons, formula box, 9 die steppers, modifier stepper. It repeats the panel's Custom set editor |

## Keys and gestures (measured unless noted)

| Input | Showcase | Roll view | In a game |
|---|---|---|---|
| R | go to roll view and throw | throw again | takes a game roll |
| Space | randomize the design | **randomizes the design** | **randomizes the design mid-game** |
| H | calm view: panel and 6 of 7 round buttons hide | same | not measured |
| Long-press the layout button | calm view | only hid the panel in the test | not measured |
| T held, or hold the total / status line | nothing | top-down view, all round buttons step aside | top-down view |
| Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z | undo / redo design changes | same | same |
| Esc | closes the bag sheet or its menu | same | same |
| Enter | applies the formula in whichever box has focus | same | n/a |
| Drag | turns the die | (flick throws, per hints) | n/a |
| Right-drag, two-finger drag | orbits the camera | same | same |
| Wheel, pinch | zoom | same | same |
| Double-click the mat | **resets camera angle and zoom; the only reset there is** | same | same |
| Tap a settled die | n/a | hold / release (gold ring) | hold where the game allows |
| Right-click or long-press a shelf card | opens its menu | n/a | n/a |

## Duplicates and conflicts

| # | What | Places |
|---|---|---|
| D1 | Showcase/Roll switch | panel switch; round mode button; R key |
| D2 | Open the bag | panel bag row; round bag button. "+ Add" is on the shelf and in the sheet |
| D3 | Sound on/off | round sound button; "Sound effects" checkbox in the panel |
| D4 | Save / load / copy the bag | panel "Save bag" link; panel Files buttons; sheet header icons (3 places for save) |
| D5 | Hide the UI | layout button (panel only); H or long-press (calm view); top-down hold also clears the buttons |
| D6 | Top-down view | hold the total; hold T; hold the game status (on phone the status is shown twice, strip and Scorecard tab) |
| D7 | Game Roll and status | phone shows both the strip and the Scorecard tab copies together |
| D8 | Formula entry | panel Custom set box + Apply; quick bar box + Roll; set editor formula box |
| D9 | Set editing | panel Custom set editor; bag sheet set editor; pencil and menu "Edit" both open the latter |
| D10 | Throwing dice | 12 button kinds and 4 gestures (table above) |
| D11 | Games entry | round Games button; the phone tab once it exists |

## Problems the audit turned up

1. **No visible reset-camera control.** Double-click is the only way and the hints overlay is the only place that says so.
2. **The round mode button means three things**: "roll" in showcase, "leave" in roll view, nothing in a game. The panel's Showcase half is also dead in a game. Neither gives feedback.
3. **The right column swaps a button** (pause spin / log) between views, so the same spot does different things.
4. **Randomize and Space work in roll view and during a game**, changing the dice under a running game.
5. **R and the panel Roll half count as game rolls.** They are consistent with the game today, but they are two more roll paths the game UI does not show.
6. **Phone roll view**: quick bar clipped by the round mode button and the screen edge; chips cover dice and the panel head (PD-142.40).
7. **Phone game view** shows status and Roll twice.
8. **The pencil on a set row is missing on phone**; editing is in the row menu only.
9. **Starting Liar's Dice with 1 player** does nothing visible; the page throws "Liar's Dice takes 2-6 players" (for games-ui).
10. **The settings panel mixes three kinds of thing**: die design, app settings (sound, roll feel, shake) and files. Roll view only reorders them.
11. **Advantage / Disadvantage titles say "Roll..."** but they edit the set.

## What works and should survive

- The status strip as the top-down handle and the hidden mat total in games (PD-142.34).
- The phone tab slot under the mat (PD-142.30).
- Tap-to-hold with ring colours.
- The shelf as a quick design switcher.
- Everything in games already living inside one panel: no game added a mat button.
