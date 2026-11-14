### Browser unresponsive for minutes after page load and after changing substrate
- Role / round: Thorn / 0
- What I tried: opened page, then clicked Custom; later clicked Solid metal then Custom
- What I expected: UI to react within seconds (toast aside)
- What happened: page stopped answering my driver for 2+ minutes after load, and again after switching substrate (shader recompile). Clicks did register eventually.
- Severity: annoying (may be sandbox software rendering only)
- Kind: confusing UI
- Screenshot: none
### No advantage/disadvantage or roll-label feature
- Role / round: Thorn / 0
- What I tried: looked in guide and UI for advantage, keep-highest, reroll
- What I expected: some way to roll d20 twice keep high (core tabletop need)
- What happened: nothing offered; no keep-highest/lowest in notation docs or UI. Workaround: 2d20 and read both dice by eye (total sums them).
- Severity: annoying
- Kind: missing feature
- Screenshot: none
### Roll log names rolls "Custom", not the saved set name
- Role / round: Thorn / 0
- What I tried: saved set named "Axe Swing", rolled it, opened log
- What I expected: log entry labelled Axe Swing (or the notation)
- What happened: entries say "Custom" with per-die lines "1d20: 9 / 1d8: 4"; hard to tell attack from other rolls. Also unclear if the saved set is rolled via Sets tab (not tried).
- Severity: polish
- Kind: confusing UI
- Screenshot: e.png
### Custom set editor not discoverable; notation box looks pre-filled
- Role / round: Thorn / 0
- What I tried: guide 04 then Shape > Custom
- What I expected: set shown clearly
- What happened: Custom opened with a stale-looking 2d6+d20+3 preview; the notation field is a typed value, and my Custom first-click silently did nothing during a freeze. Also preview briefly switched to a different look (tiger's eye) before settling to my metal; guide says nothing about the roll view hiding the set editor (roll log button is bottom-right icon, no label).
- Severity: polish
- Kind: confusing UI
- Screenshot: b.png
### Saved set name ignored; saved as notation
- Role / round: Thorn / 1
- What I tried: typed "Axe Swing" in set name box, Save (editor and bag Sets tab)
- What I expected: set named Axe Swing in Sets tab
- What happened: set appears as "1d20+1d8" with no feedback at the time of saving (I only learned it saved from "MY BAG · 1 SET"); name box in editor kept my text
- Severity: annoying
- Kind: bug
- Screenshot: g.png
### Sets quick roll works, log names it by notation; bag is a modal over the table
- Role / round: Thorn / 1
- What I tried: bag icon > Sets tab > lightning "Quick roll" button
- What I expected: roll and see result
- What happened: roll logged as "1d20+1d8 ⚡" (good, distinguishes from "Custom"); but the bag sheet covers the table while the roll happens; close it to see dice. No docs for the lightning button or the ⋯ menu.
- Severity: polish
- Kind: doc gap
- Screenshot: none
### Initiative from a 2-die set awkward
- Role / round: Thorn / 1
- What I tried: roll initiative d20 using attack set
- What happened: total includes the d8, so I must read the per-die line for d20 only; a plain d20 would be easier
- Severity: polish
- Kind: confusing UI
- Screenshot: none
### Quick re-roll works but bag covers the dice; modifier not applied
- Role / round: Thorn / 2
- What I tried: quick roll twice in a row from the bag (19+6, then 5+2)
- What I expected: roll visible, +5 attack bonus handled
- What happened: each click logs a new entry fine, but the bag sheet hides the table so I only read results from the log; the set has no per-die modifier or separate attack/damage so I add +5/+3 by hand and the log total (25, 7) does not include them and the d8 is added into the attack total
- Severity: annoying
- Kind: missing feature
- Screenshot: h.png
### Dice differ only by shape on the table
- Role / round: Thorn / 2
- What happened: both dice share one design/colour; d20 vs d8 is told by shape and the per-die chips under the total; fine, but same-colour dice of d10/d% would be hard
- Severity: polish
- Kind: idea
- Screenshot: none
### Roll log complete and ordered, but no way to label or tell attacks apart
- Role / round: Thorn / 3
- What I tried: opened log after 6 rolls
- What happened: all 6 present, newest first, with time and per-die values; matches guide 06. Guide 06 does not mention per-die lines, the lightning label, or that the log can sit open under the bag. No round/label/note field and totals exclude modifiers.
- Severity: polish
- Kind: doc gap
- Screenshot: none
### Guide 04 mismatch: set name
- Role / round: Thorn / 3
- What happened: guide 04 says Save stores a named set in the bag; my typed name was not used (shown by notation). Guide 04 also does not describe the Sets tab quick roll, menu, or editor presets.
- Severity: annoying
- Kind: doc gap
- Screenshot: none
