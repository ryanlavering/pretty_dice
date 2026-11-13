# Design file format

Dice designs are saved/loaded from the app (Export -> Save design / Load design) as versioned JSON.

**Why JSON, not TOML:** the browser reads and writes it natively (no library), it nests cleanly, and the same file can later be sent to a quoting/ordering service. TOML would be nicer for hand editing; it is tracked as a low-priority option (PD-22). JSON stays canonical.

```json
{
  "format": "pretty-dice",
  "version": 1,
  "shape": "d20",
  "substrate": "swirl",
  "colors": ["#6f8fe8", "#a784f5", "#d8c4f5"],
  "paint": "#f4f1e8",
  "paint_mode": "custom",
  "pattern": { "scale": 1.6, "offset": [11, 23, 37], "seed": 123456 },
  "edge_radius": 0.04,
  "numbers": { "font": "cinzel", "size": 0.65, "rotation_deg": 0, "d4_style": "tips", "d6_style": "numbers", "depth": 2.2, "softness": 3 },
  "relief": { "panel": 0, "panel_depth": 0.5, "numbers": "inset", "paint_numbers": true, "patina": 0 },
  "filigree": { "style": "none", "filled": true, "enamel": null }
}
```

- `shape`: `d4 d6 d8 d10 d100 d12 d20 d14 d16 rd12 set7`. `set7` is the Standard 7 set.
- `substrate`: `solid swirl pearl metal epoxy marble`. `colors` has 3 entries; solid and metal use only the first.
- `edge_radius` is in units of the die's circumradius (1.0).
- `numbers.depth` and `softness` are rendering values (bump scale, blur px) today, not millimetres.
- Loading validates the version, shape, substrate and colours, and clamps numeric ranges. Unknown fields are ignored.

## Bag file

The whole bag saves and loads as one file (Bag sheet: Save, Load, Copy). Single design files above still load, as a bag of one named after the design.

```json
{ "format": "pretty-dice-bag", "version": 1, "name": "My bag",
  "designs": [ { "id": "d1", "name": "Blue swirl", "design": { /* a design as above */ } } ],
  "sets": [ { "id": "s1", "name": "Fireball", "terms": [ /* dice terms */ ], "mod": 0 } ],
  "pending": {}, "log": [] }
```

- `sets[].terms` refer to designs by id (`@design` follows the selection). `mod` is the flat modifier.
- `pending` holds unsaved edits so nothing is lost on export; `log` is the roll log (last 200 rolls).
- Import adds designs and sets and renames id and name clashes (`Name 2`). Invalid designs and dangling references are dropped and reported. `characters` and `jail` are reserved for later versions.
- The browser keeps the bag in localStorage under `prettydice.bag.v1`; first run converts the old `prettydice.v1` settings into a bag of one.

## Reserved for manufacturing (not implemented)

`size_mm` (across-flats), `material`, `finish`, `number_depth_mm`, `quantity`. Adding these bumps `version` to 2; v1 files will still load.
