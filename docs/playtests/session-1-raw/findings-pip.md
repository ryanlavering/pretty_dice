### No advantage/disadvantage roll
- Role / round: Pip (halfling rogue) / round 0
- What I tried: searched guide and UI for advantage; typed 2d20kh1+d6+3 in the Custom notation box
- What I expected: keep-highest syntax or an advantage toggle
- What happened: red text under the box: Can't read "2d20kh1". Nothing in the guide or UI mentions advantage. Workaround would be 2d20 and reading both dice by hand.
- Severity: annoying
- Kind: missing feature
- Screenshot: j.png

### Roll result breakdown is tiny and overlaps the dice (phone)
- Role / round: Pip / 0
- What I tried: rolled d20+d6+3 on a phone, read the result
- What I expected: clear total and parts
- What happened: total (8) shows big over the dice, with "1d20: 3  1d6: 2  +3" in small text overlapping the dice. Results appear only after a long tumble (software rendering). The per-die breakdown is only legible when the dice settle away from it. The roll log has it clearly (1d20: 3, 1d6: 2, +3).
- Severity: polish
- Kind: confusing UI
- Screenshot: g.png

### Phone panel is hard to scroll by drag
- Role / round: Pip / 0
- What I tried: drag up on the lower panel to scroll to colours/custom set
- What I expected: panel scrolls
- What happened: drag did nothing and a stray tap changed the substrate to Clear epoxy. Only mouse wheel scrolled. Panel sits in a ~half-screen strip below the table, so only a few controls are visible at once; the Custom editor needs a lot of scrolling.
- Severity: annoying
- Kind: confusing UI
- Screenshot: c.png

### Which Save saves the set? Name box confusion
- Role / round: Pip / 0
- What I tried: guide says Custom set has a name box and Save to store the set in the bag. I typed "Pip stab" in the name field and pressed Save.
- What I expected: a named set in the Sets tab
- What happened: the design in the top card became named "Pip stab" with a "Modified" badge, and the top card also has Save / Save as copy / Revert and "Bag not saved to a file". Unclear if a set was saved separately or only the design; there are two Save buttons and two name fields. Did not verify Sets tab yet.
- Severity: annoying
- Kind: confusing UI
- Screenshot: f.png

### Guide says no look for a quick-pick; colour fields not typeable easily
- Role / round: Pip / 0
- What I tried: set base colour by clicking the hex box and typing
- What I expected: edits colour
- What happened: click on the hex textbox timed out in my driver, then Ctrl+A selected page text. Used substrate buttons and Randomize-free defaults instead. Possibly only a driver issue, not recorded as an app bug.
- Severity: polish
- Kind: doc gap
- Screenshot: b.png

### Custom set defaults to 2d6+d20+3, clear button label mismatch
- Role / round: Pip / 0
- What I tried: opened Custom
- What I expected: single d20 or empty
- What happened: starts as 2d6+d20+3 (matches guide image). The reset button is described "Clear the set (a single d20)" but shows an X icon, easy to read as closing the field.
- Severity: polish
- Kind: confusing UI
- Screenshot: e.png
### "Pip stab" set not saved; Save beside name box saves the design, set-save lives in the bag
- Role / round: Pip / 1
- What I tried: opened bag > Sets after typing a name and pressing Save in Custom editor
- What I expected: set "Pip stab" listed
- What happened: "My bag · 0 Sets". Name field just renamed the design. The real button is "Save the current dice as a set" at the top of the Sets tab, not where the guide says (name box + Save in the editor).
- Severity: annoying
- Kind: doc gap
- Screenshot: m.png

### Changing notation (Set) rolls/does not clearly separate; roll log popup stays open over dice
- Role / round: Pip / 1
- What I tried: changed to d20+3, switched to roll view
- What I expected: explicit roll
- What happened: the roll happened with no clear trigger from me; the previous roll-log popup stayed open on top of the dice until I closed it with X, hiding the die. Result (7 = 4+3) readable on the table without the log.
- Severity: polish
- Kind: confusing UI
- Screenshot: k.png
### Sets tab: save flow is instant and naming is not obvious
- Role / round: Pip / 2
- What I tried: bag > Sets > "Save the current dice as a set"; built d20+d6+3 and named it Sneak
- What I expected: type name, then save
- What happened: tapping the button immediately creates a set named after its formula (e.g. "1d20+3") and opens an editor; tapping it again makes a duplicate ("1d20+3 2"). Name and Save work inside that editor (Save is highlighted when unsaved). Both sets then list with dice icons and a lightning button. The lightning button rolls the set inside the sheet and shows only "last 23" on the card, with no breakdown; the sheet stays open over the table.
- Severity: annoying
- Kind: confusing UI
- Screenshot: w.png, x.png

### Screenshot/viewport is not 390x844
- Role / round: Pip / 2
- What I tried: shots after size 390x844
- What happened: screenshots are 500x644, so my taps by coordinate only work in that frame. Possibly environment, noted for the harness.
- Severity: polish
- Kind: bug
- Screenshot: x.png
### Landscape check inconclusive
- Role / round: Pip / 3
- What I tried: size 844x390, then screenshot
- What happened: screenshot unchanged (still 500x644), so I could not judge landscape layout. Likely harness limit.
- Severity: polish
- Kind: bug
- Screenshot: y.png

### Active set switches by itself; good: NATURAL 1 label
- Role / round: Pip / 3
- What I tried: pressed r after using the Sneak set via the bolt
- What happened: first r seemed not to roll; second roll used the "1d20+3" set (log shows it). It was not obvious which set is active; the table title just says "CUSTOM". The result view labels "NATURAL 1", which is nice.
- Severity: annoying
- Kind: confusing UI
- Screenshot: y.png
