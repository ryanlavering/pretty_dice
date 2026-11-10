# Pretty Dice

I want to see pretty dice.

This is a project to generate random DnD dice "renders" using a synthetic 3d texture application.

The user should be able to choose any of the standard 7 DnD dice, as well as popular variant polyhedral shapes.

Numbers on the dice should be rendered inset / embossed.

Dice paint color is randomized or chosen with respect to the dice base.

Dice base is chosen from a pool of common dice substrates (single color plastic, swirled, metalic plastic, metal, clear/dyed expoxy, etc.).

# Design

TBD
# Design (initial prototype)

`index.html` is a zero-build Three.js prototype (serve with `python3 -m http.server`, open `/index.html`; `?shape=d20&sub=swirl` preselects).

- **Shapes**: vertex set -> convex hull -> coplanar faces merged. d4/d6/d8/d10/d%/d12/d20 plus d14, d16, rhombic d12. Adding a shape = adding a vertex list. Opposite faces sum to N+1.
- **Numbers**: per-face UV atlas; a bump map gives the inset, a mask paints the recess. Paint is auto-picked for contrast against the base (overridable).
- **Substrates**: one physical material with an injected 3D noise shader (domain-warped swirl, marble veins, metal flakes). Solid, swirl, metallic plastic, metal, clear epoxy (transmission), marble.
- **Edges**: real rounded geometry (faces inset by the radius, cylindrical edge strips, spherical vertex patches); radius is adjustable.
- **Paint**: Auto (contrast + harmony), Random, or Custom.
- **Export**: PNG/JPG at current view, 1024, 2048 or 4096 px; save/load design as JSON.
- **Roll**: cannon-es rigid-body physics on a table; **Standard 7** view shows the full set.
- **Relief & filigree**: recessed face panels with a sloped rim, raised or inset numbers, darker/duller patina in recesses, and scroll/beaded/art-deco filigree etched into each face and filled with enamel (not on d4 corner-tip dice).
- **Epoxy inclusion**: a built-in rubber duck or your own glb/obj/stl miniature cast inside clear epoxy.
- **Settings** persist in localStorage.

**Running it.** `index.html` is the whole app. Online it loads three.js, cannon-es and the fonts from cdn.jsdelivr.net and Google Fonts. If the CDN cannot be reached (3 s check) it falls back to the local `vendor/` folder (serve over http, e.g. `python3 -m http.server`); `?libs=local` / `?libs=cdn` force one. For a fully static, no-network, double-clickable copy run `python3 scripts/build-static.py` and use `dist/pretty-dice-offline.html`.

Design file format: [docs/design/design-format.md](docs/design/design-format.md). Ordering real dice: [docs/design/manufacturing-plan.md](docs/design/manufacturing-plan.md). Work is tracked in `backlog/` (backlog.md; `backlog board`).

Known gaps: epoxy lacks internal depth/inclusions, no d24/d30.
