### No way to hide/secret a roll
- Role / round: DM / 0
- What I tried: looked in guide, roll log, Hints, settings for a hidden/private roll option
- What I expected: a DM roll that is not shown to the table or not logged
- What happened: nothing exists; every roll is shown large and logged
- Severity: annoying
- Kind: missing feature
- Screenshot: s7.png

### No copy/export of the roll log
- Role / round: DM / 0
- What I tried: roll log panel (only Clear and close), guide page 06
- What I expected: Copy log button or text I could paste into session notes
- What happened: only Clear and close; the only copy items are "Copy bag JSON" and a toast "tap to copy details"
- Severity: annoying
- Kind: missing feature
- Screenshot: s7.png

### Roll log has no labels, notation shown only as pieces, entry titled "Custom"
- Role / round: DM / 0
- What I tried: rolled d20+5 and 3d20, then d%+d10+2
- What I expected: entries I can tell apart ("goblin 2 attack", "d20+5") 
- What happened: every entry titled "Custom"; modifier shown as separate "+5" line; no way to name a roll, so DM cannot tell goblin attacks from saves later
- Severity: annoying
- Kind: missing feature
- Screenshot: s11.png

### Undocumented Games panel (Yahtzee etc.)
- Role / round: DM / 0
- What I tried: clicked the dice-in-square button at left of the table in Roll mode
- What I expected: something from the guide (button table in 01 does not list it)
- What happened: a Games panel (Yahtzee, players, Start game) opens; not in guide or Hints
- Severity: polish
- Kind: doc gap
- Screenshot: s9.png

### Total/breakdown text overlaps dice; tiny "+2" breakdown
- Role / round: DM / 0
- What I tried: rolled d%+d10+2
- What I expected: readable breakdown under the total
- What happened: "1d%: 39 / 1d10: 2 +2" line is drawn partly behind/over the dice and unreadable when dice land near the top
- Severity: polish
- Kind: bug
- Screenshot: s11.png

### Changing dice needs Showcase mode and the Custom shape; no quick roll bar in Roll mode
- Role / round: DM / 0
- What I tried: change from 3d20 to d20+5 while in Roll mode
- What I expected: notation box available at the table
- What happened: the Custom set editor only appears in Showcase mode; each change means Showcase, edit, Roll (Roll click also throws immediately). A DM switching between goblin attacks, saves, d100 tables will switch constantly (saved Sets help but are in the bag sheet)
- Severity: annoying
- Kind: confusing UI
- Screenshot: none

### Doc gap: modifier/d% notation and results
- Role / round: DM / 0
- What I tried: guide 04 for notation rules
- What I expected: list of accepted syntax (d%, keep highest, advantage, no count)
- What happened: only 4d6+2d10+3 example; I found d20+5 and d%+d10+2 work by trial. d% is a single value (39) but spawns two dice? Not documented how d% reads. No advantage/disadvantage, no table (d100 lookup) support
- Severity: polish
- Kind: doc gap
- Screenshot: s11.png

### Rolls are slow to settle in the sandbox, total appears late
- Role / round: DM / 0
- What I tried: Roll 3d20
- What I expected: total soon
- What happened: ~20-40 s before total/log entry shown (environment slowness; log said "No rolls yet" until settled)
- Severity: polish
- Kind: confusing UI
- Screenshot: s4.png
### Group initiative: 4d20 shows meaningless sum, modifier must be added by hand
- Role / round: DM / 1
- What I tried: 4d20 for four goblins' initiative
- What I expected: four separate totals (or sorted order) with +2 each
- What happened: big total 39 (sum of all) shown; individual dice only in small breakdown "19+14+4+2"; I add +2 by hand and no sorting. Setting modifier +2 would add it once, not per die. Need a "roll N separately" mode.
- Severity: annoying
- Kind: missing feature
- Screenshot: none

### Roll button click ambiguous / log count jumped
- Role / round: DM / 1
- What I tried: click "Roll" text after editing notation
- What I expected: one throw
- What happened: click timed out with error yet log later showed an extra roll (count 4 -> 6 after one more throw), so a failed-looking click still threw once
- Severity: polish
- Kind: confusing UI
- Screenshot: none
### Group attacks: no way to link a die to a goblin or apply +4 per die
- Role / round: DM / 1
- What I tried: 4d20 for four goblin attacks, 2d6 for damage
- What I expected: per-attacker results with +4, hit/miss vs AC, damage matched
- What happened: total (41) meaningless; I match dice to goblins by reading breakdown order, add +4 and compare to AC by hand; damage dice not paired with hits. Switching 4d20 -> 2d6 needs Showcase again.
- Severity: annoying
- Kind: missing feature
- Screenshot: none

### Round button toggles instead of re-rolling
- Role / round: DM / 1
- What I tried: click round Roll button at bottom right again to roll
- What I expected: new throw
- What happened: from Roll mode it returned to Showcase (no throw); a second click was needed. `r` key rolls directly (not in my first notes)
- Severity: polish
- Kind: confusing UI
- Screenshot: none
### Hidden roll workaround leaves full trace
- Role / round: DM / 2
- What I tried: secret d20 for Pip's perception
- What I expected: some private option
- What happened: only workaround is roll as normal (big total shown on the shared table, entry in log as "1d20", only the log Clear removes it, which erases all history). Anyone watching the screen sees it.
- Severity: annoying
- Kind: missing feature
- Screenshot: none

### Table lookup: no support, manual mapping
- Role / round: DM / 2
- What I tried: d8 "behind the door" table
- What I expected: attach a table to a die
- What happened: plain number 1 appears; I map it from my own notes outside the app. Single-die log entries read "1d8" with no breakdown while multi-dice entries read "Custom" - inconsistent titles.
- Severity: annoying
- Kind: missing feature
- Screenshot: none

### Log copy/export attempts: nothing
- Role / round: DM / 2
- What I tried: clicking a log entry, select-all
- What happened: no copy, no feedback; only a "UI paused ... tap to copy details" toast for perf info
- Severity: annoying
- Kind: missing feature
- Screenshot: none
