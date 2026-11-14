# Pretty Dice user guide

Pretty Dice is a browser app for designing procedural polyhedral dice and rolling them on a table. There is nothing to install and no account: open the page and it works. Designs, bags and settings stay on your device.

Read the pages in order the first time; later they work as reference.

1. [First steps](01-first-steps.md): what you see, the two modes, your first roll
2. [Designing a die](02-designing-a-die.md): shape, substrate, colours, numbers, relief and filigree
3. [The bag and shelf](03-bag-and-shelf.md): keeping several designs and switching between them
4. [Sets and the editor](04-sets-and-editor.md): rolling several dice at once, dice notation, saving sets
5. [Rolling](05-rolling.md): roll feel, flicking, shaking, holding the total, top-down look
6. [The roll log](06-roll-log.md)
7. [Saving and loading](07-save-load.md): designs, bags, images
8. [Phone versus desktop](08-phone-vs-desktop.md)
9. [Sound](09-sound.md)
10. [Games](10-games.md): Yahtzee, Farkle, Pig, Craps, Shut the Box, Ship Captain and Crew, Bunco, Liar's Dice

## Which pages depend on today's layout

The app's navigation is being redesigned (PD-142.38), so where buttons sit will change. These pages are written around tasks, not positions, but their screenshots and the sentences naming a button's place are tied to the current layout and will need a refresh: 01 First steps, 03 Bag and shelf, 05 Rolling, 06 Roll log, 08 Phone versus desktop, 10 Games. Pages 02, 04, 07 and 09 are mostly about controls that keep their names.

## About the pictures

Every screenshot is generated from the running app by `npm run guide` (see `scripts/guide-shots.mjs`), from fixed seeds, so the guide matches the current release. Do not edit the PNGs by hand: change the UI or the script and regenerate. If you change a control's label, update the page that names it.

Random looks are reproducible: add `?seed=7` to the address and the same dice appear every time. `?shape=d8`, `?sub=metal` and `?radius=` preselect a look.
