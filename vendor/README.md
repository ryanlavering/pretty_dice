# vendor/

Local copies of the libraries and fonts that `index.html` normally loads from the internet, used automatically when the CDN cannot be reached (or with `?libs=local`).

| What | Version | Source | Licence |
|---|---|---|---|
| three.js (`three/build/three.module.js`) | 0.160.0 | cdn.jsdelivr.net/npm/three@0.160.0 | MIT (`three/LICENSE`) |
| three.js addons used: RoomEnvironment, GLTFLoader, OBJLoader, STLLoader, BufferGeometryUtils | 0.160.0 | same package, `examples/jsm/` | MIT |
| cannon-es (`cannon-es/dist/cannon-es.js`) | 0.20.0 | cdn.jsdelivr.net/npm/cannon-es@0.20.0 | MIT (`cannon-es/LICENSE`) |
| Fonts: Cinzel, Inter, Uncial Antiqua, Metamorphous (latin subsets, woff2) | Google Fonts, fetched 2026-11-09 | fonts.google.com | SIL Open Font License 1.1 |

To update: change the version in the loader at the top of `index.html` and re-download the same file paths from jsdelivr. Keep the versions in `index.html` and this table in step.

Notes
- The local copy has to be served over http (for example `python3 -m http.server`); browsers refuse to load ES modules from `file://`.
- For a copy that works from a double-click with no server and no folder, run `python3 scripts/build-static.py` (writes `dist/pretty-dice-offline.html`, about 3 MB).
