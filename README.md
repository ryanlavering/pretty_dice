# Pretty Dice

I like to play with pretty dice.

Pretty Dice generates random polyhedral "DnD" dice renders using a synthetic 3D texture shader, in the browser. Design a die, randomize one, roll it on a table, and export an image or a design file.

- **Shapes**: the standard 7 (d4, d6, d8, d10, d%, d12, d20) plus d14, d16 and the rhombic d12.
- **Numbers**: inset or embossed, with choice of font, size, rotation, depth and edge softness.
- **Substrates**: solid or swirled plastic, metallic plastic, metal, clear/dyed epoxy and marble.
- **Paint**: auto-picked for contrast and harmony with the base, random, or custom.
- **Rolling**: a tray sized to the dice, adjustable bounce and friction, and leaning dice that are flagged and re-rolled in one tap.

See [CHANGELOG.md](CHANGELOG.md) for what is new.

## Quick start

No install or build step. Serve the folder and open it:

```sh
python3 -m http.server 8123
# open http://localhost:8123/index.html
```

URL parameters preselect a look, e.g. `?shape=d20&sub=swirl` (also `?radius=`).

Online, the page loads three.js, cannon-es and fonts from cdn.jsdelivr.net and Google Fonts. If the CDN can't be reached (3 s check) it falls back to the local `vendor/` folder; `?libs=local` or `?libs=cdn` force one. For a single double-clickable file with no network needed, run `python3 scripts/build-static.py` and open `dist/pretty-dice-offline.html`.

# Using

## Designing Dice

The controls sit in a settings pane beside the dice (above them on a phone). The round buttons along the bottom of the view show or hide the settings, turn sound on or off, pause the spin, show the control hints (ⓘ) and switch between Showcase and Roll.

- **Randomize** (or press Space) rerolls the look; the arrows beside it are **Undo / Redo** (Ctrl+Z, Ctrl+Y), including randomizes. "Also randomize" chooses whether the substrate and the shape change too.
- **Shape**: pick a die, or build a **Custom set** (see below).
- **Substrate** and **Colors**: the three base colors are shared by every substrate and stone type, so switching substrate keeps your colors. Only Randomize and the two buttons beside the swatches make new ones: the shuffle button re-rolls just the base colors, and for stone the paintbrush paints in the chosen stone's natural colors.
- **Swirl scale, Edge radius, Finish** (matte to gloss), **Paint mode** (Auto, Random or Custom for the numbers).
- **Stone**: the type changes only the texture, not the colors.
- **Numbers**: font, **size** (0.45 to 5 times the face, on a log scale; large sizes are cropped by the face edges on purpose), rotation, depth and edge softness. The d4 can show corner-tip or face numbers; the d6 can use numbers or pips.
- **Relief & patina**: recessed face panels with a sloped rim, raised or inset numbers, darker patina in recesses, and an Antique relief preset.
- **Filigree**: scroll, beaded or art-deco etching filled with enamel (not available on d4 corner-tip dice).
- **Epoxy**: clarity, bubbles, glitter, and an **inclusion**, either a built-in rubber duck or your own glb/obj/stl miniature cast inside the die.
- **Showcase**: spin speed. The pause button is on the view itself.
- **Reset to defaults** clears everything.

Drag to orbit, scroll or pinch to zoom, double-click to reset the view. Showcase and Roll keep their own camera angle and zoom.

## The Dice Bag

The shelf along the bottom holds your designs as cards; tap one to select it, wheel or drag to scroll. Each card's menu copies, renames, moves and deletes it, and a changed design shows **Modified** with Save, Revert and Save as copy.

The **Sets** tab holds named rolls (like `2d6+3`, or a mix of designs). **Quick roll** logs a total without leaving the screen; **Open and roll now** puts the dice on the mat. Edit a set with its menu, the ✎ button on wide screens, or a long press on a phone; ✕ asks before dropping unsaved edits. The **roll log** keeps the last 200 rolls; tap a set name to bring it to the mat without rolling.

## Rolling Dice

Press **Roll** (or `r`) to throw the dice onto a table using rigid-body physics (cannon-es). Flick the table (or click it) to roll again. Natural 20s and natural 1s get their own effects: a glow and fireworks, or a greyed die and a dimmed room.

- **The tray** is sized from the dice (how many and how big), not from the screen, and the camera starts far enough back to show all of it. Zoom is yours to change.
- **Roll feel & sound** (it moves to the top of the pane while you roll): **Bounciness**, **Dice friction** and **Mat friction** change how the dice behave; the defaults are slippery enough that dice slide apart instead of snagging.
- **Leaning dice** are never hidden. A die that comes to rest propped on another, or balanced on an edge, gets an orange ring on the mat and a warning. **Re-roll leaning** drops only those dice in again from above. If one of them later tips over, the result and any natural 20 effect are read again.
- **Sound** is off until you turn it on (the speaker button on the view, or the checkbox); see [Sound](#sound) below. On an iPhone the sound plays even when the ring/silent switch is on silent. **Test sound** plays a blip and shows what the browser says about audio, which helps when a phone stays quiet.

### Sound

Impacts are short recordings of real dice (CC0), picked by how hard each die hits and by what it hits, with a synthesised fallback. The controls are in **Roll feel & sound**:

- **Sound set**: *Blend* (default), *Kenney samples*, *Best-of samples*, *Procedural synth* or *Classic synth*. Switch any time; **Audition** plays a sample roll through the current set.
- **Best ↔ Kenney** blends the two sample sets: Best is bright and clacky (wood, plastic), Kenney is darker and richer (felt, leather). *Layered* plays every hit from both sets at once, *Per hit* picks one set for each hit, *Auto* chooses by hardness alone.
- **Surface (for sound)**: felt, carpet, leather, cardboard, wood, plastic, stone, metal or glass. With the die's material it sets how sharp each hit is: stone on glass is a bright clack, plastic on felt a soft thud. This changes the sound only, not how the dice roll.
- **Metal / glass ring**: struck metal and glass ring. A metal die, or a metal or glass surface, adds a ring that gets stronger with harder hits. 0 turns it off.
- **Spatial width (stereo)**: each hit is placed left or right by where it lands in the view, and gets quieter and duller the farther it is from the camera. 0 is mono; the default is half. You hear it on headphones or stereo speakers, not on a phone's built-in speaker.
- **Rolling sound** (off by default): soft ticks as dice tumble across the mat.
- Pile-ups of overlapping hits are limited so they cannot clip.

How it works and how to tune it: [sounds/README.md](sounds/README.md).

### Rolling Multiple Dice

- **Standard 7** shows and rolls the full set together.
- **Custom set** takes dice notation such as `4d6+2d10+3`, or use the steppers. It supports d4 to d20, d14, d16, d%, a +/- modifier and up to 24 dice, and shows the total with a per-term breakdown. The cross button next to **Set** clears it back to a single d20.

## Desktop vs. Mobile

The layout fits any window: the settings pane sits beside the view on a wide screen and below it on a narrow one. The button at the bottom left of the view hides the settings for a full-screen view and brings them back. On touch devices, drag to orbit, pinch to zoom, and flick to roll again. Text fields are 16 px so iOS Safari does not zoom in when you tap them. Optionally, shake the phone to roll (needs motion sensors; the browser may ask permission).

## Saving and Loading

- **Settings** persist automatically in localStorage.
- **Export** the current view as PNG or JPG at current size, 1024, 2048 or 4096 px.
- **The bag** (designs, sets, roll log) persists in localStorage and saves, loads and copies as one file from the Bag sheet.
- **Save design / Load design** writes and reads a versioned JSON file (with a design name). Format: [docs/design/design-format.md](docs/design/design-format.md).

## Other Features

- Keyboard: Space randomizes, `r` rolls, Ctrl+Z / Ctrl+Y undo and redo.
- Opposite faces always sum to N+1.

# Design

`index.html` is a single-file, zero-build Three.js app.

- **Shapes**: vertex set -> convex hull -> coplanar faces merged. Adding a shape means adding a vertex list.
- **Numbers**: per-face UV atlas; a bump map gives the inset, a mask paints the recess.
- **Substrates**: one physical material with an injected 3D noise shader (domain-warped swirl, marble veins, metal flakes); clear epoxy uses transmission.
- **Edges**: real rounded geometry (faces inset by the radius, cylindrical edge strips, spherical vertex patches).
- **Physics**: cannon-es rigid bodies on a table.
- **State**: one settings object, persisted to localStorage (`prettydice.v1`) and serialised to the design JSON.
- **Libraries**: `vendor/` holds local copies of three.js, cannon-es and fonts ([vendor/README.md](vendor/README.md)). `scripts/build-static.py` inlines everything into `dist/` (git-ignored); keep the `<!--BOOTSTRAP-->` markers in `index.html`.

# Development

- Work is tracked in `backlog/` using [backlog.md](https://github.com/MrLesk/Backlog.md) (task prefix `pd`; `backlog board`).
- Tests: `npm install` once (dev-only; the app itself still needs no install), then `npm test`. `npm run test:docker` runs the same suite in the pinned Playwright image, including the visual baselines. See [docs/design/testing.md](docs/design/testing.md).
- `?seed=N` makes the look and the rolls reproducible. `?full=1` starts with the settings pane hidden.
- Clear localStorage when testing defaults.
- Sound: the sample sets are built by `scripts/build-sounds.mjs`; tune by ear at `/tools/sound-audition.html` while serving the repo ([sounds/README.md](sounds/README.md)).
- To test offline, block the CDNs, e.g. with Chrome's `--host-resolver-rules="MAP cdn.jsdelivr.net ~NOTFOUND, MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND"`.

# Further reading

- Sound engine, sample sets and tuning: [sounds/README.md](sounds/README.md) (sample credits: [sounds/CREDITS.md](sounds/CREDITS.md))
- Design file format: [docs/design/design-format.md](docs/design/design-format.md)
- Ordering real dice: [docs/design/manufacturing-plan.md](docs/design/manufacturing-plan.md)

# Known gaps

- Roll feel presets (wood, felt, glass...), a drawn tray, characters and a dice jail are planned (see `backlog/`).
- Epoxy lacks internal depth.
- Sound: no recordings yet for stone, metal or glass hits, and the nat 20 / nat 1 effects are synthesised.
- No d24 or d30 yet.
- No manufacturer-ready export (STL/STEP) yet.

# License

Apache License 2.0. See [LICENSE](LICENSE). Bundled libraries and fonts keep their own licenses (MIT, SIL OFL); see [vendor/README.md](vendor/README.md).
