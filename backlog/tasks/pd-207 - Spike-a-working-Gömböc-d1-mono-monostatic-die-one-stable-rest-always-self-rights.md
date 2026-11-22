---
id: PD-207
title: >-
  Spike: a working Gömböc d1 (mono-monostatic die: one stable rest, always
  self-rights)
status: In Progress
assignee: []
created_date: '2026-11-21T16:12:00Z'
updated_date: '2026-11-21T16:42:00Z'
labels:
  - v4.3
dependencies: []
priority: low
ordinal: 400000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner idea (2026-11-21): can we make a working Gömböc d1? A Gömböc is a smooth convex homogeneous body with exactly one stable and one unstable equilibrium (Várkonyi & Domokos 2006). As a die it has one 'face' (always rolls 1) and the fun is the wobble and self-righting behaviour. Feasibility notes: the physics engine is cannon-es with CANNON.ConvexPolyhedron (faceted hull), and every facet of a faceted approximation is itself a stable rest, so a polyhedral Gömböc only works if the facet count is high enough that the spurious stable facets are negligible (or if the facets are tilted so none of them are stable: Bezdek's 14-face monostable polyhedron and Conway-Guy's 19-face one exist but are extremely thin/flat). Real Gömböc flatness is small (a few %), so numerical precision and convex hull tolerances matter. Spike plan: (1) find the published radial parametrisation and verify numerically that it has exactly 1 stable + 1 unstable equilibrium (sample the distance-from-centre-of-mass function over the sphere, count minima/maxima/saddles); (2) a standalone spike page (tools/gomboc-spike.html) that renders the surface and rolls it on a plane with its own rolling-body integrator, to see it wobble and self-right; (3) test whether the surface meshed at N vertices inside cannon-es ConvexPolyhedron still self-rights (how many spurious stable facets at N=200/500/1000?), and whether a custom support-function shape is possible; (4) report whether it can ship as a novelty die (d1 shape option in Look, result always 1, maybe a quirky sound) or only as a tool page.
<!-- SECTION:DESCRIPTION:END -->

## Owner (2026-11-21)
Wants an experimental spike and a PLAYABLE SAMPLE when available (artifact page). Lane v42-gomboc (Sonnet, research allowed) builds tools/gomboc-spike.html (self-contained, CDN libs only) and docs/design/gomboc-spike.md; sample published as an artifact for the owner to play.

## Round 4 plan: "public mesh" recipe + physics fudge (owner, 2026-11-21; queued for after the 15:20 budget reset)
Research supplied by the owner (source unverified, no URL): how to make a public gomboc mesh roll reliably.
1. Volume-preserving smoothing: Taubin (lambda/mu) or Catmull-Clark subdivision, not plain Laplacian (shrinks crests).
2. Recompute the uniform-density volumetric centroid of the closed triangle mesh (trimesh, or Blender "Origin to Center of Mass (Volume)").
3. Check the radial distance function r(theta, phi) about the new CoM: a true gomboc has exactly one local minimum (stable) and one local maximum (unstable).
4. Failsafe: if a stubborn secondary local minimum remains, nudge the CoM by 0.1% to 0.5% of the radius toward the intended bottom; rolling stays visually indistinguishable.
Owner intent: for Pretty Dice a d1 gomboc is a novelty. It need not be rigorous; it must roll convincingly and always land on 1 (the only valid value). The simulation must keep track of what is mathematically rigorous versus approximate.
Caveats to respect: our round-3 finding is that no public ridged mesh exists (Couey 2604.17120: public meshes are visual approximations; gomboc.eu has no STL), so the recipe applies to (a) meshes we generate ourselves (the "More pronounced body" and Sloan shapes sampled to a triangle mesh) and (b) any community STL the owner finds; (c) for a convex body the critical points of r about the CoM are the equilibria, so step 3 is a sound check there but only for convex meshes.
Work to do (gomboc lane, branch v42-gomboc, same rules): (1) add a mesh pipeline to tools/gomboc-spike-verify/: load STL/OBJ (or our generated mesh), Taubin smooth, volumetric centroid, radial-function equilibrium count (reuse poly-equilibria.mjs / winding index), report each step; (2) a "fudge" option in the page: CoM nudge (0.0-0.5% of radius, default small) towards the intended bottom, plus whatever damping/settle assist is used, applied to the dynamics; (3) a visible rigor flag in the page and the doc: every shape/mode is labelled "exact (rigorous equilibria, analytic dynamics)" or "approximate (meshed, nudged CoM, assist)" with the nudge size shown, and the verifier reports equilibrium counts both without and with the nudge; (4) never silently replace a rigorous mode: keep Sloan and the pronounced body as exact modes, add the mesh/fudge as a separate selectable mode; (5) log everything in the Low-poly search log (F, E, V, C columns for polyhedral candidates).

### Candidate public base models (owner-supplied research, 2026-11-21; NOT yet verified, no URLs checked; the lane must find and verify each before use)
- Best for exact surface control: "Gömböc 3D CAD Model" on GrabCAD, STEP/IGES B-Rep (NURBS), exportable at any tessellation, no smoothing needed.
- Best high-resolution STL: updated Gömböc model on Thingiverse (thing:5173406, said to replace the original reverse-engineered model) and "Gömböc Mathematical Object" on Printables (watertight STLs, suitable for subdivision/Taubin).
- Avoid: low-poly Sketchfab Gömböc (~1,800 triangles) and the legacy Thingiverse 10190 / Cults3D reverse-engineered STL (crude photogrammetry approximations, won't self-right).
Verification duties for round 4: confirm each listing exists and its licence allows use/redistribution (do NOT commit third-party meshes into the repo without checking the licence; keep them out of git or link only), note the author's own claim about how the shape was obtained, then run the mesh pipeline (equilibrium count with/without CoM nudge) and report. This contradicts round 3's finding that exact geometry of commercial specimens is unpublished (Couey 2604.17120), so treat "exact" claims about these meshes as unproven until the equilibrium check passes. STEP/IGES needs a CAD-capable tool (e.g. OpenCascade/cadquery or FreeCAD) to tessellate; confirm one is available before promising that route.

Owner link (2026-11-21): a Google redirect that resolves to the GrabCAD library page https://grabcad.com/library/gomboc-convex-homogeneous-three-dimensional-body-1 ("Gomboc convex homogeneous three-dimensional body"). The server returned 403 to our fetch (login/bot block), so file formats, licence and author are unverified. Next step: owner can download the STEP/IGES/STL manually and drop it in a local folder (outside git) for the round 4 pipeline, or the lane tries another route; do not commit the file without checking the licence.

## Round 4 result (gomboc lane, 60cd2d9 on v42-gomboc; artifact v4)
- Mesh pipeline: tools/gomboc-spike-verify/mesh-pipeline.mjs (STL/OBJ, weld, volumetric centroid, Taubin, radial-function equilibrium count, poly-equilibria S/U/H with CoM nudge). `node mesh-pipeline.mjs file.stl --taubin 20 --nudge 0.001,0.003,0.005` or `--gen sloan:0.03|pronounced`.
- Validation on our own sampled meshes (2562-vertex icosphere): NOT mono-monostatic as meshes (radial function 13/13/24 min/max/saddle for Sloan; 13/12/23 pronounced). Taubin does not fix it; the recipe's CoM nudge lowers minima (7 / 4 at 0.5%) but never reaches 1 and increases polyhedron stable faces. So the nudge failsafe works only because the page integrates the exact smooth surface, not a mesh.
- Page: mode selector Exact (verified, default) vs Approximate (CoM nudge 0-0.5%, default 0.20) with a rigor banner (EXACT surface verified vs APPROXIMATE with nudge %, warning beyond safe value: Sloan 0.5%, pronounced 0.2%).
- Public models NOT obtained: GrabCAD, Thingiverse 5173406, 3dgo.app all 403. Owner must download manually (STEP/IGES -> STL), check licence, keep out of git, then run the pipeline. Unverified search snippet: a MakerWorld model forbids redistribution; design patent D614077 and Hungarian IP exist on the shape.
- Sloan level-4 mesh F/E/V = 5120/7680/2562, C = 15,360 (not a gomboc as a polyhedron).
