# Playtester A report: Story Dice lifecycle (desktop 1280x800)

Screenshots: /tmp/claude-1000/-home-ryan/0dac35b2-99da-4d11-a1c3-a032f79378da/scratchpad/pt/shots-A/ (prefix letters B/C/E/F = script run, then step name).
Environment note: the machine had load ~45 (other playtesters), so a Story Dice roll took ~100 s to settle. That is not an app finding. I did NOT get through a full arrange + rating (my clicks placed only 1 of 5 dice); I focused on lifecycle. No console/page errors in any run.

## Scenario 1: fresh app, select Story Dice without starting

1. **Selecting Story Dice (not started) replaces the table dice and the quick-roll formula** (bug/confusing)
   - Steps: Play > Games (Yacht selected, table shows the single d20) > Game selector > Story Dice. Do NOT press Start.
   - Saw: table instantly shows 5 white d12 story dice ("5D12 . SOLID PLASTIC" in the title), formula placeholder changes d20 -> 5d12, "Ready: tap Roll or flick the dice" still shown. Dock height unchanged (46px, 746). Nothing says this is only a preview.
   - Expected: either nothing changes until Start, or a clear "preview" hint. Shot: 01-story-selected.png (run a4), 04-B04-story-selected.png.
2. **Start game button is below the fold** (confusing). With Story Dice selected the Games panel is long (dice count, faces, stories, set number, 6 glyph packs, "Story Dice sets...") and Start game is cut off at the bottom of an 800px window; I had to scroll the panel. Shot: 04-B04-story-selected.png (bottom edge shows only the top of the gold button).
3. **Switching to another game restores the d20** (ok), but the design comes back marked **Modified** (see item 6). Selecting Pig then Story Dice again: fine.
4. **Closing the Games panel with Story Dice still selected** returns to the Table tab and the table goes back to the single d20 and placeholder d20; reopening the Games tab swaps the 5 story dice back in and the placeholder back to 5d12 (8-shot: 08-C08-after-close-with-story.png, 09-C09-games-reopened.png). So "selected" is only visible while the Games tab is open; dice swapping just from opening a tab is surprising (confusing).
   - Inconsistent with item 9 below: after End game the Table tab keeps the story dice.
5. **Fresh app lands in Design room**, and the Play table die looks different from the Design die before any game was involved (Design: teal clear epoxy d20; Play table: purple beaded d20, shot 01-fresh.png vs 01-play.png). Likely just the first-run random design/ordering, but it looked like the design changed on switching rooms (nit, not game related; only seen once).

## Scenario 2: start, roll, arrange, End game

6. **Story Dice leaks into the user's design: it becomes "Modified" and the look is permanently changed** (BUG, high)
   - Steps (clean run, run b2): fresh design = green metallic plastic d20 with green numbers, "Design 1" has no Modified card (02-C02-design-base.png). Games > select Story Dice, Design room (shows the 5 white story dice instead of the design, Custom set "5d12", Undo enabled; 04-C04-design-with-story-selected.png), back to Play, Games > Pig, Design room.
   - Saw: Design 1 shows "Modified . 1 of 1 in My bag" with Save / Save as copy / Revert, and the numeral colour of the d20 changed from green to purple (07-C07-design-pig.png vs 02-C02-design-base.png). Undo enabled. Started game while the design is open also shows Modified (11-C11-design-running.png).
   - Expected: playing/selecting a game should never touch the user's design; no Modified.
   - The Modified flag and changed colours survive a page reload (13-C13-reload-running.png).
7. **After End game the table does not go back** (BUG, high)
   - Steps: Story Dice selected, Start, Roll, End game (run b1, with an earlier quick roll in it) and again in run b3 (no roll: start then End x4).
   - Saw after End game: table still shows 5 white d12 story dice ("5D12 . SOLID PLASTIC"), formula placeholder 5d12, Table tab still shows 5D12, panel back on Games tab showing the setup form. The dice are not back to the d20, and are no longer the user's look. Yacht, in contrast, restored the d20 on End (14-E14-yacht-ended.png). Only after a page reload (or Close, or choosing another game) does the d20 come back.
   - In b1 an orange "Fix 1 leaning die" chip also appeared after End game, with a pink ring on a die and the stale roll total "35 / 5d12: 1+12+9+4+9 = 35" on the table (12-B12-ended.png). The story-game roll was shown as an ordinary dice roll result afterwards.
8. **Design room after End game shows the story dice and Modified** (BUG). 15-B15-design-after-end.png: five white glyph d12s fill the Design stage, Design 1 "Modified", Custom set box "2d6" while the dice are d12s (formula box text out of sync), the bag thumbnail is a white d20.
9. **Story dice look is not the user's design in quick rolls afterwards** (BUG, high): after Story Dice has been selected/played, quick-roll 2d6 gives white plain-plastic cubes with blue inset numerals, not the user's design (06-B06-after-2d6-roll.png, 22/24-E*, 24-E24-design-after-2d6.png). The user's design (metal/swirl etc.) is gone from the table until reverted.
10. **Dock changes during a game** (confusing, probably by design): the formula box and die chips (d4..d20, Adv, Dis) disappear; the dock shows a hint text ("Roll the dice" / "Put the dice in story order") plus a Roll button that is disabled during rolling and while arranging. The whole bar is greyed. Dock height itself is stable (46px). The game status also appears as a second bar at the top ("roll the dice", with an eye icon) which sits right under the "UI paused" toast. On End game the formula box comes back, but still holding any text typed earlier (2d6) while the placeholder says 5d12.
11. Arrange phase looks good (rings 1-5 above, dice below, word-hint cards in the panel; 01-s2d.png) but the Hint text says "0 of 5 placed: click the dice in order, or drag them onto the rings". Clicking the first die placed it ("1 of 5 placed"); I did not complete the rest (my clicks were probably too fast for the slow renderer).

## Scenario 3: switch Play <> Design

12. Design room while Story Dice is selected (not started), running, or ended all show the 5 story dice in the Design stage instead of the user's d20 (04-C04, 11-C11, 15-B15). The Design room is not usable as "my design" while the game is selected. Room switching back to Play while running keeps the game running with scorecard intact (12-C12-play-running.png), so state survives, but the Design room is effectively hijacked.
13. Switching to Design with Story Dice selected did NOT show Modified at that moment (04-C04) but it appeared after switching games (item 6).

## Scenario 4: reload

14. **Reload mid-game: no automatic resume, and the Play room is not restored** (confusing). After t.reload() the app opens in the Design room with the single d20 (13-C13-reload-running.png). Going to Play shows the d20 on the Table tab. Only when I open the Games tab does a gold **"Resume Story Dice"** button appear at the top of the form (02-E02-games-after-reload.png), together with the 5 story dice on the table (swapped in by opening the tab) and the Game selector on Story Dice. So Resume is discoverable only by opening Games; nothing on Table/Play indicates a game is waiting.
15. Resume click restores a running game (Scorecard, End game, "roll the dice", Story 1 of 2; nothing had been rolled so nothing else to restore). I did not test resume after a roll/arrangement.
16. **Reload after End game**: no Resume button, and the selector is still on Story Dice (games-after-end-reload shows Story Dice form, 5d12). Table shows the d20 until Games tab is opened. The Modified flag stays.

## Scenario 5: repeated start/end, Yacht

17. Start/End x4 without rolling: stable every time (same state each cycle: after End, 5 story dice, 5d12, Games tab with the form). No growth or glitches found.
18. Select Yacht: table back to d20 (12-E12). Start Yacht: dock shows 5d6, scorecard. End Yacht: table back to d20 (correct, restored). Then select Story Dice again: 5 story dice. This path (Yacht) restored properly, which makes the Story Dice End game behaviour (item 7) look like a bug.

## Scenario 6: closing the panel mid-story

19. **Hide the side pane (full view)** mid-game: pane disappears, dice and top bar rearrange across the full width, dock stays (17-E17-pane-hidden.png; dice at the bottom are cut off by the dock because the table recentres). Re-open worked. (nit: bottom dice partially under the dock).
20. **Table tab during a game**: clicking Table tab shows Roll feel/Sound controls; the game continues (19-E19). Scorecard tab label changes back. Fine.
21. Close button in the Games form (before a game): goes to Table tab, d20 comes back (item 4). Not visible while a game runs (only End game).

## Scenario 7: quick roll bar

22. **While selected-not-started**: typing 2d6 and Roll works, but (a) the panel jumps from Games to the Table tab (the custom-set panel opens with 2d6), (b) the table switches to 2 white d6 cubes (the story look), result 5 shown (06-B06). Games tab afterwards still says Story Dice while the table shows 2d6 (08-B08), i.e. panel and table disagree. Starting the game afterwards swaps back to 5 story dice but the formula box keeps "2d6" with placeholder 5d12.
23. **While running**: there is no formula box (nothing to test), only the game hint + Roll.
24. **After ending**: formula box is back; 2d6 rolls fine and gives 2 white cubes in the leaked look; Games panel afterwards still shows Story Dice with nd=2 (22/23-E).

## Scenario 8: Resume / Close
Covered in 14-16, 21. Close = leave the Games drawer (not cancel the selection; selection persists across Close, shown again when reopening). There is no "cancel selection / none" entry in the Game selector (the brief mentioned 'none'): the only way to leave Story Dice is to pick another game.

## What felt good
- Start/End cycles are stable; Yacht -> Story Dice -> Yacht hand-offs restore the d20 correctly.
- Arrange phase is clear: numbered rings on top, dice in a row, word cards in the panel.
- Resume button is prominent once found.
- No console errors in any run.

## Top 5 things to fix
1. Story Dice must not modify the user's design (Modified flag, changed numeral colour, white story look leaking into quick rolls and the Design room).
2. End game should restore the table (the user's dice, formula placeholder, no stale roll result, no "Fix leaning die") exactly like Yacht does.
3. Selecting Story Dice (not started) should not swap the table/Design stage, or must be clearly a preview; opening/closing the Games tab should not swap dice.
4. After reload, make Resume discoverable (and land in Play with the game), not only inside the Games tab; keep the Play/Design room.
5. Quick roll while Story Dice is selected: keep Games panel as it was and keep table/panel in agreement; make the Start button visible without scrolling.
