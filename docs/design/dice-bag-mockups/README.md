# Dice bag mock-ups (PD-102, v3.0)

This folder is a source copy of the design canvas, saved on 2026-11-11. The live, clickable version is the claude.ai Design artifact: https://claude.ai/artifact/8mKiUWPknCMLQqevH5PCAk (private to the owner).

These files are Design Component pages (`.dc.html`). They depend on the artifact's runtime (`support.js`), so opening them straight from disk does not render them. Read them as a record of the layouts, copy and interactions. If the artifact is ever lost, republish them to a new Design canvas. `canvas.json` holds the board layout and the sticky notes.

| File | Board |
|---|---|
| `Main.dc.html` | Phone A: carousel shelf (showcase in bag mode) |
| `Drawer.dc.html` | Phone B: bag drawer (designs grid) |
| `BagSets.dc.html` | Phone B+: bag sets and characters |
| `Sets.dc.html` | Phone C: character sets; the row opens the roll mat, lightning is quick roll |
| `Flow.dc.html` | Main UI → shelf → editing flow (embeds `Main`) |
| `DeskShowcase.dc.html` | Desktop A: sidebar editor and shelf strip |
| `DeskBag.dc.html` | Desktop B: bag panel (Designs, Sets, Characters) |
| `DeskRoll.dc.html` | Desktop C: roll mat with sets sidebar and roll log |

Not drawn yet: the Modified badge, the random draft card, drag-to-reorder and dice jail. The design doc describes all of them: [../dice-bag-design.md](../dice-bag-design.md).
