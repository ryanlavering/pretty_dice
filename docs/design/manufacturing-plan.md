# Ordering custom dice from a manufacturer: plan and feasibility

Status: research draft (2026-11-09). Vendor facts come from web search results, mostly vendor and marketplace pages, and are **not independently verified**. Anything marked *verify* needs a real quote or a call before we rely on it.

## Verdict

Feasible, in stages. The cheapest honest path is **"export a manufacturer-ready package and hand it to a vendor"**, not an in-app checkout. The main engineering gap is that our numbers are currently a bump-map illusion; a vendor needs a real mesh with engraved numbers in millimetres. The look (swirls, translucent epoxy) cannot be reproduced exactly by any process, only approximated from a palette and a reference render.

## Manufacturing routes

| Route | Typical volume | Cost shape | Fit for this project |
|---|---|---|---|
| On-demand 3D print (SLA/resin, SLS, metal) | 1+ | Per-part, no tooling | Best for a first physical prototype and one-offs. Print quality and surface finish limited; FDM tolerance is around +/-0.2 mm, too coarse for dice. |
| Resin casting (silicone mould from a printed master) | ~50-500 | Mould and labour heavy, cheap per unit at scale | The usual route for small-batch dice makers. Supports swirls, translucent and glitter looks. |
| Factory resin dice (Alibaba / Global Sources class) | listings show MOQs from 1-3 sets (stock designs) to 50-2,000 (custom) | Roughly $1.50-2.20 per set at 50-set MOQ, much more for custom samples (*verify*) | Good for a real product; custom mould or paint specs needed. |
| Injection moulding | thousands | Tooling in the thousands of dollars; sources cite MOQs of 1,000-5,000 | Not for personal one-offs. |
| CNC or cast metal | 1+ | Expensive per piece | Possible later for the "metal" substrate. |

## What the app would need to produce

1. **Real geometry.** Watertight mesh in millimetres with numbers actually engraved (not bump-mapped). Plan: convert font glyphs to outlines (opentype.js), then subtract extruded glyphs from each face with a mesh-boolean library in the browser (manifold-3d WASM is the likely choice; *verify* fit). Keep our current rounded-edge construction.
2. **Real size.** Add `size_mm` (across-flats) with sane defaults per die; scale on export.
3. **Number depth/min feature size in mm** matched to the vendor's process (*verify* per vendor).
4. **Paint as a separate body.** Number paint exported as its own body or region (3MF multi-body) so the vendor can fill engraved numbers.
5. **Formats.** STL is the universal baseline (geometry only, no colour or scale). 3MF carries colour, materials and units. STEP is only needed if a vendor wants CAD. Export STL and 3MF.
6. **Spec sheet.** Auto-generated JSON/PDF: design file, preview renders (PNG already exists), palette with hex values, finish, size, the die set, and fairness notes.
7. **Fairness checks.** Centred mass, face areas and opposite-face sums for the chosen shape. We already generate the hull from symmetric vertex sets.

## Vendor integration options (from search)

- **Craftcloud (All3DP):** accepts STL, 3MF, OBJ, STEP; compares quotes across partners; no account needed. No public API found, so manual upload at first.
- **JLC3DP:** has an API covering upload, pricing, ordering and order status, but access appears limited to company partners with order-volume requirements.
- **Sculpteo:** offers an API for upload, instant quote, cart and order tracking.
- **Shapeways:** has a developer API, but the company reportedly filed for bankruptcy in July 2024. *Verify* it is operating before any dependency.
- **Slant3D / Xometry:** no usable public ordering API found; Xometry is web or CAD-plugin based. A third party (PartPacket) offers quote estimates for a 10% fee but does not place orders.
- **Dice makers and factories:** no APIs; the workflow is email, a spec sheet, a sample, then a production run.

## Phased plan

| Phase | Deliverable | Notes |
|---|---|---|
| 0 (done) | Design JSON save/load, PNG export | Lets designs be kept and shared. |
| 1 | `size_mm`, engraved-number mesh, STL + 3MF export, spec sheet | The core engineering work. Validate with a local printed test d20. |
| 2 | Pilot orders | Get quotes and samples from 2-3 vendors (one print service, one small-batch dice maker, one factory). Learn legibility, tolerances, and how they want colours specified. |
| 3 | Quote/handoff integration | Craftcloud upload link first; API integration only where a vendor grants access (Sculpteo likely easiest). |
| 4 | Ordering | Prefer redirecting to the vendor's checkout. Avoid becoming the merchant of record unless volume justifies it. |

## Risks and open questions

- **Look fidelity:** swirl patterns and epoxy clarity are artistic; vendors match by palette and reference, so previews must be labelled "artist's impression".
- **Engraving limits:** minimum glyph size/depth per process is unknown; thin fonts (Cinzel serifs) may not survive, so offer a "manufacturing-safe" font set.
- **Licensing:** the app uses Google Fonts (open licences, *verify* each before shipping glyph outlines in vendor files).
- **Safety/regulation:** personal one-offs are low risk; selling sets as games or toys may bring small-parts and labelling rules (*verify* by market).
- **Cost transparency:** we cannot estimate price without vendor data; show vendor quotes only.
- **Unverified:** all MOQ and price figures above come from listings and blogs.

## Sources

- [Awesome Dice: custom dice manufacturing](https://www.awesomedice.com/blogs/news/custom-dice-manufacturing)
- [Board Games Maker: custom polyhedral dice](https://www.boardgamesmaker.com/customized/polyhedral-dice.html)
- [Resiners: resin-casting a d20](https://resiners.com/blogs/resiners-guide/how-to-make-a-20-sided-die-resin-cast)
- [Alibaba custom resin D20 supplier guide](https://www.alibaba.com/price-comparison/custom-d20-maker)
- [JLC3DP API](https://jlc3dp.com/help/article/jlc3dp-api)
- [Sculpteo API services](https://sculpteo.com/en/services/api-services/)
- [Shapeways developers](https://developers.shapeways.com/)
- [Craftcloud explained (All3DP)](https://all3dp.com/1/craftcloud-by-all3dp-simply-explained/)
- [3MF vs STL (JLC3DP)](https://jlc3dp.com/blog/3mf-vs-stl)
