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
  "numbers": { "font": "cinzel", "size": 0.65, "rotation_deg": 0, "depth": 2.2, "softness": 3 }
}
```

- `shape`: `d4 d6 d8 d10 d100 d12 d20 d14 d16 rd12 set7`. `set7` is the Standard 7 set.
- `substrate`: `solid swirl pearl metal epoxy marble`. `colors` has 3 entries; solid and metal use only the first.
- `edge_radius` is in units of the die's circumradius (1.0).
- `numbers.depth` and `softness` are rendering values (bump scale, blur px) today, not millimetres.
- Loading validates the version, shape, substrate and colours, and clamps numeric ranges. Unknown fields are ignored.

## Reserved for manufacturing (not implemented)

`size_mm` (across-flats), `material`, `finish`, `number_depth_mm`, `quantity`. Adding these bumps `version` to 2; v1 files will still load.
