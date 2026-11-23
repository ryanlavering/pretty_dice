# Gömböc research: findings and methods (PD-207, PD-208)

Maintained by the integrator after every round. Last updated: 2026-11-22, after round 12; round 13 is running and round 14 is planned (see the end).

This summarises the research. The full per-round working log, with every table and number, is `docs/design/gomboc-spike.md` on branch `v42-gomboc` (sections 1 to 46). Code is in `tools/gomboc-spike-verify/` and the playable page is `tools/gomboc-spike.html` (published as the "Gomboc d1 spike" artifact). Cards: PD-207 (research and page), PD-208 (low-poly search), PD-209 (shape variants), PD-211 (Möbius strip d1, 4.3). None of this ships in 4.2.

## 1. Where we are, in one screen

* **Smooth bodies, homogeneous and exact surface.** A convex body with exactly one stable and one unstable equilibrium (a true Gömböc) exists in our search family up to a radius ratio r_max/r_min of **1.18** (bodies at 1.12, 1.15, 1.16, 1.17, 1.18). These are **numerically verified** (winding index on fine meshes, convexity, a nonempty CoM tolerance region), not mathematically proven. Sloan's analytic body (1.06) was the starting point; the first verified body that went past it was 1.105 (round 7).
* **Approximate bodies for play.** Ratios 1.12 to 1.25 become single-stable if the centre of mass is shifted by about 3 to 9 percent of the radius. These are labelled approximate on the page. The working window around the right shift is only a few tenths of a percent wide.
* **Polyhedra.** No convex polyhedron with exactly one stable face has been found by us. Hulls of the smooth bodies fail at every size tried (36 to 1.3M faces). Direct search reaches two stable faces easily (exactly certified at 24 faces) and stops there. The only known homogeneous one-stable-face polyhedra in the literature have tens of thousands of faces (56,946 faces for the current record in arXiv:2609.07827).
* **What is not done:** a true homogeneous Gömböc that looks like the Wikipedia photo (distinct ridges); a mathematically certified smooth body; any polyhedron with S = 1 from our own search.
* **The d1 in the app** is the Möbius strip (PD-211, 4.3). The Gömböc is a research artifact only.

## 2. Definitions

* **Equilibria.** A convex body resting on a flat plane has one resting state per direction u of the outward normal pointing down. The height of the centre of mass (CoM) is the support function h(u). Equilibria are the critical points of h on the sphere: stable = minimum, unstable = maximum, saddle otherwise. For a polyhedron: stable = faces, unstable = vertices, saddles = edges.
* **Poincaré–Hopf.** S − H + U = 2 for any convex body (S stable, H saddles, U unstable). A Gömböc has S = U = 1 and no saddles.
* **Mono-monostatic** = one stable point (S = 1). A Gömböc is a mono-monostatic body that also has exactly one unstable point. Homogeneous means uniform density, so the CoM is the volume centroid.
* **Foot point and stability prism (owner insight, round 13).** Face i of a polyhedron is stable if and only if the foot point of the CoM (its perpendicular projection onto the face plane) lies inside the face polygon. So each face has a prism of CoM positions for which it is stable, and the body is mono-monostatic for a given CoM exactly when that CoM is inside exactly one prism. Vertices are never stable; edges decide which way a face tips. The signed distance from the foot point to the polygon boundary is the face's *margin*.
* **Radius ratio.** r_max/r_min about the CoM, our measure of how far from a sphere a body is (Sloan's body 1.062; the physical Gömböc is much more pronounced than any near-sphere example).
* **D and M.** M is the set of CoM positions P for which the body, with its CoM moved to P, has exactly one stable and one unstable equilibrium. D is the smallest distance from the homogeneous CoM to M (in units of the mean radius). D = 0 means the homogeneous body is itself a Gömböc. The size of M is the tolerance: how far the CoM may move before the property is lost.
* **Persistence of the second minimum** (round 9): barrier height minus the height of the second minimum of the support function. It is about 0 for a monostable body and positive otherwise, and it is smooth in the CoM shift, so it can be used as an optimisation cost.

## 3. Findings, in the order they matter

1. **Sloan's analytic body works and is slow.** `r^4 = 1 + 4β sin φ cos(θ − P(φ))` with `P(φ) = (3π/2)(cos φ − cos³φ/3)` has exactly one stable and one unstable point (verified for β up to 0.036; convex up to about β = 0.04). All 82 scripted rolls ended at the same point, but settling takes about a minute of simulation time, so a faceted physics die cannot show it. The shape is a near-sphere (ratio 1.062).
2. **Faceted hulls of smooth bodies are the wrong route to a polyhedral Gömböc**, shown twice: sampled hulls (rounds 2 and 4) and exact hulls of the verified bodies (round 11). The number of stable faces grows or plateaus in the thousands as the mesh is refined. Reason (measured, argued, not proved): the support function of these bodies has long flat rings where the foot offset is smaller than the face size at every resolution, so many faces are stable. The count of spurious stable faces around a flat spot does not depend on face size.
3. **The exact-surface route saturated near 1.11 with a noisy cost, then broke through with persistence.** Winding-index counts and D are blind below the sampling resolution (round 7). The persistence of the second minimum is a smooth, noise-robust cost with a V shape in the CoM shift, and optimising it directly (round 10) reached 1.18 with zero CoM shift.
4. **The feasible set is a thin sliver.** The CoM tolerance shrinks as the body gets more pronounced (111 grid points for Sloan, 27 at 1.105, a handful at 1.12 to 1.18; a uniform copy tolerates only about 1 to 2.5 percent of the radius). Bodies near the limit are very sensitive.
5. **Convex bistable bodies with large ratios exist** (1.16 to 1.30). They have two stable points and need a CoM move of more than 3 percent. Whether more twist or family parameters allow a monostable body beyond 1.18 is open; round 10 treats 1.18 as the edge of this family at this budget.
6. **Public meshes do not help.** Thingiverse thing:10190 (the owner's upload) is not mono-monostatic (60 stable triangles, convexity violated). The other candidates were not obtainable (403).
7. **Polyhedral search is easy up to S = 2 and stops there.** One-vertex annealing, tipping-graph moves, half-space parametrisations and a twisted-stack family all reach S = 2 (18 to 24 faces), none reach S = 1. Letting vertices leave the hull helps; greedy tipping-graph moves alone and relaxing the aspect limit do not.
8. **Merging near-equal faces of the smooth-body hulls lowers the stable-face count in proportion to the face count** (about 0.25 to 0.3 stable faces per face), not toward 1: 2k faces to 642 (S 227); 6k to 286 (S 78); the smallest S found by merging is 23 to 26 at about 360 to 440 faces. Merging an S = 2 body raises S.
9. **The exact check is cheap and linear in face count** (about 15 microseconds per face; 0.016 s at 1k faces, 19.8 s at 1.3M), so it can sit inside an optimisation loop at 40 to 10k faces. The incremental convex hull is quadratic and is the practical limit above about 400 faces.

## 4. Methods

* **Equilibrium counting on a smooth body.** (a) Root finding of the tangential gradient of h from icosphere start points, classified by the Hessian; unreliable in the flat valley (6 to 96 percent of starts fail). (b) **Winding index** of the tangential gradient on every triangle of an icosphere (L5: 20,480 triangles; L6: 81,920), the method the claims rest on: the sum of indices is 2 and the number of −1 triangles is 0 for a Gömböc. (c) Naive discrete minima/maxima/saddle counts on a grid are not used for claims (spurious extrema grow with resolution).
* **Convexity.** Sampled principal radii of curvature and the support-function K minimum; sampled, not a proof.
* **Shape families.** Spherical harmonics up to degree 10 to 12 for r⁴ with the degree-1 part removed (this puts the CoM exactly at the origin); the 16-parameter **ring family** `r⁴ = 1 + A(t)cos(θ − P(t)) + B(t)cos(2θ − Q(t)) + e(3t²−1)` which contains Sloan as a special case (a0 = 0.12, p1 = 3π/2, p3 = −π/2) and adds an oval waist, axial profile and extra twist.
* **Optimisers.** Hill climbing (round 2), CMA-ES on the ring family (rounds 7 and 10), simulated annealing on vertex clouds (rounds 5 and 12), greedy tipping-graph moves, continuation in the target ratio (round 7).
* **Costs.** Ratio with convexity and winding constraints (round 7); D with an empty-M surrogate (round 6); persistence of the second minimum plus second maximum on an icosphere, with a convexity penalty (round 10); the exact stable-face count with persistence as tie-break (rounds 10 to 12); the signed foot-point margin cost (round 13, in progress).
* **Tipping graph** (`tipping-graph.mjs`): each non-stable face tips over the edge whose outer side contains its foot point to a lower neighbour; its sinks are exactly the stable faces. Poincaré–Hopf is a built-in consistency check.
* **Exact polyhedron checker** (`poly-check.mjs`, round 11): BigInt arithmetic on a dyadic-rational vertex grid (2⁻⁴⁰), exact volumetric centroid, exact local convexity certificate (every edge strictly locally convex, CoM strictly inside every face plane, which together certify strict convexity), exact stable/saddle/unstable sign tests, exact tipping graph; an optional global test (every vertex below every face plane).
* **Rolling physics on the page**: viscous rolling resistance (c = 2.0 by default), no slip, no bounce; settling time is simulation time for a 1.5 cm body, with a skip-to-rest button.
* **Rigor labels** used everywhere on the page and in the log: **exact** (rational arithmetic, no tolerance), **numerically verified** (finite-resolution checks, strong evidence, not a proof), **approximate** (a CoM shift or float-only check), **unverified**. Every claim in this document carries one of them.

## 5. Rigor ledger (what each headline claim rests on)

| Claim | Level | Basis |
|---|---|---|
| Sloan body has S = U = 1, β 0.012 to 0.036 | numerically verified | Newton roots + winding index at L5 |
| Exact bodies at ratio 1.105 to 1.18 are Gömböcs | numerically verified | winding index +2/−0 at L5 and L6, convexity K min 0.02 to 0.08, nonempty tolerance region; scripted rolls 20 to 30 of 30 on the one stable point |
| Approximate bodies 1.12 to 1.25 | approximate | CoM shift found by search; 30 of 30 offline rolls; the working window is a few tenths of a percent |
| 24-face and 194-face polyhedra have S = 2 | exact | BigInt checker, convexity certificate, global test (24 faces) |
| Hulls of the 1.16/1.18 bodies never reach S = 1 | exact (counts), argued (reason) | BigInt checker on the Fibonacci hulls up to 40k faces; icosphere hulls with exact edge flips to 1.3M faces; the flat-ring explanation is not proved |
| Direct search cannot reach S = 1 at 40 to 1000 faces | negative result | 72 runs of 60 to 150 s; absence of a hit is not evidence of nonexistence |
| Merging gives S about 25 at about 400 faces | exact | BigInt checker on 222 of 223 rows; the 223rd failed the convexity certificate (a sliver) |

## 6. Literature and reference data

* Sloan, "An Analytical Gomboc", arXiv:2306.14914. Couey, arXiv:2604.17120 (strict convexity limits Sloan's β). Várkonyi and Domokos (2006): the original construction, a very thin perturbation of a sphere, no closed form.
* Polyhedra: Conway and Guy (inhomogeneous, 19 faces); Bezdek (18 faces); Reshetov, "A unistable polyhedron with 14 faces" (IJCGA 2014; monostable, not a Gömböc, more than one unstable vertex); arXiv:2609.07827 (homogeneous mono-monostatic polytope with 56,946 faces, certified by exact rational arithmetic; also lists 272,971 faces). The prize mentioned in its footnote scales inversely with face count (the exact terms were not found, see section 14 of the log). A mono-monostatic 0-skeleton with 21 vertices (point masses, inhomogeneous) is cited in that paper. A search snippet defined a "polyhedral Gömböc" as S = U = 1 with no saddles; no existence or non-existence result was found.
* Not reproduced: the geometry of the physical Gömböc of the Wikipedia photo (no coordinates or STL found; the ridges are not reproduced by any of our bodies).

## 7. Open questions

* Is there a convex homogeneous polyhedron with S = U = 1 and far fewer than 56,946 faces? Round 13 and 14 aim at this with exact S as the cost.
* Does a weighted (non-homogeneous) low-poly body with S = 1 exist near the centroid of our certified S = 2 bodies? That would be a rigorous, playable low-poly d1 (round 13, item B).
* Can the smooth family go past 1.18 with more parameters (higher ring harmonics, a second spiral, an L5 winding term in the cost)?
* Can one body be certified with interval arithmetic so that it earns the label "mathematically verified"?
* What do distinct ridges, as in the photo, require? None of our bodies show them.

## 8. Per-round log

Round numbers follow the lane's log. There is no round 8 section in the log (the work went from round 7 to round 9). Commit hashes are on branch `v42-gomboc`.

### Round 1 to 2 (2026-11-21; b414d1e, 2a649ed): Sloan body, rolls, first pronounced body
* Built the page with Sloan's second analytic construction, a simulator with viscous rolling resistance, and verification scripts (roots, winding index, convexity, inertia).
* Results: S = U = 1, convex for β ≤ 0.04; 82 of 82 rolls end at the same point (≈ 60 s sim time at c = 0.6). Cannon-es cannot show this with a faceted hull (best case more than 60 resting orientations), so the page runs its own integrator. Verdict: a tool page, not an app die.
* Round 2: rolling resistance raised to 2.0 (faster settling), a hill-climbed spherical-harmonic body at ratio 1.10 (degree ≤ 10, winding +2/−0 at L5/L6, convexity sampled), a shape selector, skip-to-rest. First low-poly equilibrium counter: Fibonacci hulls of the smooth bodies have 47 to 859 stable faces. Negative: hulls are not Gömböcs.

### Round 3 (6a97cae): ridged shape, prize data
* Tried to reach a ridged, far-from-sphere body by continuation and by adding ridge harmonics: 1.1017 → 1.1043 with diminishing returns; ridge terms break convexity or add equilibria at 1 percent amplitude. Honest conclusion: the ridges of the physical Gömböc are not reproduced.
* Info/Controls toggles added. Collected polyhedral mono-monostatic data and the prize terms from the literature (table of known bodies).

### Round 4 (60cd2d9): public-mesh recipe, CoM nudge, rigor labels
* Mesh pipeline (weld, orient, volumetric centroid, radial check), Exact versus Approximate mode with a CoM nudge slider and a rigor banner. Public models were not obtainable. Sampled meshes of the exact bodies at icosphere levels 3 and 4 have over a thousand stable faces; nudging does not fix them.

### Round 5 (4495615): the thing:10190 mesh, procedural fit, tipping-graph search
* The mesh is closed and mirror-symmetric (ratio 1.31) but not convex and not mono-monostatic (60 stable triangles). A spherical-harmonic fit (degree ≤ 14) converges slowly and is itself neither convex nor monostable.
* Tipping-graph annealing with one-vertex moves on 14 to 60 points: every run ended at S = 2, none at S = 1; the cost is flat at two sinks so annealing becomes a random walk. First S = 2 polyhedra at 18 to 36 faces.

### Round 6 (fa07208): features, the D measure, ring family
* Extracted the mesh's main features (axis profile, aspect profile, no twist, two ridge curves, stable-end patch). Defined and implemented D and M (winding-index counts over a ball of CoM positions). Found the twist term is what Sloan's phase P(t) provides and the mesh lacks. Built the 16-parameter ring family and a twisted-stack polyhedron family (best (2,2,2)).

### Round 7 (76c0601): CMA-ES on the ring family
* Constrained CMA-ES with convexity margin and winding checks. Best ratio versus margin: 1.109 at margin 0, 1.105 at 0.05, 1.098 at 0.10, 1.089 at 0.20. The L3 loop overfits: finalists fail at L5/L6. Re-polished at L4 to the first verified body at **1.105** (+2/−0 at L5 and L6, K min 0.051, tolerance region 27 grid points).
* Continuation to 1.12 and 1.14 stays convex but becomes bistable (+3/−1, D ≈ 3 percent). Saturation near 1.11 attributed to the noisy discrete count.

### Round 9 (2026-11-22; ce8e9a7): approximate bodies, basin maps, persistence
* Five approximate bodies on the page (ratios 1.12, 1.14, 1.16, 1.20, 1.25, CoM shifts 2.8 to 8.9 percent, each 30 of 30 offline rolls on the one stable point; a shift 1.5 times too large splits the rolls). Face-flow basin maps show two basins of about 50 percent each at 1.14. Persistence of the second minimum falls nearly linearly with the shift and reaches its noise floor (about 4e-4) at the found shift; discovered as the smooth objective that winding counts and D lacked. Low-poly: S = 2 candidates still have second-face persistence 0.71 to 1.00.

### Round 10 (bc29eba): persistence as the cost, exact bodies to 1.18
* Optimised persistence directly (CMA-ES, ring family, zero CoM shift): verified bodies at 1.12, 1.15, 1.16, 1.17, **1.18** (+2/−0 at L5 and L6, convex, nonempty tolerance region); rolls at zero shift 20 to 30 of 30 on the one stable point. Persistence at the L6 floor (6e-5 to 2.6e-4). Nothing above 1.18 passed (persistence at L4 overfits; 1.19 and 1.198 fail at L5). Low-poly with persistence as the cost: persistence 0.085 to 0.09 (10 times closer than round 9) but S = 5 to 8, not monostable. Page: Exact bodies 1.16 and 1.18.

### Round 11 (34e1e4b): exact polyhedron checker, hulls never reach S = 1
* Built the BigInt checker (section 4) and ran hulls of the 1.16 and 1.18 bodies from 36 to 1.3M faces: S plateaus at 1e3 to 4e3. Timing linear (slope 0.98). Circumscribed variant: same. Reason: flat rings of the support function. Reduction was not run (no valid start). Negative result.

### Round 12 (c726d28): direct search and the merge experiment
* Direct search (vertex and half-space parametrisations, annealing and tipping-guided greedy, 72 runs): S = 2 at 40, 100, 200, 400 and 1000 faces, never S = 1; S = 2 exactly certified at 24 and 194 faces. Merging near-equal faces of the hulls (owner idea): S 23 to 26 at 360 to 440 faces, falls only in proportion to faces; merging an S = 2 body raises S. CMA-ES and the round-10 low-poly seed were not tried.

### Round 13 (in progress; started 2026-11-22 20:15)
* Planned: fast local-update mesh optimiser at 2k to 10k faces (6 to 10 microseconds per move reported), starting from merged seeds and from subdivided S = 2 bodies; (A) the foot-point margin cost; (B) the prism multiplicity map to look for a weighted CoM that makes a certified low-poly body single-stable; page additions (S = 2 and any S = 1 polyhedra as selectable shapes, default colouring by distance from the CoM). First reported: S 26 → 3 at 3k faces in 4 minutes (lane claim, not yet verified).

### Round 14 (planned)
* Face-cut experiment on the 24-face S = 2 body (owner idea): enumerate cut planes near the second stable face's foot point and re-run the exact check for each, to see whether a single cut makes the body single-stable. A convex roof over the face usually keeps two stable faces; a shaving cut shrinks the face so its foot point leaves the polygon, but cutting also moves the centroid and the tip must flow into the wanted face. This tests whether the second stable face is local or structural.
* Owner refinement: adding volume above a face's plane (a roof) is the same shape change as sinking the vertices it shares with its neighbours, so one move family covers both. The enumeration therefore includes inward moves of the shared vertices as well as cut planes. Sinking a vertex also tilts every other face that touches it, which shifts their foot points, and it moves the centroid, so each move is re-checked exactly.

## 9. How this document is kept up to date

After each round the integrator verifies the lane's push (ancestry, CSP check on the page), then updates section 1 (where we are), section 3 (findings), section 5 (rigor ledger) and appends to section 8 (the round log), and commits it to `v4`. The lane keeps its own detailed log in `docs/design/gomboc-spike.md` on `v42-gomboc`.
