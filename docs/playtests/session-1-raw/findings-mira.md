### No advantage/disadvantage or keep-highest support, and docs say nothing
- Role / round: Mira Vane / round 0
- What I tried: searched guide, README, CHANGELOG for "advantage"; typed `2d20kh1` into the Custom notation box
- What I expected: some advantage-style roll (keep highest / lowest) or a doc saying it is not supported
- What happened: red "Can't read "2d20kh1"". Docs never mention advantage or keep/drop. Workaround: build 2d20 and read the higher die by hand from the log line
- Severity: annoying
- Kind: missing feature (and doc gap: no statement that notation is only NdX+mod)
- Screenshot: k.png

### Typing when no field is focused triggers hotkeys and destroys the view
- Role / round: Mira Vane / round 0
- What I tried: tried to click the "Set name" box (click timed out), then typed "Advantage check" and Enter
- What I expected: text would go in the name box, or be ignored
- What happened: each letter fired a hotkey: h hid the whole panel (distraction-free), r rolled, space randomized and created an unsaved "Draft" design with a gold metal pair of d20s, etc. My amethyst design survived, but it was confusing and I had to find the small gear button bottom left to get the panel back
- Severity: annoying
- Kind: confusing UI
- Screenshot: l.png, m.png

### Roll total appears only after dice settle; long wait
- Role / round: Mira Vane / round 0
- What I tried: Roll with 3d6 and 8d6
- What I expected: total soon after the throw
- What happened: nothing shown for roughly 10-20 s (software rendering), then total and "8d6: 3+6+6+5+1+4+5+4 = 34" line appear at top. 8d6 dice overlap/stack a little on the mat. Works, just slow; the per-die breakdown is a nice feature
- Severity: polish
- Kind: confusing UI
- Screenshot: h.png, j.png

### Roll log entries do not say who rolled or give a label
- Role / round: Mira Vane / round 0
- What I tried: opened Roll log (three-lines button, bottom right)
- What I expected: some way to tell whose roll / what for in a group game
- What happened: entries show total, time, and "Custom" plus breakdown only. Single local roller, so no player name; set name not shown (the shape name "Custom" instead)
- Severity: idea
- Kind: missing feature
- Screenshot: j.png

### Native dropdowns (stone, font) hard to operate; stone type has no visible preview
- Role / round: Mira Vane / round 0
- What I tried: guide says choose Stone type and font; first clicked option names by text
- What I expected: clicking a labelled choice works
- What happened: Stone type and Font are small dropdowns far down the panel (need to scroll a lot). "Stone" substrate was chosen but random stone (Tiger's eye) was applied; I had to find Type dropdown to pick Amethyst. Guide's design page doesn't mention the Stone Type dropdown by name
- Severity: polish
- Kind: doc gap
- Screenshot: c.png

### Panel switches to roll settings in Roll mode, so set notation can't be edited there
- Role / round: Mira Vane / round 0
- What I tried: change 3d6 to 8d6 while in Roll mode
- What I expected: edit set and re-roll quickly
- What happened: must go Showcase, edit, then Roll again (3 steps per change). Docs do not say this
- Severity: polish
- Kind: doc gap
- Screenshot: f.png
### Switching between spell set and d20 initiative is a 4-step detour
- Role / round: Mira Vane / round 1
- What I tried: from 3d6 set to d20+2 for initiative, then back to 3d6
- What I expected: quick switch (saved set or a plain d20 button)
- What happened: Showcase, click notation box, select-all, type, Enter, back to Roll. Worked ("d20+2" accepted; log shows "1d20: 10 +2" total 12). Roll-time buttons for saved sets would be faster; the lightning button in Sets tab is unlabeled
- Severity: annoying
- Kind: missing feature
- Screenshot: o.png

### Set name box: first click often times out, no hint after Save
- Role / round: Mira Vane / round 1
- What I tried: save 3d6 as "Firebolt"
- What I expected: obvious confirmation
- What happened: worked on retry (click Set name box, type, click Save). No toast; set appears only in bag (bottom-left) > Sets tab as "Firebolt 3d6" with an unlabeled lightning button and a ... menu. Also bag header says "1 design" while a Draft design sits on the shelf
- Severity: polish
- Kind: confusing UI
- Screenshot: q.png
### Lightning button on a saved set rolls it (undocumented), set card shows "last N"
- Role / round: Mira Vane / round 1
- What I tried: clicked the unlabeled lightning button on Firebolt in the Sets tab
- What I expected: unknown (docs only say sets "can be opened to roll straight away")
- What happened: it rolled 3d6 right away (log "3d6: 2+6+4 = 12"); the card shows "last 12". Good feature, but unlabeled and not in guide; this is the fast way to switch between spell set and d20 sets
- Severity: polish
- Kind: doc gap
- Screenshot: r.png
### Saved sets make attack+damage easy; log names them (good)
- Role / round: Mira Vane / round 2
- What I tried: saved "Spell attack" (d20+5) and used lightning buttons in bag Sets tab for attack, then Firebolt twice quickly
- What I expected: to tell attack from damage in the log
- What happened: log shows "Spell attack ⚡ 1d20: 14 +5 = 19", "Firebolt ⚡ 3d6: 1+4+3 = 8", "Firebolt ⚡ 3d6: 6+6+6 = 18". Good. But plain notation rolls are labelled "Custom". Switching d20 <-> 3d6 once both sets are saved: open bag, Sets tab, click lightning (the bag covers the table, must Close to see dice/total)
- Severity: polish
- Kind: confusing UI
- Screenshot: w.png

### Rapid double roll of same set: second roll accepted, no hint which counts
- Role / round: Mira Vane / round 2
- What I tried: clicked Firebolt lightning twice 1 s apart
- What I expected: second click ignored or clearly replaces first
- What happened: both logged (8 then 18, same minute) so a player could cherry-pick; the table only shows the latest. Also the bag sheet hides the dice, so I did not see the roll happen
- Severity: annoying
- Kind: confusing UI
- Screenshot: none

### Roll log toggle button easy to mis-click; pause button looks like play
- Role / round: Mira Vane / round 2
- What I tried: clicked the roll log button when log already open
- What I expected: log stays open or I notice state
- What happened: it closed the log; in Showcase the same screen spot is pause (it toggled to a play icon) and the d20 roll button is the round one near it. Extra stray roll (1d20 10+5, "Custom") landed in the log
- Severity: polish
- Kind: confusing UI
- Screenshot: y.png
### Roll log panel covers the right side of the table during a roll
- Role / round: Mira Vane / round 3
- What I tried: rolled 8d6 with the log open
- What I expected: dice visible
- What happened: the log overlays the right third of the table, hiding 2-3 of the 8 dice until I closed it. All 8 dice settled on the mat and the line "8d6: 6+5+2+4+3+4+1+3 = 28" lists every die, but several dice touch/lean on each other and are hard to read by eye. Log does not tell the roll's purpose when rolled via notation ("Custom")
- Severity: annoying
- Kind: confusing UI
- Screenshot: z3.png, z4.png

### Docs vs reality, pages 04 and 06
- Role / round: Mira Vane / round 3
- What I tried: compared guide 04 and 06 to my session
- What I expected: match
- What happened: 04 matches (notation, +/-, Modifier, Save, Sets tab), but omits the lightning quick-roll, the unsupported advantage syntax, and that the set is edited only in Showcase. 06 matches the basics but omits that entries get the saved set's name, that the log covers the table, and that Custom-rolled entries are unlabeled
- Severity: polish
- Kind: doc gap
- Screenshot: none
