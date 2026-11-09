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
- **Export**: PNG/JPG at current view, 1024, 2048 or 4096 px.

Known gaps: epoxy lacks internal depth/inclusions, no d24/d30.
