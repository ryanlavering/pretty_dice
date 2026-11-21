# Playtester C: Story Dice on a phone (touch)

Setup: Chromium, touch + isMobile, DPR 2, portrait 390x844 and landscape 844x390, software GL (slow: a roll takes 40-60 s to "settle" into the arrange phase; screenshots can lag the DOM by several seconds, so some shots show the previous state). The yellow "UI paused N s - tap to copy details" chip (top centre) is a diagnostic overlay; I ignored it except where it hides real UI (noted once). Shots in `shots-C/` (numbered by capture order; same-name suffix numbers can differ from the list below by one or two).
Flow driven by real touch events (CDP touchStart/Move/End and touchscreen.tap). Game: Story Dice, 5 x d12, 2 stories each, Player 1 human + Bot 2, 1 game played through to "Game over", plus a second game started with a custom set.
Not tested / could not: on-screen keyboard and notch/safe-area (headless has neither; I only note what sits close to the edges), the second game's full play-through, Hi-vis tiles, Re-word, Autoswap off.

## Scenario 1: portrait game

1. **Reaching Play / Games on a fresh phone is hidden behind a cube icon** - confusing
   - Fresh app opens in Design room. There is no visible Design/Play switch in portrait; I had to tap the cube (bottom right, labelled "Utilities") and pick "Switch to Play". Only in landscape do Design/Play pills show at the top of the left pane.
   - Expected: the room switch somewhere obvious. Shot: 01-utilities.png
2. **Games panel is a long scrolling form; Start game is below the fold** - nit
   - Setup (Game, Players, names, Bot, Dice, Faces, Stories, Set number, hints, 6 glyph packs, "Story Dice sets...", Start) is ~1000 px tall in a ~380 px visible drawer. Had to scroll to reach Start game. Header (tabs) scrolls partly away while scrolling (drawer top shifts from y=499 to y=479). Shots: 01-games.png, 01-setup-scrolled.png.
3. **Bot checkbox is 13x13** - nit (tap target)
   - The "Bot" checkbox itself is 13x13 px. The label row is 164x19 and tappable, so it works, but tight. Same for "Autoswap" and "Hi-vis" checkboxes (13x13 box, labels ok), glyph-pack checkboxes in set editor.
4. **Choosing Story Dice instantly swaps the table to 5 white glyph dice and sets the dock formula to "5d12"; later choices do not** - confusing
   - First choice: table shows story dice and dock reads "5d12". Later (after End game, picking Story Dice again when it was already selected) the table kept my d6 and the dock kept "1d6". In the set editor the table shows the 5 story dice while the dock formula still says "1d6" (and the dock Roll would roll 1d6). Dock/table disagree. Shots: 01-story-opts.png, 37-s6-new.png.
5. **During the game the dock grows from 48 px to 70 px tall and now covers dice** - bug/nit
   - Normal quick bar: y401 h48. Story bar: y380 h70 (text line + Roll or Bad/Fair/Good/Roll). Dice that land low on the table (y>380) sit under/are clipped by the bar; the pre-roll shot shows the bottom-right die cut at the dock edge (01-started.png). Dock is semi-transparent so dice show through it ("ghosted") in landscape (24-...).
6. **The dock "Roll" button is visible but dimmed/disabled for the whole game, next to the active Bad/Fair/Good chips** - confusing
   - A greyed Roll beside three live chips looks like a mixed state. After Roll it stays dimmed during rolling, arrange, rating. I tapped it twice by mistake in rating phase. Shot: 09-s1-all-placed.png.
7. **Roll takes ~50 s to hand over to "Put the dice in story order" (software GL)**; during this the dock says "Roll the dice" with a dimmed Roll, which reads as stuck. Probably environment, but there is no "rolling" or "settling" wording. - nit
8. **Layout after settle (portrait, drawer open): works well** - good
   - Rings 1-5 sit in a row at the top of the visible table (y~124, 66 px circles), dice auto-line up in a row below (y~316) with each die showing its top glyph. Dice are slightly larger than the rings (they overflow the ring border a little when placed). Shots: 05-s1-ordering2.png, 09-s1-all-placed.png.
9. **Drag works with touch; tap-in-order works and fills the first empty ring** - good
   - Drag die to ring (CDP touch, 8 steps): die lifts bigger while dragging (06-s1-middrag.png), snaps into the ring, remaining dice re-spread (81..309). Tapping a die puts it in the first free ring. Instruction text says "click the dice in order, or drag them onto the rings": "click" on a phone. - nit
10. **Story sentence on the mat** - good (with a few nits)
    - After 5 placed: a card under the rings "Tell your own: Far from here, a colorful kite silently ..." (3-5 lines), never cut off, never under the drawer, does not overlap dice. The same sentence is repeated, larger, in the drawer; with the drawer open you read it twice.
    - Wording: for my own arrangement the panel says "The bot's version is a prompt: tell your own." before the bot has done anything; "bot's version" makes no sense on my turn. - confusing. Shot: 09-s1-all-placed.png
    - Prompt shows grammar glitches, e.g. "a footprints", "the heavy fix hopped". Not UI, but noticeable when read aloud. - nit
11. **Rating** - fine
    - Dock chips are small: Bad 51x28, Fair 48x28, Good 58x28 (below a 44 px thumb target and close together, ~6 px apart). The drawer has big Bad/Fair/Good (113x40) but they are lower down and partly below the fold in short viewports. I used dock chips. Judged the bot story 2 (good) ("As the prophecy foretold, the heavy fix hopped, so the puzzle smashed the web..."); score row shows "1 fair / 2 good" correctly. Shots: 11-s1-bot-story.png.
12. **Stale shadows** - bug (visual)
    - While the bot rolls, dark hexagonal shadows remain on the mat where earlier dice were (several shadows with no die). Shot: 10-s1-rated.png, 23-... Probably leftover shadow of re-spread dice.
13. **"Fix N leaning dice" pill** - nit
    - After a roll in the collapsed view a "Fix 2 leaning dice" orange pill appears top right with pink rings around dice that touch. Tapping it nudged the dice but they still overlapped; the phase then proceeded only after a long wait. Shot: 15-s1-collapsed-arranging.png, 16-s1-fixlean.png.
14. **After the last story, the game-over state keeps the dock locked** - confusing
    - Dock says "Game over: Bot 2 wins with 4" with dimmed Roll; story dice drop back loose on the table (some partly under the dock). You must press "End game" (a top-right button in the drawer, 76x38) to get out; when the drawer is collapsed there is no visible way to end the game. Shot: 28-s2-land-gameover-open.png.

## Scenario 2: landscape (844x390)

15. **Split landscape layout** - good, with nits
    - Drawer becomes a 310 px left pane (Design/Play pills on top, tabs below), table on the right ~534 px. Rings are bigger (94 px) at y~124, dice row at y~263, dock at the bottom. Shot: 21-s3-rot-land.png.
    - Dock with the pane open is two rows when it has Bad/Fair/Good (text and chips on row 1, Roll alone on row 2, y~298-382). In the ordering phase it is one row. Shot: 22-s2-land-placed.png.
    - "Re-word" button wraps to "Re-/word" in the narrow pane; the Bad/Fair/Good panel buttons are below the fold (need to scroll).
    - Collapse chevron is a tall 22x56 tab on the left edge of the table (x310, y167-223); it sits right next to ring 1's lower-left edge. Easy to hit with a thumb but overlaps the table.
16. **Collapsed landscape is the best layout** - good
    - Rings/dice become big (94 px), one row, sentence card fully visible under the rings in 3 lines, dock one row with Bad/Fair/Good/Roll at the bottom. Shot: 26-s2-land-collapsed-botstory2.png.
    - Problem: while the bot's dice are rolling in collapsed landscape the dice are huge (up to 260 px) and some are cut off at the top (under the status chip) or run under the dock/off the bottom edge. Shots: 23-s2-land-collapsed-botroll.png, 24-s2-land-collapsed-botstory.png. - nit
17. **Mid-roll screenshots lag/ghost** (software GL) - ignore for severity, noted for evidence.

## Scenario 3: rotate during a game

18. **Rotate portrait -> landscape mid-arrange re-spreads correctly** - good
    - setViewportSize 390x844 -> 844x390 in the ordering phase (0 placed): rings re-laid out, dice re-spread in a row (x 369..785, y 263). Placed dice stayed placed in the later turn. Landscape -> portrait after End game also restored the layout. Shots: 21-s3-rot-land.png, 30-s5-port-after-end.png.
    - Not tested: rotation while dice are mid-roll.

## Scenario 4: eye, full view, drawer collapse

19. **Eye button (top right) does nothing on a tap** - bug/confusing on touch
    - Tapping it (and the eye icon in the status chip and the one in the scorecard header) changes nothing, no feedback; camera position identical before/after. It is a hold-to-peek control ("Hold to look from above"): a press-and-hold of ~3 s moves the camera (x -16.3, y 20.9 -> -3.0, 26.1) and releasing returns it (small drift: 20.89 -> 21.27 y). No hint on touch devices says "hold".
20. **Drawer collapse/expand during a story** - good, one wart
    - The chevron handle (56x20, centred on the drawer top; 56x16 flush against the bottom edge when collapsed, y828-844 which is the home-indicator area on phones) works at any phase; the table re-lays out immediately and the rings/dice re-spread (collapsed: rings y~200, dice y~556, big gap between; expanded: rings y~124, dice y~316). No 2D view jump seen. The handle is very small and at the very bottom edge when collapsed. Shots: 13-, 17-, 20-s1-*.
21. **Collapsed portrait: top 60% of the screen is an empty void** with the dice crowded into the bottom left (dice only land in the lower part, the sentence card is under rings at the top). Not broken, but a lot of wasted space; the drawer-open layout is tighter. Shot: 13-s1-collapsed-roll-ready.png.
22. **Utilities menu (cube) overlaps the die/preview** when opened; items 151x37 ok. Hint callouts ("New: PD-xxx") covered the Games tab until dismissed via "Seen all" (ignored per brief, but they intercepted taps).

## Scenario 5: after End game

23. **Dock goes back to one row (48 px) with the normal quick roll bar** - good. Portrait: y401 h48, with formula box, Roll, chips (d4, d6 visible, rest scroll horizontally; chips 35x28).
24. **After End game the table still shows the white Story dice** - confusing
    - Table keeps 5 glyph dice, dock says "5d12" and "Ready: tap Roll or flick the dice" until you press Games > "Close". Only then do you get your own design back (teal d20). Rolling from the dock at that moment would roll story dice, not my dice. "Close" on the Games panel does not say it is "leave games". Shots: 30-s5-port-after-end.png, 31-s5-after-close.png.
25. **Dock d6 chip only types "1d6" in the formula and highlights d6 in Shape; it does not roll** - nit (consistent with desktop?). Then Roll gave my own teal metallic d6 (good: own design). Shot: 34-s5-d6-roll2.png.
26. **Design 1 shows "Modified" in the Bag right after the game** - bug (likely)
    - A fresh app's bag shows no "Modified" badge for Design 1 (verified in a fresh run). After playing Story Dice, End game, and Close, opening Bag showed "Modified" with Save / Save as copy / Revert, although I never touched the design. Cause unknown (before I tapped the d6 chip). Shot: 32-s5-bag.png.
27. **Bag sheet** - good: full-screen sheet, Close at top right, Save bag/Revert buttons 111x33, tabs Designs/Sets 86x35 and 63x35 (small). Header icons (save/load/copy) 36x36.

## Scenario 6: Story Dice sets editor

28. **Create and use a set works** - good
    - Games > Story Dice > "Story Dice sets..." > "New Story set" > name field (typed "Phone set"), tick Memes (label tap), Save (43x38 top right, scrolls away when you scroll down) -> returns to the list with a card "Phone set / memes + noto - 5 x d12 - seed 767 - different dice", pencil, and "..." buttons. Tapped the card: it opens Edit (same as pencil; no direct "use"). "Use in game" lives at the bottom of the editor beside "Roll it"; it put the packs and Set number 767 into the game setup. Start game then began with the new set. Shots: 36-.. to 43-s6-use.png.
29. **Editor details**
    - The editor is a very long scroll (about 920 px, in a 380 px pane). Save is at the top, Use in game at the bottom, so after editing you scroll up to save and down to use.
    - Preview glyph grids are tiny (about 20 px glyphs) on a phone.
    - Raw internal names leak into the table title while previewing: "5D12{NOTO#767} - SOLID PLASTIC" / "5D12{MEMES&NOTO#767}". Also overlapped by the "UI paused" chip.
    - "Close" (editor), "Back" (list), "Close" (Games) and "Save": three close-like words in the same corner; "Close" in the editor does it discard unsaved changes? Not tried.
    - "Fewer dice"/"More dice" buttons are 19x38 (very narrow); Seed input 110x28; face buttons d12/d20 81x27.
    - After "Use in game" the setup does not say which saved set is active (only "Set number 767").
    - Set preview on the table changes while editing and the dice get re-thrown, which is nice but the dock still says 1d6.

## Scenario 7: thumb reach and size (summary)

- Smaller than ~44 px: dock chips d4/d6/... 35x28; dock Bad/Fair/Good 48-58x28; Roll 61x34 (acceptable); checkboxes 13x13; Fewer/More dice 19x38; drawer chevron 56x20 (16 when collapsed); Bag tabs 63-86x35; bag header icons 36x36; Games "Close"/"Back"/"End game" 43-76x38.
- Text: sentence on mat ~18 px italic serif, good. Panel hint text "0 of 5 placed..." is small grey; glyph card word lists small but readable.
- Crowding: dock chips are 6 px apart; Hint/"New" yellow dots (14x14) are on top of the tabs and block them.
- Edge: collapsed drawer handle and dock at the very bottom (dock bottom ~y844-6); diagnostic chip covers the top status line ("Player 1: put the dice in story order" is unreadable under it), the status chip text is also clipped by the eye button at right.
- Keyboard: could not test; the name field and set name are inside a scrolling pane with the dock above them, so a keyboard would probably cover the pane and dock both.

## What felt good

- Drag with touch and tap-in-order both work, with clear snap and re-spread.
- Auto-lining the dice up under the rings and re-spreading on rotate/drawer toggle.
- Collapsed landscape: big rings, one row, readable sentence, one-row dock.
- Sentence card never overlaps rings/dice; set editor works end to end; own design returns after Close.

## Top 5 to fix

1. After End game the table keeps story dice (and dock "5d12") until "Close"; make End game restore my dice, or label it.
2. Design 1 turns "Modified" after a game with no edit by me.
3. Eye "peek" does nothing on tap, no touch hint: add visible feedback / a hold tooltip or make it a toggle on touch.
4. Dock during a game: 70 px tall (48 normal), covers dice, dimmed Roll next to live Bad/Fair/Good; chips under 44 px; 2 rows in landscape-with-pane.
5. Story setup/editor too long for a phone (Start at the bottom, Save at top/Use in game at the bottom), "click" wording, "The bot's version is a prompt" on my own turn, and raw "{NOTO#767}" names in the table title.

## Environment notes

- I accidentally overwrote another playtester's `pt/run.sh` (I wrote a script with that name, then moved my own tools to `pt/ptC/`). If tester run.sh behaves oddly, that is why.
