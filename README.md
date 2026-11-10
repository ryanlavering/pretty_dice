# Pretty Dice

I like to play with pretty dice.

Pretty Dice generates random polyhedral "DnD" dice renders using a synthetic 3D texture shader, in the browser. Design a die, randomize one, roll it on a table, and export an image or a design file.

- **Shapes**: the standard 7 (d4, d6, d8, d10, d%, d12, d20) plus d14, d16 and the rhombic d12.
- **Numbers**: inset or embossed, with choice of font, size, rotation, depth and edge softness.
- **Substrates**: solid or swirled plastic, metallic plastic, metal, clear/dyed epoxy and marble.
- **Paint**: auto-picked for contrast and harmony with the base, random, or custom.

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

- **Shape / Generate**: pick a die, or generate a new one.
- **Randomize** (or press Space): rerolls the look. **Undo / Redo** (Ctrl+Z, Ctrl+Y) step through changes, including randomizes.
- **Substrate, Colors, Swirl scale, Finish**: control the base material, from matte to gloss.
- **Numbers**: font, size, rotation, depth, edge softness. The d4 can show corner-tip or face numbers; the d6 can use numbers or pips.
- **Edge radius**: how rounded the edges and corners are.
- **Paint mode**: Auto, Random or Custom.
- **Relief & patina**: recessed face panels with a sloped rim, raised or inset numbers, darker patina in recesses, and an Antique relief preset.
- **Filigree**: scroll, beaded or art-deco etching filled with enamel (not available on d4 corner-tip dice).
- **Epoxy**: clarity, bubbles, glitter, and an **inclusion**, either a built-in rubber duck or your own glb/obj/stl miniature cast inside the die.
- **Reset to defaults** clears everything.

Drag to orbit, scroll or pinch to zoom, double-click to reset the view.

## Rolling Dice

Press **Roll** (or `r`) to throw the die onto a table using rigid-body physics (cannon-es), with roll and impact sounds (volume is adjustable). Click or flick the table to roll again. Natural 20s and natural 1s get their own effects. **Showcase** switches back to the spinning display view; spin speed is adjustable.

### Rolling Multiple Dice

- **Standard 7** shows and rolls the full set together.
- **Custom set** takes dice notation such as `4d6+2d10+3`, or use the steppers. It supports d4 to d20, d14, d16, d%, a +/- modifier and up to 24 dice, and shows the total with a per-term breakdown.

## Desktop vs. Mobile

The layout fits narrow windows. On touch devices, drag to orbit, pinch to zoom, and flick to roll again. Optionally, shake the phone to roll (needs motion sensors; the browser may ask permission).

## Saving and Loading

- **Settings** persist automatically in localStorage.
- **Export** the current view as PNG or JPG at current size, 1024, 2048 or 4096 px.
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
- Headless test hooks: `?test=roll` (add `&n=10d4+5d20` for a custom set, `&norel=1` to skip re-rolling leans, `&az=`/`&el=` to orbit), `?test=export`, `?test=json`, `?test=jsonfile`, `?test=shake`. `?full=1` starts with the settings pane hidden.
- Clear localStorage when testing defaults.
- To test offline, block the CDNs, e.g. with Chrome's `--host-resolver-rules="MAP cdn.jsdelivr.net ~NOTFOUND, MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND"`.

# Further reading

- Design file format: [docs/design/design-format.md](docs/design/design-format.md)
- Ordering real dice: [docs/design/manufacturing-plan.md](docs/design/manufacturing-plan.md)

# Known gaps

- Epoxy lacks internal depth.
- No d24 or d30 yet.
- No manufacturer-ready export (STL/STEP) yet.

# License

Apache License 2.0. See [LICENSE](LICENSE). Bundled libraries and fonts keep their own licenses (MIT, SIL OFL); see [vendor/README.md](vendor/README.md).
