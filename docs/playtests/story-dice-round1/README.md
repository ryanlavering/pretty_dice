# Story Dice playtest, round 1 (2026-11-20)

Four agent playtesters drove the single-file artifact build at cb9488a (before the PD-187 mitigation b4e0b3d) with Playwright and screenshots; machine load was high, so rolls took 40 to 100 s. Reports: A (lifecycle, desktop), C (phone), D (novice). B (designs before/during/after) delivered its findings in its hand-back message only (summarised below). Screenshots stayed in the scratchpad.

B in short: saved designs were never altered by any game route; the Bag/Design UI misrepresented the game look as the player's design (fixed in b4e0b3d: Bag shows the player's picture plus a dashed inert game tile). Bugs found: Keep/Save as copy with the game look live saved a 'custom' 5-dice design (fixed); Blank draft mid-game broke the game (fixed); End game left the white game look on the table (open product decision: End game reopens Games with Story still selected, so the setup preview re-applies the look); selecting Story Dice swaps the table before Start (open); Rename marks a design Modified, 'Blank draft' labelled 'Random draft', a Set applied mid-game logs a fake numeric roll (open, small).

The full first-class draft design is PD-190 (docs/design/game-draft-design-memo.md after the mitigation lane lands).
