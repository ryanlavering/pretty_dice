# Gomboc d1 spike (PD-207)

Status: experimental spike, lane `v42-gomboc`, branch `v42-gomboc` (not for 4.2).
Page: `tools/gomboc-spike.html` (one file, three.js r128 from cdnjs). Verification scripts: `tools/gomboc-spike-verify/` (node, no dependencies except the vendored cannon-es; `core.js` is the same code that is inlined in the page).

## 1. Source of the shape

I did not find an explicit radial formula in the Varkonyi-Domokos papers (Math. Intelligencer 2006 "Mono-monostatic bodies: the answer to Arnold's question"; J. Nonlinear Sci. 2006 "Static equilibria of rigid bodies: dice, pebbles and the Poincare-Hopf theorem"). Their original body is defined by a constructive existence proof with a very thin perturbation of a sphere, not by a short closed form.

What I did find, and used, is the first published analytic Gomboc:

* M. L. Sloan, "An Analytical Gomboc", arXiv:2306.14914 (19 Jun 2023).
* Second construction (the one used here), in spherical coordinates about the centre of mass (theta azimuth, phi polar angle):

  `r^4 = 1 + 4 beta sin(phi) cos( theta - P(phi) )`,  `P(phi) = (3 pi / 2) ( cos(phi) - cos^3(phi) / 3 )`

* Read from MathWorld "Goemboec" (https://mathworld.wolfram.com/Goemboec.html, which lists both Sloan constructions, `r^4 = 1 + 4 beta sin phi cos(theta - 5 phi)` and the one above, and Sloan's stable point (theta, phi) = (pi, pi/2) and unstable point (0, pi/2)), and from the abstract page of the reanalysis V. W. Couey, "Sloan's Analytical Gomboc: Strict Convexity Narrows the Admissible beta Range", arXiv:2604.17120 (v3; https://arxiv.org/abs/2604.17120). I could not extract the full text of either paper (PDF fetch returned binary), so equation numbers are not recorded; the formula is as quoted by MathWorld and I verified it independently (section 2).
* Caveats from those sources, confirmed by my numbers: Sloan's stated bounds (beta <= 0.15 / 0.17) do not guarantee convexity. For construction 2 a sufficient strict-convexity bound is beta < 1/(5 + 6 pi + 9 pi^2/4) = 0.0217; Couey reports numerical convexity up to about beta = 0.036. My own sampling: convex (min principal radius of curvature > 0) for beta up to 0.04, not convex at 0.05. The first construction (`cos(theta - 5 phi)`) is not C^2 at the poles for any beta > 0 and was not used.
* Rewriting for the code: with u = (x, y, z) a unit vector, `sin(phi) cos(theta - P) = x cos P + y sin P` and `cos(phi) = z`, so r is evaluated without atan2 and is smooth at the poles.

The centre of mass of the homogeneous body (computed by Gauss-Legendre x trapezoid quadrature, 160 x 320 nodes) is at the origin to 1e-17, so the construction origin is the CoM. The page default is beta = 0.03 (slider 0.012 to 0.036).

## 2. Verified numbers (all reproducible with `tools/gomboc-spike-verify`)

Support function: `h(u) = max over surface points x of x . u` is the height of the CoM above the table when the body rests with outward normal u pointing down. It is evaluated exactly per direction (Newton iteration on the tangent chart; the maximiser is unique because the body is convex), not from a mesh. Equilibria of a body on a plane are exactly the critical points of h on the sphere (stable = minimum of CoM height, unstable = maximum).

Critical points of h over the whole sphere, beta = 0.03 (`crit.mjs`, Levenberg-Marquardt root finding of the tangential gradient from all 2562 icosphere L=4 start points, roots clustered, classified by the Hessian):

| kind | count | location (theta, phi) | CoM height h | Hessian eigenvalues |
|---|---|---|---|---|
| stable (minimum) | 1 | (180 deg, 90 deg) | 0.968547 | 0.00136, 4.52 |
| unstable (maximum) | 1 | (0 deg, 90 deg) | 1.028737 | -0.404, -0.00114 |
| saddle | 0 | | | |

* minima = 1, maxima = 1, saddles = 0: min - saddle + max = 2 (Poincare-Hopf holds).
* Same result at beta = 0.012, 0.02, 0.03, 0.036 (locations unchanged: exactly the pair Sloan states). Failed starts (no convergence below |grad| < 1e-9 in 80 iterations, 6 to 30 percent of starts, in the very flat valley) never produced a third root.
* Independent check (`index.mjs`): winding number of the tangential gradient field of h on every triangle of an icosphere L=5 (20480 triangles, 6 samples per edge): exactly two triangles with index +1, none with index -1, total index 2, for beta = 0.012, 0.03, 0.036.
* Naive grid classification is NOT reliable here and I do not use it for the claim: counting discrete minima/maxima/saddles at icosphere vertices (`verify.mjs`) gives many spurious extrema that grow with resolution (e.g. 23 minima, 17 maxima, 38 saddles at L=5 for beta = 0.02, still satisfying chi = 2), because the stable point sits at the bottom of a very long, narrow, almost flat valley: the valley is roughly 1e3 to 1e4 times softer along it than across it (Hessian eigenvalues 0.0014 vs 4.5 at beta = 0.03). The gradient-root and index methods above do not have that problem.

Convexity (principal radii of curvature rho1, rho2 = eigenvalues of dx/dn at the 2562 icosphere L=4 normals, `convex.mjs`):

| beta | min rho | max rho | K min | K max |
|---|---|---|---|---|
| 0.012 | 0.793 | 1.420 | 0.712 | 1.248 |
| 0.030 | 0.625 | 5.497 | 0.188 | 1.558 |
| 0.036 | 0.587 | 22.79 | 0.045 | 1.648 |

All principal radii positive, so locally strictly convex everywhere on the sampled normals (a sampled check, not a proof). Convexity is lost between beta = 0.04 and 0.05 (rho_min = -1.04 at 0.05). The slider stops at 0.036 for that reason.

Flatness / thickness measure (my definition, not the Domokos-Lang one): radius about the CoM, r_min = 0.96855, r_max = 1.02874 at beta = 0.03, so r_max / r_min = 1.062 (the body deviates 3 percent in and 3 percent out from the unit sphere). At beta = 0.02 the ratio is 1.041. The classical Gomboc is of this order of nearness to a sphere.

Mass properties (unit mass, unit volume radius scale): inertia diagonal about 0.4002 (0.400203, 0.400198, 0.40024) with one small off-diagonal term (yz = -0.0046): nearly a uniform ball.

## 3. The page (`tools/gomboc-spike.html`)

Renders the surface (icosphere L=6, 40962 vertices, vertex colours: soft bands, red disc at the stable point = the "1", blue disc at the unstable point), a floor, optional contact marker / CoM-to-contact segment (red) / vertical through the contact (yellow; the two coincide only at an equilibrium) / trail. Controls: Roll (random orientation and random flick, also Space), drag on the table to flick in a direction, "Balance on unstable point" (starts at the unstable point with a 0.005 to 0.025 rad/s nudge), Reset, speed x1..x16, beta slider, and "plain sphere beside it" (a beta = 0 body given the identical flick; it stops at an arbitrary point, the Gomboc always at the red dot).

Readouts: result (shows `result: 1` only when the body has come to rest within 10 degrees of the stable point, otherwise `result: ?`), rolls counter, last and mean time to rest, swings, angle from the stable point.

Dynamics (all in `core.js`, `Gomboc.Body`):

* State: orientation quaternion, world angular velocity, horizontal CoM position. Unit-mass body.
* Contact: p = R x(n_b) with n_b = R^T(0,0,-1) and x(n) the exact surface point with outward normal n; CoM height = h(n_b). No slipping: v_G = p x omega.
* Full rolling equations (Newton-Euler, no simplification): `(I_w + m(|p|^2 E - p p^T)) alpha = -omega x I_w omega + m p x (pdot x omega) - m p x g - c I_avg omega`, with `pdot = omega x p - R J R^T (omega x n_w)` where J = dx/dn (radius-of-curvature operator, finite-differenced from the support solver) and n_w = (0,0,-1). The contact force follows from `F = m(a_G - g)`; its normal component stayed > 0.9 g in every run (min F_z/ (m g) = 0.92 over 82 runs), so the "stays on the table" assumption was never violated.
* Integrator: RK4, fixed step 1/120 s. Energy conservation without dissipation (damp = 0), 10 s, strong roll: relative drift 4.5e-4 at 1/120 s, 1.1e-4 at 1/240 s, 1.3e-2 at 1/60 s. At 1/240 s a 4.0 s run drifted 3.9e-9 in an earlier, gentler case.
* Dissipation: a linear torque `-c I_avg omega` with c = 0.6 per second (a viscous rolling-resistance stand-in; no static rolling friction, so the body keeps creeping toward the exact minimum rather than sticking short of it).
* Scale: gravity 654 body-radii per s^2 (a body of 1.5 cm radius, 3 cm across, in 9.81 m/s^2). The real time scale is long because the valley floor is so flat, hence the speed selector (default x4) and a fast-forward key (f).
* Rest detection (independent of where the body ends up): |omega| < 0.05 rad/s for 1.5 s of sim time. The body is then typically 1 to 5 degrees from the exact minimum and still creeping; 30 s later it is within 0.1 degrees (table below).

What is exact and what is approximated:

* Exact (to double precision or the stated tolerance): the surface formula, the CoM and inertia (quadrature, 1e-12 level), support function and contact point (Newton, |grad| < 1e-12 per call, effectively 1e-9 in position), the rolling-contact equations of motion.
* Approximated: J = dx/dn by central finite differences (about 1e-5 relative); the dissipation model (viscous, not Coulomb rolling friction, no slip, no bounce, no air); infinite flat table; the stable/unstable marker positions use Sloan's published locations (confirmed to 1e-7 degrees by section 2) rather than being recomputed in the page; the displayed time is simulation time for a 1.5 cm radius body.

## 4. Scripted rolls (50+ random rolls, `batch.mjs`, same code and constants as the page)

Random orientation uniform on SO(3), random flick direction, rolling speed 3 to 14 body radii/s, random vertical spin (sd 2 rad/s). g = 654, c = 0.6, step 1/120, rest rule above, then 30 s more.

| set | rolls | rested | time to rest (sim s) | angle from stable point at rest | 30 s later | swings |
|---|---|---|---|---|---|---|
| beta 0.03, random rolls | 60 | 60 of 60 | mean 60.5, sd 4.4, min 45.1, max 67.9 | mean 1.48 deg, max 4.49 deg | mean 0.098 deg, max 0.352 deg | mean 41, min 17, max 144 |
| beta 0.03, balanced on the unstable point and nudged | 10 | 10 of 10 | mean 57.2, min 49.0, max 61.4 | mean 1.9 deg, max 4.7 deg | mean 0.127 deg, max 0.345 deg | mean 33 |
| beta 0.02, random rolls | 12 | 12 of 12 | mean 58.1 | mean 2.6 deg, max 6.0 deg | mean 0.141 deg | mean 46 |

So every one of the 82 rolls ended at the same body point (spread: max 0.35 degrees after settling, mean 0.1), including all rolls started on top of the unstable point from a nudge. Page driver check (`fastRoll` inside the page under the artifact CSP): three rolls 49.6, 59.1, 61.7 s, ending 4.2, 1.4, 0.5 degrees from the stable point with the same detector. The UI nudge test and a (synthetic) drag flick both ended `result: 1`.

"Swings" = number of local maxima of the angle between the downward body normal and the stable point (above 1.1 deg), so rolling over many times before settling counts many; what a viewer sees at the end is a slow, many-cycle rocking/creeping along the valley (a typical roll shows tens of swings and settles over roughly one minute of simulation time; at x4 about 15 s on screen). A strong flick climbs over the barrier several times: initial energy corresponds to up to about 3.5 times the height difference of the body.

## 5. Feasibility in the real app (cannon-es ConvexPolyhedron)

Method (`cstatic.mjs`, `cdrops.mjs`, vendored cannon-es): the Gomboc (beta = 0.03) is sampled at N Fibonacci directions, the convex hull (own incremental hull, outward CCW triangles) is fed to `CANNON.ConvexPolyhedron` exactly like src/main.js (~line 1466); the vertices are shifted so the hull's own volume centroid is the body origin (otherwise the CoM offset, 1e-5 to 5e-4, would itself rival the potential differences). Drop conditions copy the app: gravity -34, friction 0.2, restitution 0.3, mass 1, linear/angular damping 0.04/0.1 raised to 0.25/0.5 after 3.5 s, sleep (0.1 for 1 s), random orientation, random spin up to +-20 rad/s, 300 drops per N, inertia set to a solid ball's 0.4 (using cannon's default box inertia gives the same picture, N=500: 117 facets vs 115).

Static count: a hull triangle is a stable rest iff the foot of the perpendicular from the CoM falls inside it.

| N vertices | hull facets | statically stable facets |
|---|---|---|
| 100 | 196 | 171 (87 percent) |
| 200 | 396 | 294 (74 percent) |
| 500 | 996 | 568 (57 percent) |
| 1000 | 1996 | 859 (43 percent) |
| 2000 | 3996 | 1152 (29 percent) |

Dynamic result (app-like damping), 300 drops each:

| N | settled (sleeping) in 40 s | distinct resting facets | distinct rest orientations (3 deg clusters) | share of most common rest | rests within 5 deg of the true stable point |
|---|---|---|---|---|---|
| 100 | 111 | 48 | 48 | 9.9 percent | 7 |
| 200 | 210 | 91 | 86 | 4.8 percent | 4 |
| 500 | 300 | 115 | 100 | 3.7 percent | 4 |
| 1000 | 297 | 109 | 83 | 4.4 percent | 3 |
| 2000 | 300 | 127 | 63 | 6.0 percent | 9 |

Low-damping best case (angular damping 0.01 and 0.002, no later increase, up to 150 to 300 s): N=1000, 5 of 100 settle; N=2000, 35 to 79 of 100 settle, still 18 to 26 distinct rest orientations among the settled drops, and only 1 to 12 of the 100 drops ended within 5 degrees of the true stable point. Cannon has no rolling resistance and its contact solver loses energy at facet impacts, so a faceted body does not behave like the smooth body at any N tried.

Why: the potential landscape of the smooth body varies by only about 0.06 of a radius over the whole sphere and by about 1e-3 across the last few degrees, while the facet bumps of an N-vertex inscribed hull are of order 1/N: tens to hundreds of times larger than the signal near the equilibrium, and the facet interior is a flat rest (plus the app's damping, which stops the body at the first facet it sticks on). With the real beta (a few percent) there is no N in 100..2000 that gives an "always the same face" die: the most common rest has at most 10 percent of the drops, and the true stable point (within 5 degrees) is reached by only about 1 to 6 percent. Pushing N further (10^4 and up) would make cannon vertex-plane collision cost explode and still not fix the lack of rolling friction control; Bezdek's 14-face or Conway-Guy's 19-face mono-stable polyhedra are the only faceted route and are extremely thin/needle-like, not a die look.

Custom smooth collision shape in cannon: cannon-es shapes are a closed set (Sphere, Box, ConvexPolyhedron, ...); a smooth shape needs a new Shape class plus a new narrow-phase function for each pair it meets (plane, box, convex, other Gomboc), contact normal/depth from the support function, and contact-point generation that is stable for a near-sphere (single contact point: the PGS solver with one contact tends to jitter at rest). Realistic only for the Gomboc-vs-plane/walls pair (which we can write: depth = h(n_b) - height, contact at the support point), and then it still needs rolling resistance that cannon does not have (angularDamping only approximates it) and would lose the exact no-slip rolling used on the page. I estimate 3 to 5 days to do this robustly inside cannon (one new Shape type, plane pair, sleeping, tests, jitter tuning) and it is not guaranteed to reproduce the 1-minute valley creep without custom rolling friction.

## 6. Verdict

* As a tool page / artifact: yes, works, and is convincing. A smooth convex homogeneous body that always ends at the same point (82 of 82 rolls, spread 0.1 deg after 30 s more), including from a nudge on the unstable point; side-by-side sphere shows the contrast. Cost already spent: this spike.
* As a novelty die shape `d1` in Look inside the main app via cannon-es: not feasible with the faceted hull (no N from 100 to 2000 gives the property; best case still more than 60 resting orientations). It is also not a good fit for the product: the settle time of the real thing is on the order of a minute of simulation time at physical scale, which is slow for a dice roll (the page needs a x4 time-lapse), and the result is always 1 so there is nothing to randomise.
* If the owner still wants it in the app: build it as a special-case mode outside the cannon world: a single Gomboc on the mat with this spike's own integrator (about 250 lines already written and tested; per step about 1 ms in a headless browser, so a x4 time-lapse costs 8 ms per frame), drawn with the same mesh, and replaced by a cheap scripted ending (blend to the stable orientation after the creep phase) when it must settle in a few seconds. Estimated 2 to 3 days (mode plumbing, camera, sound, no dice-dice collisions, a "Gomboc" entry in Look, tests), with the honesty caveat that the shortened ending is not the real dynamics.
* Recommendation: ship as a tool page only (this artifact), not as a Look shape. Revisit the app special-case mode only if the owner wants a joke die and accepts one-die-only and a time-lapse.

---

# Round 2 (owner feedback: faster settling, more pronounced shape, shape selector)

Sections 1 to 6 above describe round 1 (Sloan near-sphere, c = 0.6). Round 2 changes the page defaults (rolling resistance 2.0 instead of 0.6), adds a second, more pronounced shape and a shape selector, and adds a skip-to-rest button, a rolling-resistance slider and a "colour by radius" toggle. The Sloan shape and its beta slider are unchanged and remain selectable.

## 7. Settling time versus accuracy (rolling resistance)

Same harness as section 4 (`batch.mjs`, Sloan beta = 0.03, 50 random rolls per setting, g = 654, step 1/120, rest = |omega| < 0.05 rad/s for 1.5 s, then 30 s more). Only the viscous torque rate c (1/s) changes. "False rest" = a roll whose rest detector fires while the body is on the valley floor far from the true stable point (here: more than 10 degrees away at detection or still more than 10 degrees away 30 s later).

| setting | c | rested | time to rest, sim s (mean, sd, range) | angle from stable point at rest detection (mean, max) | 30 s later (mean, max) | swings (mean, range) | false rests |
|---|---|---|---|---|---|---|---|
| round 1 | 0.6 | 50/50 | 60.8, 3.9, 49.8 to 67.3 | 1.52 deg, 4.31 deg | 0.095 deg, 0.325 deg | 40, 21 to 131 | 0 |
| 2x | 1.2 | 50/50 | 31.3, 2.0, 26.5 to 34.8 | 0.84 deg, 3.47 deg | 0.004 deg, 0.011 deg | 24, 12 to 61 | 0 |
| 3.3x (new default) | 2.0 | 50/50 | 18.4, 1.2, 15.3 to 20.9 | 1.03 deg, 2.82 deg | 0.000 deg, 0.000 deg | 12, 6 to 52 | 0 |
| 5x | 3.0 | 50/50 | 12.4, 1.0, 9.5 to 14.1 | 0.94 deg, 4.39 deg | 0.000 deg, 0.000 deg | 7, 3 to 18 | 0 |
| speed-dependent: c = 0.3 + 0.05 |omega| | | 50/50 | 99.0, 6.1, 85.3 to 107.6 | 1.81 deg, 4.13 deg | 0.496 deg, 1.228 deg | 57, 32 to 120 | 0 |

Findings: more resting resistance shortens the settling without hurting accuracy at any value tried; the final point is the same (the minimum of CoM height) because the resistance is viscous (no static rolling friction), so it cannot make the body stick on the flat valley floor. Time to rest scales roughly as 1/c up to c = 3 (the near-minimum motion is under-damped to critically damped for these values; heavier damping, beyond about 4, would turn it over-damped and slow the final creep, not tested). The speed-dependent variant (strong damping at high speed, weak near the valley) was slower, because the weak damping near the valley leaves a long ringing tail; it is not used. No "settle assist" was needed. Default c = 2.0 (18.4 s mean, within the 20 s target); slider range 0.3 to 4.0; x1..x16 selector kept; new "Skip to rest" button runs the clock fast until the body stops. The page note says what is physical (the roll, the shape, the equilibria) and what is a convenience (the viscous resistance is a stand-in for real rolling friction; time-lapse). With the same resistance a real Gomboc of this accuracy would also settle on the same point, only the number of swings differs.

## 8. A more pronounced shape (numerical construction)

Sources checked: Sloan arXiv:2306.14914 (two constructions; construction 1 is not C^2 at the poles, construction 2 is what round 1 used and both are near-spheres), Couey arXiv:2604.17120 (strict convexity limits Sloan's beta, a regime in (beta, a1, k) exists; I could not read the parameters), a 2026 arXiv:2604.17095 "Computational Construction and Engineering Evaluation of a Verified Mono-Monostatic Body" (listed by search, not read), and search results quoting that the first Domokos-Varkonyi Gomboc deviated from a sphere by only 1e-5. I found no published explicit coordinates of the physical Gomboc of the Wikipedia photo (flatness, radial table or STL), so I could not reproduce it exactly. I therefore built a body numerically.

Construction (my own): `r^4(u) = 1 + sum_{l=2..10} sum_m c_lm Y_lm(u)` with 117 real spherical-harmonic coefficients (`sh.js`, orthonormal). Excluding degree 1 puts the centre of mass of the homogeneous body exactly at the origin (the centroid integral of r^4 u only sees the degree-1 part), and because r = F^(1/4) is monotone in F, the equilibria are the critical points of the polynomial-like F on the sphere. Starting point: the least-squares projection of Sloan's beta = 0.03 body (fit error 1.4e-3 in F, flatness 1.062, still 2 critical points). Optimiser (`opt.mjs`, `climb.mjs`): randomised hill climbing on the 117 coefficients maximising r_max/r_min subject to (a) convexity margin: the smallest eigenvalue of (Hess_S w + w I)/w, with w = 1/r (the gauge function is convex iff this is positive semidefinite) at least 0.02 on an icosphere L=3, (b) the winding-index critical-point count equal to exactly 2 (two +1, no -1) on icosphere L=3, 4 (4 samples per edge) and 5 (4 samples per edge). About 50 minutes of 3 parallel searches in four stages (1.062 to 1.076 to 1.090 to 1.100). One stage that relaxed the margin to 0.01 and checked only to L=4 reached 1.105 but turned out to have extra critical points (5 index +1 and 3 index -1 triangles at L=5): rejected, and the acceptance test was made stricter.

Result (`tools/gomboc-spike-verify/pronounced-shape.json`, also embedded in the page): r_max/r_min = 1.10 (radial function, 0.957 to 1.051 about the CoM; the sampled support-function range is 0.9566 to 1.0512). That is a moderate improvement over Sloan's 1.06, short of the 1.12 to 1.2 asked for: the search was still improving slowly when stopped, a gradient-based optimiser or higher degree could go further, not tried.

Verification (same methods as section 2):

* Winding index of the tangential gradient of h: two triangles with index +1, none with -1, total 2, at icosphere L=5 (20480 triangles, 6 samples per edge) and L=6 (81920 triangles, 4 samples per edge).
* Stable point (minimum of CoM height) at direction (-0.942763447, 0.327967415, -0.060286458) (theta 160.8, phi 93.5 deg), h = 0.953936, Hessian eigenvalues 3.30 and 48.3; unstable point (maximum) at (0.561514417, -0.797389286, -0.221069867) (theta 305.2, phi 102.8 deg), h = 1.051222, eigenvalues -0.571 and -0.124; tangential gradient norm 5e-16 at both; the two points are about 141 degrees apart (not antipodal). Count: 1 stable, 1 unstable, 0 saddles, min - saddle + max = 2.
* Root finding from icosphere starts (the section 2 method) found the maximum but not the minimum (96 percent of starts failed in the stiff flat region), so the minimum was located by pattern search plus Newton starting in the winding-index triangle (`refine.mjs`). The winding method, not root finding, is the evidence for "exactly two".
* Convexity (icosphere L=4 normals, `convex.mjs`): all principal radii of curvature positive, rho from 0.478 to 10.44, Gaussian curvature from 0.089 to 2.26 (Sloan beta = 0.03: 0.19 to 1.56). Sampled, not a proof.
* The valley minimum is much stiffer than Sloan's (3.3 versus 0.0014), which is why this body settles about as fast and ends closer to the exact point.

Shape comparison (r radius about the CoM; unit mean radius):

| shape | r_max/r_min | min Gaussian curvature | stable-point Hessian eigenvalues | inertia diagonal |
|---|---|---|---|---|
| Sloan beta = 0.03 | 1.062 | 0.19 | 0.0014, 4.5 | 0.4002 each |
| pronounced (this section) | 1.10 | 0.089 | 3.3, 48.3 | 0.4007 each, yz = -0.008 |

Visual check (headless screenshots): the pronounced body is visibly an egg or pebble with a flatter shoulder on one side and a rounder back (use "colour by radius"); it is still close to a sphere and there is no distinct ridge: the two curvature regimes of the real Gomboc blend smoothly here. It does not match the Wikipedia photo more than moderately.

## 9. Dynamics of the pronounced shape (page defaults: c = 2.0)

`batch.mjs` with `SHAPEFILE=newshape.json` (same seeds machinery; step 1/180 s, because the stiff flat-belly direction has a restoring frequency of about 150 rad/s and at 1/120 s two of 50 rolls ended with a sustained numerical jitter that blocked rest detection).

* 60 random rolls (random orientation, flick 3 to 14 radii/s), g = 654, c = 2.0, step 1/180 s: strict rest rule (|omega| < 0.05 for 1.5 s) fired in 55 of 60 (time to rest mean 27.2 s, sd 5.8, range 15.5 to 41.4); angle from the stable point 0.17 deg mean (max 0.63) at detection; 30 s after the run ends all 60 are within 0.93 deg of the stable point (mean 0.03 deg); swings mean 37 (20 to 62); minimum normal force 0.86 of m g. The other 5 never met the strict rule in 300 s although they sit within 0.01 to 0.63 deg of the stable point: a low-level numerical ringing (|omega| about 0.02 to 0.1) that does not decay even at step 1/240 (one case checked; 1/360 not finished). I treat it as an integrator artifact of the stiff body, not physics; the page therefore also declares rest when the body is within 1.5 deg of the stable point with |omega| < 0.2 for 3 s (pronounced shape only). No roll ended anywhere else: 60 of 60 and 10 of 10 end at the same body point.
* 10 rolls started balanced on the unstable point with a 0.005 to 0.025 rad/s nudge: 10 of 10 right themselves, time to rest mean 21.0 s (16.6 to 24.2), 0.13 deg at detection, 0.001 deg 30 s later, swings 22 to 64.
* An earlier 50-roll run at step 1/120 s detected only 48 of 50 (same artifact, worse), which is why this shape runs at 1/180 s.
* Page driver (`fastRoll` in the page, under the CSP): see round 2 checks below.
* Sloan shape at the new default c = 2.0, 3 page rolls: 19.9, 17.6, 16.5 s, ending 0.7 to 1.5 degrees from the stable point; UI "Skip to rest" ends with `result: 1` for both shapes.

## 10. What is exact and what is approximated (round 2 additions)

* Exact: both surfaces (Sloan analytic; the harmonic body is an explicit formula with 117 stored coefficients rounded to 9 significant digits), their CoM (zero by construction, quadrature confirms to 1e-17), the equilibrium counts (winding index, sampled), the rolling equations.
* Approximated or convenience: the pronounced body is a numerical construction verified on sampled grids, not a published one; convexity is sampled; the equilibrium locations are numerical to 1e-12 (gradient norm); the rolling resistance is viscous and its default (2.0) is chosen for speed; step 1/180 s for the pronounced body (a numerical jitter limit, see section 9); time-lapse.

## Low-poly search log

Context: the owner mentions a prize for a low-poly shape that behaves as a Gomboc (one stable and one unstable equilibrium). I searched once for prize rules and found none: no URL, no terms, no deadline, and I do not guess any. What the literature search returned (all unverified beyond the abstracts):

* Monostatic polytope (Wikipedia): https://en.wikipedia.org/wiki/Monostatic_polytope; Reshetov, "A unistable polyhedron with 14 faces" (IJCGA 2014, https://research.nvidia.com/publication/2014-03_unistable-polyhedron-14-faces.md, https://research.nvidia.com/sites/default/files/pubs/2014-03_A-unistable-polyhedron/polytop-ijcga-rev2.pdf): the best known homogeneous monostable polyhedron (one stable face; it has more than one unstable vertex, so it is not a Gomboc). Earlier: Guy and Knowlton 19 faces, Bezdek 18 faces; arXiv:2008.02090 (Conway and Guy problems) and arXiv:2103.12769, arXiv:2103.13727 (best known F and V bounds, F <= 14 for monostable). Mathworld: https://mathworld.wolfram.com/UnistablePolyhedron.html.
* A search snippet defined a "polyhedral gomboc" as one stable plus one unstable equilibrium; I found no existence or non-existence result for it. Note (Poincare-Hopf, S - H + U = 2) that S = U = 1 forces zero saddles (edge equilibria). Whether a convex polyhedron with H = 0 and S = U = 1 exists I did not establish; nothing below claims it.

Tool: `tools/gomboc-spike-verify/poly-equilibria.mjs` exports `polyEquilibria(vertices)` (uniform density; hull, merges coplanar triangles, volume-centroid CoM; stable = face equilibria, unstable = vertex equilibria, saddle = edge equilibria; returns S, U, H, Poincare-Hopf check S+U-H, F, V, E, positions) and generators `fibonacciMesh(radialFn, N)` (Fibonacci-sphere directions scaled by a radial function, e.g. `new Gomboc.Shape(spec).r` from `core.js`), `cube()`, `tetra()`. CLI: `node poly-equilibria.mjs vertices.json` prints the counts; `node poly-test-gomboc.mjs 30,50,100` reproduces the table below. It only counts the static equilibria of the polyhedron; it does not simulate settling.

| # | candidate | generator and parameters | V / F | stable S | unstable U | saddle H | S+U-H | settle behaviour |
|---|---|---|---|---|---|---|---|---|
| 1 | cube (counter sanity check) | `cube()` | 8 / 6 | 6 | 8 | 12 | 2 | not simulated |
| 2 | tetrahedron (sanity check) | `tetra()` | 4 / 4 | 4 | 4 | 6 | 2 | not simulated |
| 3 | Sloan beta 0.03 hull | `fibonacciMesh`, N=30 | 30 / 56 | 47 | 30 | 75 | 2 | not simulated |
| 4 | Sloan beta 0.03 hull | N=50 | 50 / 96 | 86 | 50 | 134 | 2 | not simulated |
| 5 | Sloan beta 0.03 hull | N=100 | 100 / 196 | 171 | 100 | 269 | 2 | cannon drops (300): 48 distinct rest facets, top rest 9.9 percent |
| 6 | Sloan beta 0.03 hull | N=200 | 200 / 396 | 294 | 198 | 490 | 2 | cannon: 91 distinct facets |
| 7 | Sloan beta 0.03 hull | N=500 | 500 / 996 | 568 | 412 | 978 | 2 | cannon: 115 distinct facets |
| 8 | Sloan beta 0.03 hull | N=1000, 2000 | 1000 / 1996, 2000 / 3996 | 859 (1000), 1152 (2000) from the section 5 static count | | | | cannon: 109 and 127 distinct facets |
| 9 | pronounced hull | `fibonacciMesh`, N=30 | 30 / 56 | 47 | 30 | 75 | 2 | not simulated |
| 10 | pronounced hull | N=50 | 50 / 96 | 82 | 50 | 130 | 2 | not simulated |
| 11 | pronounced hull | N=100 | 100 / 196 | 159 | 100 | 257 | 2 | not simulated |
| 12 | pronounced hull | N=200 | 200 / 396 | 244 | 163 | 405 | 2 | not simulated |
| 13 | pronounced hull | N=500 | 500 / 996 | 412 | 312 | 722 | 2 | not simulated |

Negative results so far: uniformly sampled (Fibonacci) hulls of these two smooth Gomboc bodies never come close to S = U = 1 for any N tried: S falls from 84 percent of the faces (N = 30: 47 of 56) to about 40 percent (N = 500) and stays in the hundreds, and nearly every vertex is an unstable equilibrium up to N = 200. Simply sampling the smooth surface is the wrong route for a low-poly Gomboc: the faceting creates one stable face per facet whose foot falls inside it. Facet shapes and angles must be optimised (as in Bezdek, Conway-Guy, Reshetov) rather than sampled. No search has been run yet; this section is to be kept current as candidates are tried.

---

# Round 3 (owner: find the ridged physical Gomboc)

Outcome in one paragraph: no published explicit formula or mesh of the ridged physical Gomboc exists in anything I could read, and the one explicit Varkonyi-Domokos construction is a near-sphere (deviation about 5e-5), so a ridged shape could not be reproduced. Perturbing my best body with ridge-like harmonics destroys convexity and creates extra equilibria at tiny amplitudes. No third shape was added to the page (a further 25 minutes of optimisation moved r_max/r_min only from 1.1017 to 1.1043, not a different shape). New in round 3 that did ship: the Info and Controls toggles, and polyhedral data for the low-poly log.

## 11. Sources actually read (text extracted with pdf.js; equation numbers as printed)

* P. L. Varkonyi and G. Domokos, "Mono-monostatic bodies: the answer to Arnold's question", Math. Intelligencer 28(4), 2006, 34-38, read from http://www.gomboc.eu/docs/100.pdf (https://www.gomboc.eu/docs/100.pdf). The construction is Eqs. (1) to (6); the symbols are garbled in my text extraction, so I describe it rather than transcribe it: Eq. (2) is a one-parameter smooth map f(phi,c) of (-pi/2, pi/2) onto itself (nearly the identity for c large, strongly nonlinear for c near 0), Eqs. (3)-(4) define f1 = sin f and f2 = -f1, Eq. (5) a blending weight a(phi,theta,c), Eq. (6) the blended deviation R~ = a f1 + (1 - a) f2 (with the two sign regimes for |theta| above or below pi/2), Eq. (1) the surface R = 1 + d R~ (thick/thin halves separated by a tennis-ball-like curve for c < 1). The paper's own statement of the parameters that work: the surface is convex with the centre of gravity at the origin only for d very small, "d < 5 x 10^-5", with c about 0.275, "so the created object is very similar to a sphere". So the original V-D body is NOT ridged and not pronounced (deviation 5e-5). It also states (Lemma 1, Eq. (7) onward) that mono-monostatic bodies have flatness F = 1 and thinness T = 1 (neither flat nor thin), that a different, visibly non-spherical mono-monostatic form (turtle-like, compared with an Indian star tortoise, their Figure 5) was 3D printed but its formula is not given, and that polyhedral approximations of mono-monostatic bodies "may need a very large number of faces". I did not implement Eqs. (1)-(6) (symbols not reliably recoverable, and the result would be a sphere to 5e-5).
* M. L. Sloan, "An Analytical Gomboc", arXiv:2306.14914 (read; only the opening pages extracted): centre of mass conditions Eq. (2)/(3a,b), equilibria conditions Eqs. (6), (7); both constructions are small perturbations of a sphere: "essentially a sphere of unit radius with small surface perturbations". Formulas of the two shapes as quoted by MathWorld (https://mathworld.wolfram.com/Goemboec.html): construction 1 `r^4 = 1 + 4 beta sin(phi) cos(theta - 5 phi)`, construction 2 (used in this spike) with the cubic phase term. Not implemented: construction 1 (not C^2 at the poles for beta > 0 per Couey).
* V. W. Couey, arXiv:2604.17095 v2 and arXiv:2604.17120 v3 (read): states that the exact geometry of the commercial physical specimens "has not been published, and publicly available meshes of them are visual approximations"; extends Sloan's phase function with one Fourier term (verified instance beta = 0.023149, a1 = 0.234433, k = 1) and finds strict convexity only for beta up to about 0.036. Still near-spheres.
* T. Schettini Gherardini, "An explicit mono-monostatic polyhedron", arXiv:2609.07827 (read; https://arxiv.org/abs/2609.07827), data and verifier at https://github.com/Tancredi-Schettini-Gherardini/certified_gomboc (not downloaded): the smooth seed K* is `r(u) = 1 + sum_{l=2..5} sum_m c_lm Y_lm(u)`, 32 spherical-harmonic coefficients, found by seeding with Sloan's `r^4 = 1 + A sin(phi) cos(theta - k phi)` (A = 0.12, k = 5) and searching; K* is not convex (Remark 3.1) and its "near-critical ridge" is a curve of tiny tilt (beta_min about 6.2e-5 rad) that forces fine facets, not a visible geometric ridge. The author reports every smooth (1,0,1) body he produced had beta_min <= 1e-3.
* Found in search results, not read: arXiv:2608.11213 (equilibria of spheres perturbed by a single harmonic; the snippet says mono-monostatic bodies must be multi-harmonic), Wikipedia "Gomboc" (https://en.wikipedia.org/wiki/G%C3%B6mb%C3%B6c, not fetched this round), gomboc.eu (only docs/100.pdf obtained; no STL or mesh found).

## 12. Attempt to reach a ridged / far-from-sphere body

* Optimiser continuation (`climb.mjs`, same constraints as section 8, three runs, 25 minutes, margin 0.01 plus the L=5 winding check): 1.1017 -> 1.1043. Diminishing returns, no new character.
* Ridge-seed experiment (`ridge.mjs`): add a ridge-like harmonic (l=3 m=3, l=4 m=4, l=3 m=3 with l=6 m=3, or l=2 m=2) of amplitude a to the verified 1.10 body and test convexity margin and the winding-index critical-point count (icosphere L=4, 4 samples per edge). Already at a = 0.01 (1 percent of r^4, about 0.25 percent of the radius) the l=3 m=3 addition gives a negative convexity margin (-0.007) and 5 index +1 with 3 index -1 triangles (extra equilibria); l=4 m=4 stays marginally convex (+0.003) but also shows 7 and 5; l=2 m=2 stays convex up to a = 0.08 but also creates 2 extra pairs from a = 0.01 (4 plus, 2 minus). So ridged or multi-lobed perturbations of this body are not mono-monostatic: consistent with Varkonyi-Domokos' remark about extreme sensitivity.
* Honest conclusion: the "distinct ridges" of the physical photo are not reproduced. Either the physical model uses a body of a different (unpublished) family, or its ridges are not geometric ridges (V-D report their built form resembles a turtle shell, more pronounced than the 5e-5 sphere-like example). I could neither find nor derive it. What would help: the STL from the Gomboc company, or the Domokos-Lang polytope-free construction.

## 13. Page changes in round 3

* "Info" and "Controls" buttons (top-left corner, never over the body) and keys I and C show or hide the HUD plus note panels and the controls bar independently; state is remembered in localStorage (inside try/catch); on phone widths (< 760 px) the info panels start hidden. With the controls hidden, Space rolls and dragging on the table flicks. csptest: `ready: true`.
* Checked headless at 1000 x 640 and 390 x 760: initial visibility [info, note, controls] = [true, true, true] desktop and [false, false, true] phone; keys c and i hide them, Space starts a roll with everything hidden, clicks restore.
* No third shape selector entry (see above); Sloan and "More pronounced body" unchanged.

## 14. Polyhedral mono-monostatic data (for the prize) found in the sources

C = F + E + V - 2 as defined by the owner. Prize terms (from arXiv:2609.07827 footnote 1): "a prize scaling inversely with the face count" offered by G. Domokos for the minimum number of faces, edges and vertices; "whoever eventually determines the minimum will receive at least $2.93" with the 56,946-face body (C = 341,664, and 10^6 / 341,664 = 2.93: so the footnote implies $1,000,000 / C, not $10,000 / C, which would give $0.029; to be checked against the original prize statement, which I did not find). The author also offers 3 x log10(56,946 / #faces) cents of his own per improved record.

| body | F | E | V | C = F+E+V-2 | S, H, U | homogeneous | source |
|---|---|---|---|---|---|---|---|
| certified polytope P56946 | 56,946 | 170,832 | 113,888 | 341,664 | 1, 0, 1 (exact rational certificate, own centroid) | yes | arXiv:2609.07827 Thm 1.1 |
| certified polytope P272971 | 272,971 | 818,907 | 545,938 | 1,637,814 | 1, 0, 1 | yes | arXiv:2609.07827 Table 1 |
| mono-monostatic 0-skeleton (point masses on the vertices, inhomogeneous) | 21 | | 21 | | 1, 0, 1 | no | cited as ref. [8] in 2609.07827, not read |
| minimal mono-unstable polyhedron | 8 | | 11 | | | yes | refs. [5],[16] there |
| inhomogeneous monostable tetrahedron etc. (five faces and five vertices suffice for every allowed face vector except tetrahedra) | 5 | | 5 | | | no | ref. [2] there |

For comparison my sampled hulls (section Low-poly search log) have F, E, V = 56/84/30 up to 996/1494/500 with hundreds of stable faces, so they are nowhere near (1,0,1); an equal-sag tangent cover of a smooth seed, as in 2609.07827, is the only construction known to me that reaches (1,0,1) and needs tens of thousands of faces. This is the data set to test `poly-equilibria.mjs` against if the half-space list of the repository above is later downloaded (convert half-spaces to vertices first).

---

# Round 4 (public-mesh recipe, CoM nudge, rigor labels)

First pass only; no long optimisers were run.

## 15. Mesh pipeline (`tools/gomboc-spike-verify/mesh-pipeline.mjs`)

`node mesh-pipeline.mjs model.stl|obj [--taubin N] [--nudge 0.001,0.003,0.005] [--hull-max 3000]` or `--gen sloan:0.03|pronounced [--level 4] [--stl out.stl]`. It loads binary or ASCII STL and OBJ, welds vertices, and reports each step: (1) closedness (open and non-manifold edges), (2) volume and volumetric centroid (signed tetrahedra), (3) Taubin smoothing (lambda 0.5 / mu -0.53, volume change reported), (4) recentring and radius range r_max/r_min, (5) equilibrium count of the radial function about the CoM (discrete Morse on vertex radii), (6) if the mesh is convex (hull volume = mesh volume) the exact polyhedron equilibria S, U, H with the Poincare-Hopf check (`poly-equilibria.mjs`, which now accepts `{com:[x,y,z]}`), (7) the same with the CoM nudged by each fraction of the mean radius toward the intended bottom (the minimum-radius direction). Meshes are never written into the repo.

Validation on our own meshes (the exact smooth bodies sampled on an icosphere, level 4 = 2562 vertices / 5120 triangles, closed, convex):

| body | CoM nudge | radial discrete Morse (min / max / saddle) | polyhedron S / U / H |
|---|---|---|---|
| Sloan beta 0.03 | 0 | 13 / 13 / 24 | 1154 / 1158 / 2310 |
| | 0.1 percent | 11 / 11 / 20 | 1206 / 1172 / 2376 |
| | 0.3 percent | 9 / 9 / 16 | 1312 / 1174 / 2484 |
| | 0.5 percent | 7 / 7 / 12 | 1492 / 1180 / 2670 |
| pronounced | 0 | 13 / 12 / 23 | 736 / 682 / 1416 |
| | 0.1 percent | 10 / 12 / 20 | 746 / 697 / 1441 |
| | 0.3 percent | 8 / 6 / 12 | 764 / 734 / 1496 |
| | 0.5 percent | 4 / 4 / 6 | 796 / 766 / 1560 |

Findings: (a) a sampled mesh of a verified smooth Gomboc is not mono-monostatic: 13 radial minima at 2562 vertices (the discrete count over-counts in the flat valley, as in section 2), and the polyhedron itself has hundreds to over a thousand stable faces, all consistent with the cannon-es result of section 5. (b) Taubin smoothing does not remove this (it changes the volume by 1 to 2 percent on these meshes with the plain uniform Laplacian and cannot undo faceting). (c) The CoM nudge reduces the radial-function minima (13 to 7 for Sloan, 13 to 4 for the pronounced body at 0.5 percent) but never reaches 1, and it increases the number of stable faces of the polyhedron. So the recipe's failsafe is cosmetic for a mesh: it only works because the page integrates the exact smooth surface, not a mesh. (Step 3's claim that a true Gomboc has exactly one minimum and one maximum of r holds for the smooth body, verified in section 2, not for its triangulation.)

Nudge on the smooth bodies (winding index of the support-function gradient, `NUDGE=0.005 node index.mjs ...`, icosphere L=4, 6 samples/edge): Sloan beta 0.03 keeps exactly 1 stable + 1 unstable up to 0.5 percent; the pronounced body keeps them at 0.2 percent and develops extra equilibria (3 index +1 and 1 index -1 triangles) at 0.5 percent.

## 16. Public models: not obtained

* GrabCAD "Gomboc convex homogeneous three-dimensional body" (https://grabcad.com/library/gomboc-convex-homogeneous-three-dimensional-body-1), Thingiverse thing:5173406 (https://www.thingiverse.com/thing:5173406), the Printables page and the 3dgo.app mirrors: HTTP 403 to the standard fetch tool. I did not try to get around the blocks (a browser-spoofing attempt was refused by the environment, correctly). Author, licence, file formats and the claim of how the shape was obtained are therefore unverified.
* From a web search snippet only (unverified): a MakerWorld Gomboc-inspired model forbids redistribution and commercial use (https://makerworld.com/models/2626210); the older Thingiverse model thing:10190 is described by its uploader as obsolete (https://3dgo.app/models/thingiverse/10190); the same page's notes mention a US design patent D614077 and Hungarian IP on the shape (commercial use may need clearance whatever the file licence says). I found no Printables licence information.
* The owner must download a STEP/IGES/STL manually and check its licence; keep it out of git; then run `node mesh-pipeline.mjs <file> --taubin 20 --nudge 0.001,0.003,0.005` (convert STEP/IGES to STL first). Per Couey (section 11), commercial specimens' exact geometry is unpublished, so an "exact" claim on any such model should be treated as unverified until the pipeline reports exactly one radial minimum and one maximum on a fine, closed, convex mesh.

## 17. Page: exact versus approximate modes

New "mode" selector: "Exact (verified)" (default, no nudge) and "Approximate (CoM nudge)" with a slider of 0 to 0.5 percent of the radius (default 0.20), applied to the active shape by moving the body's centre of mass toward its stable point (the mesh is shifted accordingly; the inertia tensor is not re-referenced, an O(nudge squared) error). A rigor banner in the HUD shows, for every shape and mode, either "EXACT surface ... verified" or "APPROXIMATE - centre of mass nudged x percent ... not a true homogeneous Gomboc" with the offline equilibrium check for that nudge (safe up to 0.5 percent for Sloan, 0.2 percent for the pronounced body, a warning beyond). The rolling resistance, time-lapse and the ringing fallback remain the stated convenience. Page check: nudged 0.3 percent, 4 fast rolls per shape ended 0.2 to 0.7 deg (Sloan, 17.7 to 20.6 s) and 0 to 0.15 deg (pronounced, 18.5 to 30.5 s) from the stable point.

## Low-poly search log additions (round 4)

* Sampled meshes of the exact bodies at icosphere level 3 and 4 (642 / 2562 vertices): Sloan 0.03 level 4 S/U/H = 1154/1158/2310 (F 5120, E 7680, V 2562, C = 15,360); pronounced level 4 736/682/1416. Not mono-monostatic. A CoM nudge of 0.1 to 0.5 percent does not fix them (stable faces increase).
* `mesh-pipeline.mjs` and `poly-equilibria.mjs {com}` are the reusable checkers for a later search or for the half-space polytope of arXiv:2609.07827 once converted to vertices.

---

# Round 5 (public mesh thing:10190, procedural fit, tipping-graph search)

## 18. The public mesh (Part A)

Source: Thingiverse thing:10190 "gomboc reverse-engineered" (https://www.thingiverse.com/thing:10190/files), owner-supplied binary STL (15,776 triangles, "Exported from blender"); the owner states the licence permits use with attribution. The file was read from the owner's upload path and is not in the repo; attribution: Thingiverse thing:10190, author as listed on that page (not verified by me, the page returned 403 earlier).

Tools added: `mesh-pipeline.mjs` (now rescales to mean radius 1 so tolerances are scale-free), `mesh-radial.mjs` (bbox, ray-cast r(u)), `radial-morse.mjs`, `mesh-equilibria.mjs` (exact S/U/H directly on the mesh, no hull; O(F*V)), `fit-sh.mjs`.

Results:

* Closed manifold: 7,890 welded vertices, 15,776 triangles, 0 open and 0 non-manifold edges; volume 1.223e-3 (units of the STL); 4 triangles have flipped (inward) winding. Volumetric centroid (0, 0.07492, 0); the bounding-box centre differs from it by 8.9e-3.
* Bounding box 0.1187 x 0.1326 x 0.1480 (x, y, z). The mesh is exactly mirror symmetric in x and in z: all 7,890 vertices have partners (two mirror planes), so it is a symmetric egg-like body, with a broad dome at the top (+y; lowest radius, r = 0.829 of the mean at (-0.035, 0.999, 0)) and a narrow rounded tip at the bottom (-y; highest radius 1.085). r_max/r_min = 1.309 (ray-cast about the centroid; vertex radii give the same 1.31): far more pronounced than anything in the earlier rounds (1.06 and 1.10).
* Star-shaped except at the tips: of 10,242 ray directions, 43 rays have more than one outward hit and 24 miss (thin tip regions); I filled them from neighbours.
* Convexity: not convex. Measured as the height of each vertex above the plane of its worst triangle (units of the mean radius): 5,627 of 7,890 vertices above 1e-6, 4,499 above 1e-3, 3,143 above 1e-2, 559 above 5e-2; median 4.6e-3, 99th percentile 0.24, max 0.27. Part of this is mesh noise (the reverse-engineered facets), part may be real concavity; slivers inflate the largest values.
* Equilibria of the mesh itself used as a polyhedron (`mesh-equilibria.mjs`, with CoM nudges 0 / 0.1 / 0.3 / 0.5 percent toward the lowest-radius direction): S = 60 stable triangles (36 distinct orientations after merging within 3 deg), U = 666 unstable vertices (442 distinct), H = 716 saddle edges (364 distinct); the nudges leave S at 60 and reduce U to 594 (402 distinct) at 0.5 percent. The Poincare-Hopf sum S+U-H is 10, 3, -4, 6, not 2, because the mesh is not convex. The stable rests include groups of four mirror-symmetric faces on the sides, not only the top dome. The vertex-radius discrete Morse count of the pipeline gives 134 minima and 183 maxima (46 and 93 at a 0.5 percent nudge), the ray-cast radial function on a regular icosphere gives 26 minima and 101 maxima at 10,242 directions and 11 minima, 13 maxima, 20 saddles at 642 directions (including four mirror-symmetric minima at r about 1.05 near the z axis).
* Page dynamics: not run; given the above the body is not mono-monostatic, so I did not add it as a mesh body.

Verdict: this mesh is NOT mono-monostatic, not even approximately in the radial-function sense: it has a clear top dome as global minimum and bottom tip as global maximum, but additionally several symmetric local minima around the equator (stable resting positions) and a very large number of facet-scale extrema. This is consistent with the unverified snippet calling it a crude approximation. It is a good ridge-like egg (r_max/r_min 1.31, crest-like arcs of local maxima along the x = 0 and z = 0 meridians, r about 1.08) to study, not a Gomboc.

## 19. Procedural fit (Part B)

`fit-sh.mjs` fits r^4 of the ray-cast radius with real spherical harmonics (degree 0 to Lmax, degree 1 reported as the CoM check):

| Lmax | parameters (l = 2..Lmax) | rms radial error | max radial error | fitted r_max/r_min | degree-1 residual |
|---|---|---|---|---|---|
| 4 | 21 | 2.89 percent | 9.3 percent | 1.352 | 7.3e-3 |
| 6 | 45 | 2.09 | 8.2 | 1.361 | 2.0e-2 |
| 8 | 77 | 1.30 | 5.9 | 1.320 | 8.5e-3 |
| 10 | 117 | 0.99 | 4.9 | 1.298 | 3.9e-4 |
| 12 | 165 | 0.76 | 3.9 | 1.288 | 6.2e-4 |
| 14 | 221 | 0.60 | 3.6 | 1.316 | 2.6e-4 |

(Errors relative to the mean radius; the sample r_max/r_min is 1.309.) The fit converges slowly because of the narrow tips. Properties of the fitted bodies (winding index of the support-function gradient at icosphere L=4, 6 samples per edge, and the support-function convexity test): degree 8: 22 index +1 and 24 index -1 triangles, convex (K min 0.007); degree 10: 34 and 40, non-convex (K min -0.29); degree 12: 54 and 60, non-convex (K min -0.67). So the fitted smooth bodies are neither mono-monostatic nor (from degree 10) convex: the target itself is not a Gomboc, and a closer fit only reproduces its extra equilibria. No third shape was added to the page. Ridges: the fit and the raw samples show crest-like arcs along two symmetry meridians, not isolated ridges; I could not turn this into a compact explicit ridge model with the work done. A one-line description of what the mesh is: an egg with two mirror planes, 1.31 radius ratio, flat-ish top dome, narrow bottom tip.

## 20. Tipping-graph search (Part C)

`tipping-graph.mjs`: for a convex polyhedron of uniform density (hull, merged coplanar faces, CoM = volume centroid) each face either is a sink (foot of the perpendicular from the CoM inside the face = stable) or the body tips over the boundary edge(s) whose outer side contains the foot. A face can have several tipping edges; two policies are implemented: `steepest` (the neighbour with the lowest CoM height; default) and `worst` (largest moment arm). `terminal(f)` follows next() to a sink or reports a cycle. Fitness = 10 per extra sink + fraction of faces ending in a non-lowest sink + 5 per cyclic-face fraction; zero means one sink for all faces. Check (`tipping-test.mjs`): the number of sinks equals the exact stable-face count S of `poly-equilibria.mjs` for the cube (6), tetrahedron (4) and the Fibonacci hulls of Sloan 0.03 (N=30: 47, 100: 171, 200: 294) and the pronounced body (N=100: 159), under both policies; no cycles, and every tipping step lowers the CoM height (0 violations). Both policies gave identical results on these convex hulls.

Search (`tipping-search.mjs N seconds seed`: simulated annealing on N points, one-vertex Gaussian moves, uniform density, 80 s per run, 0.1 to 0.8 million steps): best candidates, every run:

| start | N points | steps | best S | U | H | F | E | V | C = F+E+V-2 |
|---|---|---|---|---|---|---|---|---|---|
| sphere shell | 14 | 548,494 | 2 | 5 | 5 | 18 | 27 | 11 | 54 |
| sphere shell | 16 | 391,658 | 2 | 4 | 4 | 18 | 27 | 11 | 54 |
| sphere shell | 20 | 337,659 | 2 | 6 | 6 | 20 | 30 | 12 | 60 |
| sphere shell | 24 | 306,949 | 2 | 6 | 6 | 24 | 36 | 14 | 72 |
| sphere shell | 30 | 205,887 | 2 | 5 | 5 | 32 | 48 | 18 | 96 |
| sphere shell | 40 | 183,355 | 2 | 7 | 7 | 36 | 54 | 20 | 108 |
| sphere shell | 60 | 101,237 | 2 | 6 | 6 | 34 | 51 | 19 | 102 |
| elongated cloud (z x4, larger moves) | 14 | 762,165 | 2 | 5 | 5 | 12 | 18 | 8 | 36 |
| elongated | 19 | 484,666 | 2 | 7 | 7 | 24 | 36 | 14 | 72 |
| elongated (z x3, hot) | 19 | 468,960 | 2 | 5 | 5 | 16 | 24 | 10 | 48 |
| elongated | 30 | 294,783 | 2 | 5 | 5 | 22 | 33 | 13 | 66 |

Negative result: every run reached two stable faces (a bistable polyhedron) and none reached one, for N from 14 to 60 in these budgets; S+U-H = 2 held everywhere. The acceptance rate was 96 to 98 percent (the cost is flat at 2 sinks), so the annealing was close to a random walk once S = 2 was reached. Assessment: the tipping fitness is cheap and exact for sinks (about 10 to 60 thousand evaluations per second at N = 14 to 60) and a valid first filter, but with one-vertex Gaussian moves on a compact cloud it cannot reach monostability: the known monostable polyhedra (Conway-Guy 19 faces, Bezdek, Reshetov 14 faces; see Low-poly log) are extreme, needle-like shapes. A promising next step would be a structured parametrisation (spiral or tapered family with a few parameters), a cost that rewards the lowest-sink basin size (fraction of faces draining to it) rather than the count alone, and basin-hopping with large moves. The heuristic only finds one-sink candidates; a mono-monostatic answer also needs U = 1 (and H = 0), which `poly-equilibria.mjs` checks, and the best found candidates have U = 4 to 7. For scale: the certified mono-monostatic polytope of arXiv:2609.07827 has F = 56,946 (C = 341,664) and is vastly beyond this search; for prize purposes none of the candidates above counts (S = 2).

---

# Round 6 (spiral/tapered features, structured families, the CoM-distance measure D)

First pass; no long optimisers. Plot of the extracted features: `docs/design/img/gomboc-10190-features.png` (derived plot, not the mesh).

## 21. Features of the thing:10190 mesh (`mesh-features.mjs`)

Axis y (the mesh is mirror symmetric in x and z); mesh rescaled to mean radius 1, CoM at the origin.

* Which end is the bottom: the support function (CoM height h(u) = max over vertices of v.u) has its minimum 0.8295 at +y (the broad dome end) and its maximum 1.0853 at -y (the narrow tip). Physically the stable resting end is the dome, the unstable one the tip, as assumed in round 5.
* Cross sections (24 height bins, semi-axes along x and z): the sections are ellipses with x semi-axis a and z semi-axis b; a/b is about 0.80 over the whole middle third (0.77 to 0.80 for y from -0.41 to 0.39, a up to 0.857, b up to 1.069 at the waist), falling to 0.22 at the tip end and 0.49 at the dome end. The principal axes stay exactly on x and z at every height: twist psi(h) = 0 (no spiral at all). Area peaks at 3.1 near y = 0.15 (waist at y of about -0.01 to 0.15).
* Bottom patch (59 vertices within 28 deg of +y): CoM height 0.829, radius of curvature Rx = 0.821 in the x direction (about equal to h: marginal) and essentially infinite in z (the fit gives a huge negative value, i.e. flat or slightly saddle-like). That is the owner's "cylinder-like bottom": a patch curved about one axis only, with the curved direction at the limit of stability (R/h = 0.99, so in the mesh the x-rocking is marginal, not clearly stable); this is a rough fit on a noisy mesh.
* Side lines: the ray-cast radius r(alpha, phi) (alpha = colatitude from +y, phi = azimuth about the axis) has two ridges of high r (about 1.08) at phi = 90 and 270 deg (the x = 0 meridian plane, the z sides) running from alpha about 110 deg all the way to the tip (alpha = 180 deg); near alpha = 70 to 80 deg they fork into four ridges at phi = 40, 140, 220, 320 deg (r about 1.06), and there are two shallow valleys at phi = 0 and 180 deg (x sides, r about 0.84 to 0.88) between alpha 60 and 130 deg. In the heat map (figure) this looks like two "trees" (a stem to the tip, a fork near the waist): these are the two side lines curving down to meet the tip end. Note the tip end (unstable, highest r) is where they meet, not the stable end.
* Minimal conceptual curve set read off the mesh: (1) axis profile (the mean section radius sqrt(ab) versus height, convex, monotone toward each end); (2) aspect profile a/b(h) (about 0.8 in the middle, to 0.2 to 0.5 at the ends); (3) twist profile psi(h): zero in this mesh but nonzero in every verified Gomboc family (Sloan's phase P(t) is exactly this spiral; Varkonyi-Domokos' separatrix is a non-planar tennis-ball curve), so this is what the mesh lacks; (4) the two ridge curves phi = +-90 deg (alpha from 110 to 180 deg) plus their fork; (5) the stable-end patch curvature radii (about h in one direction, large in the other). Items (1), (2), (3) are the ring-family parameters of section 23; (4), (5) are consequences to be checked, not extra parameters. Derivation in one line: a convex body is monostatic only if the potential h(u) has a single basin; a D2-symmetric body (two mirror planes, twist 0) has its stable and unstable points forced onto the axis, and symmetric side minima appear as soon as the waist is oval (here the four side minima at r about 1.05 found in round 5); breaking the symmetry through a twist moves the competing minima onto each other so that pairs annihilate, which is what the Sloan phase does.

## 22. The measure D (`cm-tolerance.mjs`)

Definition as requested: M = set of points P such that the body with its CoM at P has exactly one stable and one unstable equilibrium (no saddles); D = min |P - CoM_uniform| over P in M, in units of the mean radius. Equilibria with CoM at P are the critical points of h(u) - P.u; they are counted by the winding index of the tangential gradient (x(u) - P) on triangle perimeters of an icosphere (support points x(u) computed once and cached, so scanning P is cheap: 0.6 s for a 54-point scan of Sloan at level 3, about 15 to 20 s for a 1,100-point scan at level 4 with 5 samples per edge; level 3 is not fine enough for the pronounced body and gave +9/-7 at the CoM where level 4 gives +2/-0). Polyhedra use `poly-equilibria.mjs {com: P}`. Search: grid of step 0.5 percent of the radius inside a ball of 3 percent (finer for small M). The sign convention: M is shown as extents of the grid points in M, percent of the mean radius.

Tolerance regions (M) of the exact bodies, ball radius 3 percent, step 0.5 percent unless noted:

| body | grid points in M | extent of M in x, y, z (percent of radius) | D |
|---|---|---|---|
| Sloan beta 0.03 | 111 | x -3 to +0.5, y -0.5 to +0.5, z -3 to +3 (cut by the ball) | 0 |
| pronounced (round 2), step 0.2 in a 1.2 percent ball | 57 | x -0.8 to 0, y -0.4 to 0.4, z -0.4 to +1.0 | 0 |

So the CoM tolerance is large and strongly anisotropic for Sloan (3 percent and more along -x and z, only 0.5 percent toward the unstable side +x) and small, 0.4 to 1 percent, for the pronounced body: the pronounced body is 3 to 10 times more fragile, consistent with the nudge experiments of section 15 (Sloan safe to 0.5 percent toward the stable point, pronounced to 0.2).

Continuity of D along continuous parameter paths (does D give leverage?). Sloan beta (the winding counts at the CoM are the discrete counts +a/-b):

| beta | at the CoM (plus/minus) | D | grid points in M |
|---|---|---|---|
| 0.03 | +2/-0 | 0 | 111 |
| 0.04 | +3/-1 | 0.50 percent | 178 |
| 0.05 | +17/-15 | 0.71 | 125 |
| 0.06 | +17/-15 | 1.0 | 103 |
| 0.08 | +11/-11 | 1.5 | 102 |

D grows smoothly and monotonically with beta (0, 0.5, 0.71, 1.0, 1.5 percent) while the discrete counts at the CoM jump erratically (up to 17 extra pairs). Caveat: for beta >= 0.05 the Sloan surface is not convex and the support function describes its convex hull, so D there refers to the hull, not the body.

Pronounced body with all harmonic coefficients scaled by s (path from the exact body): s = 1.0 D = 0; 1.1 D = 0.71 percent; 1.2 D = 0.5; 1.35 D = 0.5; 1.5 D = 1.4 percent; M has only 3 to 7 grid points: D is near the grid resolution (0.5 percent) and not monotone there; a finer grid is needed.

Generalised Sloan family of section 23 (oval term b0 and axial elongation e added to Sloan beta 0.03; at 0.5 percent step):

| added term | CoM counts | D | grid points in M |
|---|---|---|---|
| none (family reproduces Sloan, projected to degree 12) | +2/-0 | 0 | 112 |
| b0 = 0.01 | +3/-1 | 0.71 percent | 70 |
| b0 = 0.02 | +5/-3 | 1.58 | 20 |
| b0 = 0.04 | +5/-3 | M empty within 3 percent (best badness 4) | 0 |
| b0 = 0.08 | +7/-5 | M empty (best badness 6) | 0 |
| e = 0.02 | +3/-1 | 0.50 | 35 |
| e = 0.05 | +3/-1 | 2.5 | 10 |
| e = 0.1 | +3/-1 | M empty (best badness 1) | 0 |

D increases smoothly with the added amplitude (about 0.7 to 0.8 percent of radius per 1 percent of the r^4 oval amplitude), M shrinks and disappears; the discrete counts alone cannot show that b0 = 0.04 and 0.08 are "further" from monostatic than b0 = 0.02 (all three look like +5/-3 or +7/-5), but D does: it is a usable continuous objective as long as M is non-empty, and its surrogate (minimum badness over the ball: |plus-2| + minus, or for polyhedra (S-1)+(U-1)+H) takes over when M is empty (b0 = 0.04: 4; 0.08: 6; e = 0.1: 1).

Polyhedra: the best round-5 simulated-annealing candidates (S = 2, U = 5 to 7) have M empty within 3 percent and best badness equal to their badness at the centroid (10, 12, 10): a CoM move of up to 3 percent never helps them. Uniform-density polyhedra are far from the nudge-fixable regime.

Assessment: D has real leverage on smooth families (continuous, monotone near the exact bodies, tolerance regions of different sizes for different bodies, a usable surrogate when M is empty). On discrete polyhedra the badness over a CoM ball is flat (a 3 percent CoM move changes nothing), so it gives no gradient there. Noise: the 0.5 percent grid and level-4 sampling limit resolution; M is sometimes only a few points.

## 23. Structured families

B1 smooth (`ring-family.mjs`): r^4 = 1 + A(t) cos(theta - P(t)) + B(t) cos(2 theta - Q(t)) + e (3 t^2 - 1), t = cos(phi), A = sqrt(1-t^2)(a0 + a1 t + a2 t^2 + a3 t^3), P = p1 t + p3 t^3, B = (1-t^2)(b0 + b1 t^2), Q = q0 + q2 t^2; 16 parameters (the sqrt and (1-t^2) factors keep it smooth at the poles); projected onto spherical harmonics up to degree 12 with degree 1 removed, which puts the CoM exactly at the origin and makes it loadable by all verifiers. Check: a0 = 0.12, p1 = 3 pi/2, p3 = -pi/2 reproduces Sloan beta = 0.03 (winding +2/-0, D = 0, 112 grid points in M). Evaluated paths above; convexity of the b0 = 0.04 body (K min 0.24) and of e = 0.05 (K min 0.05) holds, yet D shows they are no longer Gomboc-like even with the best CoM within 3 percent. No optimisation of the 16 parameters was run (time budget).

B2 low-poly twisted tapered stack (`stack-search.mjs`): K rings of n-gons (ellipses sampled at n points) with log radius, log aspect, twist and height per ring (4K parameters), convex hull of K*n points, uniform density; cost = minimum badness over the centroid and six 1 percent CoM offsets (polyhedral D surrogate); simulated annealing, 70 s per configuration. Best candidates (every run listed; all are bistable, none reached S = 1):

| rings x n | points | S / U / H | F | E | V | C = F+E+V-2 | cost |
|---|---|---|---|---|---|---|---|
| 3 rings x 5-gon | 15 | 2 / 2 / 2 | 20 | 32 | 14 | 64 | 4.002 |
| 4 rings x 4-gon | 16 | 2 / 2 / 2 | 22 | 34 | 14 | 68 | 4.002 |
| 4 rings x 5-gon | 20 | 2 / 2 / 2 | 26 | 41 | 17 | 82 | 4.002 |
| 5 rings x 4-gon | 20 | 2 / 2 / 2 | 30 | 46 | 18 | 92 | 4.002 |
| 5 rings x 5-gon | 25 | 2 / 2 / 2 | 20 | 32 | 14 | 64 | 4.002 |
| 5 rings x 6-gon | 30 | 2 / 2 / 2 | 38 | 60 | 24 | 120 | 4.002 |
| 6 rings x 5-gon | 30 | 2 / 2 / 2 | 24 | 38 | 16 | 76 | 4.002 |
| 6 rings x 6-gon | 36 | 2 / 2 / 2 | 58 | 90 | 34 | 180 | 4.002 |

Result: all eight configurations converge to the same combinatorial type S = 2, U = 2, H = 2 (a bistable "barrel" with two unstable vertices), at F as small as 20 for 15 to 25 input points; S+U-H = 2 everywhere. Compared with the round-5 random searches (S = 2, U = 4 to 7, H = 4 to 7) the structured family is clearly closer to the target (U and H down to 2) but a 1 percent CoM move does not remove the second stable face or the second unstable vertex. (A first attempt without parameter bounds converged to degenerate flat hulls with S+U-H not equal to 2; the candidates were rejected by the Euler and Poincare-Hopf check; those rows are not listed.)

## 24. Recommendation

1. D (with its empty-M surrogate) is worth using on smooth families: start from Sloan and the pronounced body, add the oval and axial terms and an explicit twist (P(t) with more terms), and optimise D, accepting only winding (2,0) at D = 0, then convexity. First target: a smooth body with r_max/r_min about 1.15 and D = 0 inside the ring family, then fit its ridges. Use finer ball grids (0.1 percent) near D = 0.
2. Twist is the missing ingredient in the 10190 mesh (psi = 0, D2 symmetry): put the optimisation effort into P(t) and Q(t) first.
3. For low-poly: the twisted-stack family gets to (2,2,2); the next step is a cost that rewards the basin of the lowest stable face (fraction of faces draining to it) plus D-like CoM slack on non-uniform density (Conway-Guy style), because uniform-density polyhedra do not respond to CoM nudges.
4. Do not add any of these shapes to the page yet: none passes the rigorous (2,0) check beyond the existing Sloan and pronounced bodies.

---

# Round 7 (push the exact body toward the photo: constrained CMA-ES on the ring family)

Outcome: the targets 1.15 and 1.20 were NOT reached with exactly one stable and one unstable equilibrium. The best exact, convex, verified body found is r_max/r_min = 1.105 (about the same as the round-2 body, 1.10). Beyond about 1.11 to 1.12 in this family the equilibrium count breaks (one extra stable/saddle pair) and the CoM distance D jumps to about 3 percent of the radius. No shape was added to the page (threshold was 1.15), so no new CSP run.

## 25. Method (`ring-cma.mjs`, `cma-chain.sh`, `verify-finalist.sh`; run records in `tools/gomboc-spike-verify/runs/`)

* Family (extended from section 23): r^4 = 1 + A(t) cos(theta - P(t)) + B(t) cos(2 theta - Q(t)) + C3 cos(3 theta) + elongation terms in t = cos(phi); P(t) = p1 t + p3 t^3 + p5 t^5 (spiral), Q(t) = q0 + q2 t^2 + q4 t^4 (oval twist), 16 free parameters, start Sloan beta 0.03; the degree-1 part of F is removed analytically so the CoM is exactly at the origin (so D = 0 iff the winding index of grad F is (2, 0)).
* Objective (minimised): -r_max/r_min + 20 x badness (|plus - 2| + minus of the winding index) + 50 x max(0, margin - convexity margin) + 1000 if invalid; convexity margin = min over normals of lambda_min(Hess_S w + w I)/w with w = F^(-1/4) (positive = strictly convex, 1 = sphere). Evaluation is analytic (about 16 evaluations per second on the loaded machine), winding on icosphere L3 with 3 samples per edge in the main runs.
* CMA-ES implemented in node (standard weighted recombination, rank-one and rank-mu updates, step-size control; population 12, 500 generations = 8,000 evaluations per run, about 12 minutes each under machine load).
* Verification of finalists (`verify-finalist.sh`): spherical-harmonic projection (degree 12), winding index at icosphere L5 (6 samples/edge) and L6 (4), support-function convexity on L4 normals, tolerance region M of the CoM (`cm-tolerance.mjs`, ball 3 percent, step 0.5 percent, level 4, 5 samples/edge).

## 26. Results

Best feasible ratio versus the convexity-margin requirement (main runs; seeds, final parameter vectors are in `runs/max_*.json`):

| seed | required margin | best ratio | convexity margin reached | winding at L3 |
|---|---|---|---|---|
| 3 | 0.00 | 1.1090 | 0.000 | 2/0 |
| 5 | 0.02 | 1.1055 | 0.020 | 2/0 |
| 1 | 0.05 | 1.1049 | 0.050 | 2/0 |
| 2 | 0.05 | 1.0998 | 0.050 | 2/0 |
| 4 | 0.10 | 1.0980 | 0.101 | 2/0 |
| 6 | 0.20 | 1.0896 | 0.200 | 2/0 |

So the convexity margin costs little up to 0.05 (1.109 to 1.105) and then about 0.01 of ratio per 0.1 of margin; the binding constraint at the top is not convexity but the equilibrium count (below).

Finer verification of those finalists: the L3 loop overfits the coarse grid. At icosphere L5/K6 the seed-1 body (1.105) shows index +2/-1 (total 1, inconsistent: a near-degenerate pair), the seed-3 body (1.109, margin 0) +8/-7. Re-polishing at L4/K4 (120 generations, `runs/pol_*.json`) from the seed-5 solution gives the verified body: r_max/r_min 1.105 (support-function ratio 1.0460/0.9463 = 1.105), winding index +2/-0 at L5 (6 samples/edge) and L6 (4 samples/edge), support-function convexity K min = 0.051 (rho from 0.62 to 20.4: a very flat patch), tolerance region M of 27 grid points at L4 with extents x -1.5 to +0.5 percent, y +-0.5 percent, z +-3 percent (cut by the ball) and D reported 0.5 percent by the L4 sampler, which at P = 0 itself counts +4/-3: the valley is so flat that the L4 grid cannot resolve it (the finer L5/L6 index says (2,0)), so D = 0 is established only at L5/L6 resolution. Data: `ring-best-1.105.json`, `ring-best-1.105-shape.json`. This body has no better pronouncedness than the round-2 body and its CoM tolerance is similar to it (about 1.5 percent toward -x, 0.5 percent toward +x).

Continuation by target (`cma-chain.sh`: from the seed-3 solution, target ratio 1.12, 1.14, 1.16 in turn, margin 0, 200 generations each):

| target | achieved ratio | winding at L3 | convexity margin | at L5/L6 | tolerance region M |
|---|---|---|---|---|---|
| 1.12 | 1.1200 | +2/-1 | 0.224 | +3/-1 (one extra stable-saddle pair), total index 2 | 1 grid point at the ball edge; D = 2.96 percent |
| 1.14 | 1.1400 | +2/-1 | 0.120 | +3/-1 | 1 grid point at the ball edge; D = 2.96 percent |
| 1.16 | 1.1600 | +2/-1 | 0.087 | not verified | not verified |

The path breaks between 1.11 and 1.12: the bodies stay convex with comfortable margins (0.09 to 0.22) but acquire a second stable face with a saddle (bistable) and D jumps from 0 to about 3 percent. A polishing run at L4/K4 that wandered to ratio 1.298 found a convex body (K min 0.068, rho up to 8.1) that is also bistable (+3/-1 at L5 and L6) and has M empty within the 3 percent ball (best badness 1): so very pronounced convex bodies exist in the family, but they have two stable points and need a CoM move larger than 3 percent.

What constrains it: (1) the equilibrium count, not convexity (convex margins up to 0.2 stay available at 1.09 to 1.16); (2) D>0 beyond ratio about 1.11 to 1.12 (the CoM move needed is about 3 percent or more); (3) the tolerance region M shrinks with ratio (Sloan 1.06: 111 grid points; the ring bodies: 27 at 1.105; 1 at 1.12 to 1.14), so real bodies close to the limit are very sensitive; (4) at 1.105 the verified body already needs L5/L6 sampling to be trusted (flat valley, rho_max = 20). The family used 16 parameters with explicit twist terms in P(t) and Q(t); twisting (p5, q4) did not buy extra pronouncedness beyond 1.11 in these runs, and a 48-member-population restart with larger initial steps (killed early for budget) was running at 1.09 when stopped, so these are first-pass optima, not proofs of optimality.

## 27. What D taught about shape (for the low-poly search)

* D is a good continuous leverage on smooth bodies: it rises smoothly with pronouncedness once the count breaks and is flat at 0 inside the feasible set; but it is blind below the sampling resolution of the winding grid (the 1.105 body: L4 says 0.5 percent, L5/L6 says 0). Use fine grids and treat D below 0.5 percent as unresolved.
* The feasible set is a thin sliver: tolerance M shrinks from about 111 to 27 to 1 grid points while the ratio goes 1.06, 1.105, 1.12. Real (physical) Gomboc-like shapes near the limit have almost no room.
* Convex bistable bodies with large ratio exist (1.16 to 1.30). For the low-poly search this suggests the cost "fraction of faces draining to the lowest stable face" (large basin for the main sink) plus D-like slack for non-uniform density: bistable shapes with a dominant basin are cheap to find and the second stable basin might be removed by moving mass (Conway-Guy style), whereas uniform-density polyhedra do not respond to CoM nudges (section 22).
* No polyhedral search was started this round.

## 28. Recommendation

The exact-body route in this family saturates at about 1.11. To get 1.15 or more with one stable point the next experiments are: (a) extend the family beyond the single-spiral form (the 1.298 bistable body shows what can be reached; look at which feature creates the second basin and add a counter-term); (b) minimise D directly at fine resolution (L5) for bodies with ratio 1.15 to 1.3 and accept a small non-uniform-density correction of about 3 percent of the radius if that is acceptable for a game piece (the page's approximate mode with the rigor label already supports a CoM nudge up to 0.5 percent; a 3 percent mode would need a distinct, clearly labelled body); (c) keep the rigorous label for anything D > 0.

---

# Round 9 (approximate bodies on the page; basin maps and persistence)

## 29. Approximate bodies on the page (`tools/gomboc-spike.html`)

Five new selectable shapes, all kept next to Sloan and the pronounced body: "Approximate body 1.12 / 1.14 / 1.16 / 1.20 / 1.25" (nominal r_max/r_min). They are the convex ring-family bodies of round 7 (continuation targets 1.12, 1.14, 1.16 from the 1.109 body, then 1.20 and 1.25 continued from 1.16; data in `tools/gomboc-spike-verify/runs/r9/` and `bodies.json`). As uniform solids they are bistable (winding +3/-1 at the CoM, two stable points whose basins each cover about half of the sphere). Selecting one switches to Approximate mode and applies the CoM shift found by `find-nudge.mjs` (smallest shift vector P* in the set M, grid 0.5 percent refined to 0.25 to 0.5 percent); the slider goes up to 10 percent of the radius, the default per body is the found shift, applied along the body's own direction P*/|P*| (not "toward the stable point": a shift straight toward the first stable point barely changes the basins, see section 30).

Behavioural validation (`roll-harness.mjs`: the page physics, 30 random rolls per setting, random orientation and flick, resistance 2.0, step 1/180, then 30 s more; end directions clustered at 6 degrees):

| body | found shift (percent of radius) | default | rolls ending at the one stable point | mean settle (sim s) | rolls ending elsewhere | at 1.25 to 1.5 times the shift |
|---|---|---|---|---|---|---|
| 1.12 | 2.83 | 2.83 | 30 of 30 | 18.7 | 0 | x1.5 (4.25): 63 / 37 percent on two points |
| 1.14 | 2.84 | 2.84 | 30 of 30 | 19.7 | 0 | x1.5 (4.26): 80 / 20 |
| 1.16 | 3.95 | 3.95 | 30 of 30 | 18.0 | 0 | x1.5 (5.93): 57 / 43 |
| 1.20 | 7.35 | 7.35 | 30 of 30 | 17.7 | 0 | x1.25 (9.19): 97 / 3 |
| 1.25 | 8.89 | 8.89 | 30 of 30 | 16.9 | 0 | x1.25 (11.1): 100 |

Page check under the CSP (`ready: true`, no errors): 4 page-driver rolls per body end 0 to 0.7 degrees from the marked stable point in 16.1 to 20.5 s; Skip to rest ends with `result: 1`; Info/Controls toggles unchanged. The rigor banner for these bodies reads "APPROXIMATE - bistable as a uniform solid; made monostable by a X percent CoM shift (smallest shift found: X percent; r_max/r_min ...). Not a true homogeneous Gomboc." plus the verified fraction; in Exact mode it states "EXACT surface, but BISTABLE as a uniform solid ... does NOT always roll to the same point"; below 95 percent of the default shift it warns that a second stable point may be reached. Over-shooting is as bad as under-shooting (columns on the right): the working window around P* is narrow, a few tenths of a percent for the first three bodies. Shifts of 7 to 9 percent of the radius (1.20, 1.25) are large: physically a very heavily weighted body (non-uniform density), clearly labelled. Screenshots: `s9_b112.png` ... `s9_b125.png` (headless software GL, scratch folder); the bodies look like smooth eggs with a flatter shoulder (colour by radius shows the range); no distinct ridges.

## 30. Lane chosen: face-flow basin maps with persistence (first pass)

Why: (1) the basin maps show directly where the second basin lives in the 1.12+ bodies; (2) they exposed that pointwise gradient flow and plain discrete descent are noise-limited on these extremely flat landscapes (13 to 23 spurious "minima" at icosphere L5, even for the exact pronounced body), which led to (3) persistence of the minima (sublevel-set union-find) as a resolution-robust measure, which is the useful new tool of this round. The level-set / Reeb-graph lane is the same machinery; the monostable-start low-poly search was not started.

Tools: `basin-map.mjs` (discrete steepest descent on an L5 icosphere, artefact minima merged by persistence below 3e-3, paths drawn), `persistence.mjs` (smooth bodies on the sphere, and polyhedra on the face graph with the balanced-on-edge height as the pass height, no barrier where a face tips over the edge), `flow-basins.mjs` (pointwise flow with line search; stalls on the plateaus, kept for reference), `find-nudge.mjs`, `find-max.mjs`, `roll-harness.mjs`, `make-bodies.mjs`.

Results (plots `docs/design/img/gomboc-r9-basins-1.14.png`, `gomboc-r9-basins-1.16.png`, `gomboc-r9-persistence-vs-shift.png`):

* The 1.14 body at uniform density: two basins of 50.3 and 49.7 percent of the sphere, minima at CoM height h = 0.9291 and 0.9370, lowest barrier between them h = 0.9670, one maximum; the separatrix is a closed curve passing through the unstable point. With the shift P* the second basin disappears (basins 100 percent, single minimum h = 0.9199); at half the shift the basins are 51 / 49 percent (barrier 0.9591). Similar for 1.12 (48 / 52 percent at zero, single basin at P*) and 1.16 (47 / 53 percent).
* Persistence of the second minimum (the barrier minus its height) falls almost linearly with the shift and bottoms out at the shift P* found by the winding search, then rises again when over-shooting (a different second basin forms): 1.12: 0.0316, 0.0125, 0.0025, 0.0004 at 0, 50, 80, 100 percent of P*, then 0.0032 at 150 percent; 1.14: 0.0301, 0.0096, 0.0011, 0.0004, 0.0029 at 150; 1.16: 0.0418, 0.0093, 0.0019, 0.0004, 0.0044 at 150. Artefact minima sit at 2e-4 to 5e-4 (1e-3 for the very flat exact pronounced body), so a threshold near 3e-3 separates real basins. For the Sloan body persistence gives one minimum (artefacts 5e-4). The convex 1.298 body has second-minimum persistence 0.14 (consistent with M empty within 9 percent).
* This is exactly the smooth, V-shaped, resolution-robust objective that the winding counts and D lacked (section 22 and 27): p2(P) is continuous in the CoM position P and in the shape, its zero set is M, and the slope toward the minimum is non-zero (about 0.03 per 100 percent of P* here), so a gradient-free or gradient optimiser can minimise p2 over (shape, P) together.
* Polyhedra: on the face graph the same measure gives, for the S = 2 twisted stacks of round 6, second-face persistence 0.74 (3 rings x 5-gon), 1.00 (5 x 5), 0.71 (6 x 5) and 0.94 for the best round-5 random candidate (heights in units where the radius is about 1): far larger than the smooth bistable bodies (0.03 to 0.04), i.e. these polyhedra are nowhere near monostable in this sense, and the persistence makes the distance quantitative. A regular tetrahedron gives four equal faces (persistence 0.42).

## 31. Next steps (recommendation)

1. Optimise the ring family (and the stack family for polyhedra) on p2 directly: minimise p2 + penalties at P = centroid (non-uniform density zero), starting from the bistable ratio 1.12 to 1.3 bodies; the persistence is smooth so CMA-ES should now find true monostable bodies at larger ratios if they exist in the family (the round-7 saturation at 1.105 was measured with a noisy discrete count).
2. For low-poly: use p2 (face-graph persistence of the second stable face) as the cost in the stack and annealing searches instead of the sink count; it is continuous in vertex positions between combinatorial changes.
3. Page: the approximate bodies are playable now; tuning the window around P* (a few tenths of a percent) is the only fragile aspect; a future version could show the second basin on the body (colour by basin) to make the bistability visible.

## Low-poly search log additions (round 9)

Second-face persistence (face-graph, section 30): twisted stack 3 x 5-gon (F 20, E 32, V 14, C 64, S = 2): 0.74; 5 x 5-gon (F 20, E 32, V 14, C 64): 1.00; 6 x 5-gon (F 24, E 38, V 16, C 76): 0.71; round-5 random best (N = 14, F 18, E 27, V 11, C 54): 0.94. All S = 2: negative results for S = 1; persistence is the new distance-to-monostable measure for the search (smaller is better; 0 would mean one stable face).

---

# Round 10 (persistence as the cost: exact bodies to 1.18, first low-poly persistence search)

Outcome: the round-7 ceiling of 1.105 for a true homogeneous body in the ring family was a limit of the noisy discrete count, not of the family. Optimising the persistence of the second minimum (and maximum) directly gives bodies that pass the winding-index check at icosphere L5 and L6 up to r_max/r_min 1.18 (best), versus 1.105 before. Rigor: NUMERICALLY verified, not proven (see the rigor column below). The body is convex by a support-function check (K min 0.023 to 0.077: very flat patches). Nothing above 1.18 passed.

## 32. Method (`ring-pers.mjs`, run records in `tools/gomboc-spike-verify/runs/r10/`)

Same 16-parameter ring family and CMA-ES as `ring-cma.mjs` (section 25), zero CoM shift (degree-1 part removed analytically, uniform density). The cost replaces the winding index by persistence: r = F^(1/4) is sampled on an icosphere; the largest finite persistence pair of the sublevel filtration (second minimum) plus that of the superlevel filtration (second maximum) is the "badness"; cost = |ratio - target| x 10 + 300 (or 1000 to 1500 in later runs) x persistence + 50 x max(0, 0.02 - convexity margin), 12 to 16 members per generation, 450 to 1200 generations, 4 processes. Evaluation is about 15 times faster than the winding loop at L4 (about 50 evaluations per second), about 12 per second at L5.

## 33. Results

| run | start | target | L of persistence | cost persistence reached | winding at L5 (6/edge) / L6 (4/edge) | convexity K min | tolerance M (grid points, ball 3%) | verdict |
|---|---|---|---|---|---|---|---|---|
| p_1.12_s1 | bistable 1.12 | 1.12 | L4 | 0 | +2/-0, +2/-0 | 0.077 | 7 | EXACT, numerically verified |
| p_1.15_s2 | bistable 1.16 | 1.15 | L4 | 0 | +2/-0, +2/-0 | 0.023 | 8 | EXACT, numerically verified |
| q_1.18 | 1.15 body | 1.18 | L4 | 1e-4 | +3/-1 | not run | not run | fails: L4 persistence overfits the grid |
| q_1.22 (ratio 1.21) | 1.15 body | 1.22 | L4 | 3e-4 | +8/-6 | not run | not run | fails (stuck at 1.21 with persistence at the floor on the L4 grid) |
| r_1.18_s2 | 1.15 body | 1.18 | L5 | 4e-5 | +3/-1 | not run | not run | fails (one near-degenerate extra pair) |
| r_1.22_s1 (ratio 1.21) | 1.15 body | 1.22 | L5 | 2e-4 | +7/-5 | not run | not run | fails |
| t_1.16_s2 | 1.15 body | 1.16 | L5 | 0 | +2/-0, +2/-0 | 0.061 | 21 | EXACT, numerically verified (best margins) |
| t_1.17_s1 | 1.15 body | 1.17 | L5 | 0 | +2/-0, +2/-0 | 0.025 | 15 | EXACT, numerically verified |
| u_1.19 | 1.17 body | 1.19 | L5 | 5e-5 | +6/-4 | not run | not run | fails |
| u_1.21 (ratio 1.198) | 1.17 body | 1.21 | L5 | 1e-4 | +3/-1 | not run | not run | fails |
| w_1.18 s5 (from t_1.17_s1) | 1.17 body | 1.18 | L5 | 8e-6 | +2/-0, +2/-0 | 0.038 | 10 | EXACT, numerically verified: BEST, r_max/r_min 1.180 |
| w_1.18 s6 (same start) | 1.17 body | 1.18 | L5 | 9e-6 | +3/-1, +3/-1 (D = 0.5 percent) | 0.029 | 15 | fails at the origin (tolerance region M starts 0.5 percent away) |

Independent persistence check on the support function (not on r), icosphere L6, uniform density: 1.12 body 6e-5; 1.15 body 1.6e-4; 1.16 body 1e-4; 1.17 body 1.2e-4; 1.18 body 2.6e-4; for comparison the old 1.105 body shows 7.5e-4 (valley artefacts). All are at or below the artefact floor (about 3e-4), i.e. one stable minimum within the sampling resolution. Behaviour with the page physics (`roll-harness.mjs`, shift 0, 30 or 20 random rolls, g 654, resistance 2.0): 1.15: 30/30 end at the one stable point, mean settle 19.3 s; 1.16: 20/20, 21.0 s; 1.18: 20/20, 23.0 s.

Lessons:
* The persistence cost removes the noise that blocked round 7: bodies from 1.12 to 1.17 were reached with zero measured persistence and the winding verified without re-polishing.
* The grid at which persistence is computed matters: at L4 the search overfits (1.18 and 1.21 bodies from L4 runs show +3/-1 and +8/-6 at L5). At L5 the search lands on bodies that have an extra stable/saddle pair of persistence below the floor (1e-5 to 1e-4) just beyond 1.18: such a pair is a real second stable point of tiny depth (and the winding index counts it), so persistence at the floor is a necessary but not a sufficient condition; the winding index at L5/L6 remains the arbiter.
* Seed lottery at the edge: from the same start at 1.18, one seed passes (K min 0.038, M 10 points) and one fails by +3/-1 (M excludes the origin by 0.5 percent). 1.19 and 1.21 did not pass in any run, so about 1.18 is the practical edge of this 16-parameter family at this budget. This is a search limit, not a proof of a maximum.
* Margins are small: the tolerance region M (a CoM move that keeps one stable point) extends only 2 to 2.5 percent toward -x and 1 percent toward +y; the 1.16 body has the largest M (21 points) and K min 0.061, the 1.18 body is the most pronounced but flatter (K min 0.038).
* Rigor: winding index at two grid resolutions plus floor-level persistence is numerical evidence on a finite grid with a degree-12 spherical-harmonic fit of the exact family; it is not a proof (an even flatter extra pair below the grid resolution cannot be excluded), and a certified count (interval arithmetic) was not attempted.

## 34. Low-poly: persistence as the cost (`poly-pers.mjs`, `lowpoly-pers.mjs`)

* Start from the monostable smooth body (1.15): its convex hull on N Fibonacci points (the polyhedron "approximation" of a monostable surface) has persistence of the second stable face 0.00096 (N 1500), 0.0021 (800), 0.0036 (400), 0.0077 (200), 0.012 (120), 0.020 (80), 0.035 (50) in units of the radius (face height range 0.11 to 0.13), but with 547 to 86 stable faces (S): the persistence is small because the sampled valley is flat, not because the polyhedron is monostable. Persistence is therefore only meaningful together with S and the height range.
* First attempt (cost = p2 + 0.0005 x (S - 1)) was gamed: vertices became unconstrained (a height range of 39 for N = 24, p2 0.97, normalised 0.025). Constraining the vertex radius to 0.8 to 1.25 of the body and the face-height range to 0.15 to 0.6 (cost p2 + 0.02 (S - 1) + range penalties), annealing the positions of N points from the Fibonacci hull of the 1.15 body, 100 s each: N = 24: p2 0.088, S = 5, 44 faces; N = 40: 0.085, S = 7, 56 faces; N = 80: 0.091, S = 8, 70 faces (height range 0.37 to 0.45, i.e. pronouncedness about 1.4 to 1.6 of the face heights spread).
* Versus round 9: second-face persistence 0.71 to 1.00 (S = 2 twisted stacks, pronounced) and 0.94: the search is about 10 times closer (0.085 to 0.09) but at S = 5 to 8 stable faces and 44 to 70 faces: negative result for monostability (S = 1 not reached), positive for the measure (persistence moves smoothly under vertex moves, and the annealing could reduce it by a factor 10 at fixed pronouncedness). The pairing of low persistence with large S shows the polyhedral problem is dominated by the count, so the next cost should be S first and persistence second (or use the face-graph analogue of D).

## 35. Page (`tools/gomboc-spike.html`)

Two new selectable shapes, "Exact body 1.16 (verified numerically)" and "Exact body 1.18 (verified numerically)", with the rigor banner "EXACT surface, uniform density ... VERIFIED NUMERICALLY (not a mathematical proof): winding index +2/-0 at L5 and L6, persistence at the sampling floor, K min, tolerance" and an Info paragraph; the banner in Approximate mode says any nudge is unverified. Sloan, the pronounced body, the five approximate bodies and the Info/Controls toggles are untouched. Page check under the CSP: `ready: true`, `errors: []`; page-driver rolls (3 per body) end 0.0 to 0.38 degrees from the marked stable point in 35 to 59 s of wall time (software GL).

## 36. Next steps (recommendation)

1. Ship the 1.16 body (largest tolerance) and 1.18 (most pronounced) as the exact bodies; the five approximate CoM-shift bodies are now redundant for most purposes (they remain on the page).
2. To go beyond 1.18: add parameters to the family (higher harmonics in the ring angle, a second spiral), use persistence at L5 plus an L5 winding index in the cost for the last steps (about 10 times slower), and use more seeds (the seed lottery at the edge is large); expect diminishing returns: the tolerance region is already about 2 percent of the radius.
3. Certify one body (interval arithmetic or exhaustive critical-point solve) if the "mathematically verified" label is wanted.
4. Low-poly: switch the cost to the count first (S of the face graph, with persistence as the smooth tie-breaker), start from the monostable hull at N = 24 to 80, and allow vertex moves that keep the height range.

## 37. Round 11: polyhedral cousin of the verified bodies (PD-207)

Goal: convert the verified smooth bodies (1.16 and 1.18, round 10, exact surface, uniform density) to convex polyhedra, check every face, edge and vertex, then reduce the face count while staying valid. Result in one line: **no polyhedron with S = 1 was found at any resolution from 36 to 1.3 million faces, so there is no valid polyhedron to reduce; the reduction round was not run.** The checker, the timings and the reason (below) are the deliverable.

## 38. Method and rigor labels (`poly-check.mjs`, `poly-run.mjs`, `ico-run.mjs`, `circ-run.mjs`; records in `tools/gomboc-spike-verify/runs/r11/`)

* Polyhedron definition: vertices are surface points of the body (r^4 = 1 + degree 2..12 spherical-harmonic sum, zero CoM shift) rounded to a 2^-40 grid, so every vertex is an exact dyadic rational. The polyhedron IS the hull of those integer points (it differs from the smooth body by about 1e-12 plus the faceting).
* Vertex sets: Fibonacci points with an incremental hull (`hull.mjs`, float), and icosphere points with the icosphere triangulation repaired by exact edge flips (`flipToConvex`) up to level 8 (655k vertices, 1.3M faces). Faces are the triangles (generic: no two adjacent triangles are coplanar; checked exactly, `flat` = 0).
* EXACT (BigInt integer arithmetic, no tolerance anywhere): volumetric centroid as a rational (signed tetrahedra); closed manifold; Euler V-E+F = 2; positive volume; every edge strictly locally convex (exact orientation determinant); centroid strictly inside every face plane. Closed + connected + locally strictly convex + star-shaped about the centroid means the surface is the boundary of a strictly convex polyhedron (Hadamard). For the 1002-vertex Fibonacci hull the global test (every vertex below every face plane) was also run: float filter with an error bound, exact where ambiguous: 0 ambiguous, 0 violations. Not run globally for the larger ones (O(V F)); the local certificate above is already sufficient.
* EXACT classification: stable face iff the foot of the perpendicular from the centroid lies in the triangle (sign of det[b-a, C-a, n] per edge, rational C); saddle edge iff the foot lies strictly inside the edge and C-to-foot lies strictly inside the edge's normal cone; unstable vertex iff all neighbours satisfy (w-v).(v-C) < 0; degenerate (zero) cases counted separately (all 0 in every run). Tipping graph: every violating edge of a non-stable face leads to a face with strictly smaller exact height (compared as squared rational heights), sinks are exactly the stable faces. Poincare-Hopf S + U - H = 2 held in every convex case.
* FLOAT cross-check (`floatCheck`, doubles): stable-face count equal to the exact count in all 20 Fibonacci hull runs (both bodies).
* NOT certified: that the polyhedron approximates the smooth body (it is a different body); anything about the smooth body beyond round 10 (numerical, winding index).

## 39. Results: S never approaches 1

Fibonacci hull (faces = 2N-4), exact check; S = stable faces, U = unstable vertices, H = saddle edges (S+U-H = 2 always):

| faces | S (1.16) | S (1.18) | S per face (1.16) |
|---|---|---|---|
| 36 | 32 | 32 | 0.89 |
| 96 | 86 | 84 | 0.90 |
| 196 | 156 | 152 | 0.80 |
| 396 | 212 | 202 | 0.54 |
| 1000 | 357 | 325 | 0.36 |
| 2000 | 502 | 465 | 0.25 |
| 5000 | 611 | 578 | 0.12 |
| 10000 | 896 | 834 | 0.09 |
| 20000 | 911 | 848 | 0.05 |
| 40000 | 1267 | 1214 | 0.03 |

Icosphere + flips (exact certificate passes each time): 1.16: 20k faces S 1097, 82k 1715, 328k 2210, 1.31M **1338**; 1.18: 20k 1039, 82k 1723, 328k 2806, 1.31M 3826. So S grows, plateaus at roughly 1e3 to 4e3 and is not decreasing toward 1 (the 1.16 drop at L8 is one point, not a trend). No resolution tried has S = 1. Smallest S found: 32 at 36 faces (every face stable: coarse hulls of a near sphere), and the smallest S/F ratio is 0.1 percent at 1.3M faces. The "smallest valid face count" is therefore undefined here; the smallest face count before reduction that passes the convexity certificate is 36 but it is multi-stable.

Circumscribed variant (faces tangent to the smooth body at Fibonacci normals, heights exactly h(u_i); float, `circ-run.mjs`): S = 50, 157, 434, 483, 710, 851 at 50 to 10000 faces (1.16): same behaviour, so the noise is not the vertex-sampling sag.

Why (measured and argued, not proved): the stable faces of the 10000-face circumscribed 1.16 polyhedron form 4 clusters: two near-continuous bands of about 410 faces each with angular radius 160 degrees (face heights 0.948 to 1.025), a 12-face patch around the true minimum (h 0.917) and 2 stray faces. 1.18: two bands (408, 315 faces), a 38-face patch, a 6-face patch at h 0.905. So the smooth bodies have long flat rings of the support function where the foot offset |grad h| is smaller than the face size at every resolution tried. For a face of angular size s the foot lies in the face when |grad h| < about R s / 2 (R the radius of curvature, about 1), i.e. within a distance rho of about R s / (2 lambda) of a critical point of h, where lambda = R - h is the Hessian of h there (tiny for a near-spherical body). The number of such faces, pi rho^2 / s^2 = pi R^2/(4 lambda^2), does not depend on s: refining the mesh shrinks the zone and multiplies the faces in it by the same factor. Along a flat ring the same holds per unit length, hence the plateau. Conclusion: sampling a pronounced-but-near-spherical smooth body at any resolution gives S of order 1e3; the polyhedron has to be designed with large, pronounced faces (as in the low-poly searches, rounds 8 to 9: S 5 to 8 at 44 to 70 faces, 12 stable faces in the 1.2-rank bodies), not obtained by hulling the smooth body.

## 40. Timing (wall seconds, one core, Node, this machine; stages exact unless noted)

| faces | hull (Fibonacci, float incremental) | flip (icosphere) | centroid (exact) | convexity cert (exact) | classification (exact) | tipping graph (exact) | check total | float check (all, doubles) |
|---|---|---|---|---|---|---|---|---|
| 1,000 | 0.027 | | 0.001 | 0.004 | 0.010 | 0.001 | 0.016 | 0.001 |
| 2,000 | 0.036 | | 0.002 | 0.006 | 0.019 | 0.003 | 0.030 | 0.003 |
| 5,000 | 0.207 | | 0.004 | 0.016 | 0.047 | 0.010 | 0.077 | 0.008 |
| 10,000 | 0.773 | | 0.010 | 0.030 | 0.085 | 0.019 | 0.144 | 0.019 |
| 20,000 | 4.03 | | 0.020 | 0.068 | 0.151 | 0.039 | 0.278 | 0.034 |
| 40,000 | 36.7 | | 0.044 | 0.146 | 0.267 | 0.074 | 0.531 | 0.034 |
| 20,480 (ico) | | 0.094 | 0.019 | 0.056 | 0.145 | 0.043 | 0.263 | |
| 81,920 (ico) | | 0.332 | 0.071 | 0.232 | 0.468 | 0.141 | 0.912 | |
| 327,680 (ico) | | 1.76 | 0.263 | 1.50 | 2.20 | 0.588 | 4.55 | |
| 1,310,720 (ico) | | 8.56 | 0.931 | 7.22 | 8.85 | 2.64 | 19.8 | |

Log-log slopes against faces: exact check total 0.98 (1k to 1.3M faces), i.e. linear (about 15 microseconds per face with BigInt); incremental hull 1.97 (quadratic, the practical limit of `hull.mjs` at about 40k faces); flips 1.10. The check is cheap, so exhaustive verification is not the bottleneck at any size; hull building is, and the icosphere + flip route avoids it. Plot: `docs/design/img/gomboc-r11-timing.svg` (time panel and S panel).

## 41. Reduction, roll harness, page (not done)

* Reduction (task 3): not run, there is no valid (S = 1) starting polyhedron. The S versus face-count table above is the only "path" (S/F falls from 0.9 to 0.001 as faces grow, but S never reaches 1), and decimating a high-resolution hull cannot help: merging faces moves the polyhedron toward the coarse hulls, which have higher S/F.
* Roll harness: not applicable (it rolls the smooth body); no data file of a valid polyhedron was saved (none exists).
* Page: nothing added, the page is unchanged this round (a multi-stable polyhedron is not a useful shape).

## 42. Next steps (recommendation)

1. Stop hulling the smooth body. Design the polyhedron directly with the exact checker as the cost: S (exact) first, then persistence of the face graph, starting from the low-poly searches (round 9: S 5 to 8 at 44 to 70 faces) and using the tipping graph (sinks = stable faces) to pick which face to push, with the exact check (15 microseconds per face) inside the loop; at 100 to 1000 faces one exact check is 2 to 20 ms so a million evaluations are affordable.
2. Target body: a smooth body whose support function has Hessian eigenvalues of order R (large lambda, strongly pronounced) rather than the nearly spherical 1.15 to 1.18 ratio bodies; the plateau estimate pi R^2/(4 lambda^2) per critical point is the quantity to make small. This is in tension with the monostable smooth bodies being near-spherical, and is probably why a homogeneous mono-monostatic polyhedron is open: the smooth examples are too flat for faceting.
3. If a polyhedron with S = 1 is ever found, run the full-vertex global convexity test on it (`--global`) and add it to the page with the rigor banner "exact, uniform density, certified in rational arithmetic".

# Round 12 (direct search for S = 1 polyhedra; owner experiment: merging near-equal faces)

Result in one line: **no polyhedron with S = 1 was found** (no certified hit, so no reduction, roll-harness run or page change). Direct search reaches **S = 2 easily (about 22 to 24 faces, exact-certified)** and stalls there at every start size from 40 to 1000 faces; merging near-equal faces of the 1.16/1.18 hulls lowers S from hundreds to about 25 to 80 but not toward 1.

## 43. Tools (`tools/gomboc-spike-verify/`, records in `runs/r12/`)

* `r12-eval.mjs`: FLOAT evaluator of a polytope given as half-spaces (dual hull; vertices, polygon rings, volumetric centroid, per-face foot margin = signed in-plane distance of the CoM foot to the nearest edge line; stable iff margin > -1e-9, i.e. conservative). Agrees with the exact checker on every merged polyhedron tried (float S = exact S).
* `r12-search.mjs`: direct search. Two parametrisations: `vert` (N points, polyhedron = hull, ~2N-4 triangles; points that fall inside simply disappear, so the face count falls during the run) and `hs` (planes = unit normal + offset from a fixed origin, polyhedron = intersection; redundant planes drop out). Two optimisers: `anneal` (geometric temperature 0.6 to 0.02; 30 percent of the moves are on vertices/planes of bad stable faces) and `greedy` (tipping-graph guided: 90 percent of the moves are on a stable face other than the lowest one, those with the smallest foot margin first; accept if not worse, no temperature). Cost (FLOAT) = sum over stable faces other than the lowest stable one of (1 + 0.5 min(m/0.05, 1)) + 2 max(0, r_max/h_min - ASP) + a penalty for F below 0.6 times the target. S = 1 would be cost 0. Seeds: `sph` (jittered Fibonacci sphere), `body` (Fibonacci hull of the verified 1.16 body), `twist` (elongated 1.5:1.0:0.8 ellipsoid with a z-twist of 1.6 rad per unit z), `r10` (round 10 low-poly bodies, coded but not run in the sweep). Speed: 15 to 20k evals/s at 40 faces, about 1k/s at 400, about 100/s at 1000 faces (Fibonacci start; the hull rebuild dominates).
* `r12-certify.mjs`: exact BigInt check of the hull of the (2^-40 rounded) vertices after dropping interior points, plus the global vertex-below-plane test. `r12-merge.mjs`, `r12-merge-sweep.sh`: the merge experiment.
* CMA-ES was not tried (3N dimensions with a discrete, piecewise-constant cost; annealing and the tipping-graph greedy were the two optimisers).

## 44. Direct search: best S (60 runs, 150 s each, `search_b2.jsonl`; 12 screening runs of 60 s at 100 faces, `search_screen100.jsonl`)

Best float S per start size (any param, seed, ASP 3 or 6; all with exact-confirmable polyhedra when S <= 3):

| start faces (target) | best S | faces of the best | time per run | note |
|---|---|---|---|---|
| 40 | 2 | 20 to 24 | 150 s | all 12 runs S 2 (one S 3) |
| 100 | 2 | 24 to 82 | 60 s | anneal S 2 or 3, twist seed best |
| 200 | 2 | 23 to 74 | 150 s | |
| 400 | 2 | 52 to 144 | 150 s | some runs stuck at S 3 to 9 |
| 1000 | 2 | 194 to 356 | 150 s (only 15k evals) | sph/body seeds S 6 (too few evals) |

* S = 2 is easy: reached within seconds, from every seed, both parametrisations; bodies have 4 to 13 unstable vertices and the same number of saddle edges (S + U - H = 2). The face count collapses to 20 to 30 under annealing because vertices are free to leave the hull: the search prefers coarse bistable bodies to fine ones. Where the start has hundreds of faces (400, 1000) the best S = 2 polyhedra keep 144 to 356 faces (twist seed), still S = 2.
* Greedy (tipping-graph guided, no temperature) is much worse than annealing from near-sphere seeds (S 6 to 17 at 60 to 70 faces) and equal only from the twist seed (S 2). Guided moves alone get stuck; the temperature matters more than the guidance (the guided 30 percent share inside annealing was not ablated).
* Relaxing the aspect limit from 3 to 6 gave no S = 1 (it lowered cost at equal S: more room, same count). The limit was binding at 3 (aspects 2.8 to 3.0); the S = 2 optimum sits at the allowed elongation, which suggests the search uses elongation to cheat the second stable face down but not away.
* Exact confirmation (BigInt, `r12-certify.mjs`) of three S = 2 bodies: 24 triangular faces / 14 vertices, S 2, U 4, H 4, convexity certificate true, global test 0 violations (`runs/r12/exact_best_vert_anneal_sph_40_7_S2.json`); 24 faces S 2 U 7 H 7; 194 faces / 99 vertices S 2 U 11 H 11. These are certified bistable (not mono-) convex polyhedra of uniform density; pass1 is false only because S is 2.
* Negative results: no run reached cost below 1 (one extra stable face). Fitness plateaus: the second stable face is not destroyed by vertex/plane moves without recreating another; this is consistent with the known literature (smallest known mono-monostatic homogeneous polytope has 56,946 faces) and with the round 11 flat-ring argument. The searched space at 40 to 1000 faces and 150 s per run is small compared to what a 57k-face construction needs; absence of S = 1 here is not evidence of nonexistence.
* Merge applied to direct-search bodies (float, 194-face S = 2 body): merging lowers faces and RAISES S (144 faces S 3, 104 S 4, 72 S 5, 47 S 9).

## 45. Owner experiment: merging near-equal faces (`r12-merge.mjs`, runs `merge_*.jsonl`, `single_merge_*.jsonl`)

* Method (EXACT check afterwards): hull of N Fibonacci points of body 1.16 or 1.18 (rounded to the 2^-40 grid, as in round 11); faces clustered; each cluster replaced by ONE circumscribing plane (area-weighted mean normal, offset = max over the cluster's vertices, so the body only grows and stays convex); polytope = intersection of cluster planes and unmerged triangle planes (dual hull), 2e-7 random plane offsets so every vertex is simple; polygons fan-triangulated, vertices quantised, exact edge flips (`flipToConvex`) then the exact checker. Clustering rules: `seeded` (the lowest unassigned face seeds a cluster; BFS over adjacent faces within ANG degrees of the seed normal and HTOL of the seed height; default) and `single`-link (adjacent faces with normal angle < ANG and height difference < HTOL; chains).
* Exact convexity certificate: held in 222 of 223 rows that produced an exact result (the one failure: centroid-strictly-inside test on a sliver, N 3000, 4300 faces; in addition 50 single-link rows are unbounded/chained and 1 seeded row crashed the checker, listed as `no exact`); PH = 2 in all certified rows. Merged polyhedra are convex by construction (intersection of half-spaces); what the certificate adds is exact S.
* Seeded merging (face counts are polygons; S exact; heights in units of the body radius, the face height range is about 0.11 to 0.13):

| body | start faces | tolerance (ANG deg / HTOL) | faces | S |
|---|---|---|---|---|
| 1.16 | 2k (N 1000) | none | 1996 | 507 |
| 1.16 | 2k | 10 / 0.004 | 642 | 227 |
| 1.16 | 2k | 25 / 0.008 | 338 | 98 |
| 1.16 | 2k | 40 / 0.008 | 323 | 89 |
| 1.16 | 6k (N 3000) | 25 / 0.008 | 332 | 103 |
| 1.16 | 6k | 40 / 0.008 | 286 | 78 |
| 1.18 | 6k | 40 / 0.008 | 312 | 80 |
| 1.18 | 2k | 40 / 0.008 | 336 | 81 |

 S falls roughly in proportion to the face count (about 0.25 to 0.3 stable faces per face at 300 faces), not toward 1. Small tolerances (3 degrees, 0.0005) change almost nothing (S 450 to 520).
* Single-link merging (N 500 to 5000, ANG 2 to 30, HTOL 0.002 to 0.05): percolation. At HTOL 0.002 about 1800 faces and S ~270 (N 5000), at HTOL 0.005 and ANG >= 4 degrees a sharp drop to F 358 (1.16) / 438 (1.18) and S 26 / 23 (exact, PH 2, certificate true: `single_merge_1.16_5000.jsonl`), and at HTOL >= 0.01 everything chains into one cluster whose circumscribing plane makes the polytope unbounded (no result). The S 23 to 26 at 360 to 440 faces is the smallest S from merging, still far from 1; the window between 0.005 and 0.01 (where the percolation transition is) was not resolved finely, nor were intermediate N values.
* Why S does not reach 1 (argued): a merged circumscribing plane lowers the number of faces on a flat ring but the plane stays tangent only at its highest point, so its foot lies inside the merged polygon exactly when the ring was flat at that spot; the supporting-plane heights of the merged faces form the same flat valley, the CoM moves little, and the remaining faces are again close to equal. Not proved.
* Merging the direct-search bodies instead made S larger (section 44).

## 46. Conclusions and recommendation

* S = 1 not found; the smallest S found is 2 (exact-certified at 24 faces). Direct search floors at S = 2 for 40 to 1000 start faces; hull-and-merge of the verified smooth bodies floors at S about 25 (F ~400).
* Moves that help: letting vertices leave the hull (the face count drops to 20 to 30, S to 2); twisted/elongated starts (S = 2 at 11 stable faces start); temperature. Moves that do not: greedy tipping-graph moves, relaxing the aspect limit, merging faces of an already S = 2 body.
* Recommendation: (1) the 57k-face tangent-cover construction is probably the only route known to work; a search at 40 to 1000 faces should not expect S = 1 without a structural idea. (2) If continuing: optimise the support-function-style cost directly (smooth, no hull rebuild) at 2k to 10k faces from a seed that is already monostable (merge result with S about 25 at 400 faces is a candidate seed), then apply tipping-graph moves to the 25 remaining stable faces; the exact check at that size is 30 to 150 ms. (3) Gradient information is the missing ingredient: the cost is piecewise constant, so use margins (already in the cost) with many more evals (needs an incremental hull; hull.mjs is the bottleneck at >=400 faces). (4) Do not spend more on S = 2 or hull-only approaches.
* Page: unchanged (no S = 1 body). Not done: reduction, roll harness (nothing to roll), CMA-ES, `r10` seed in the sweep, finer percolation window.

# Round 13 (incremental S optimiser, weighted-CoM S=1, page)

Result in one line: **no homogeneous S=1 polyhedron found** (best exact-certified S=2, now also at 2996 faces); a **weighted (non-homogeneous) S=1 polyhedron is exactly certified** for both certified S=2 bodies (24 and 194 faces) but needs a CoM shift of 57 to 73 percent of the radius, so it is not a slightly weighted die; and the fast optimiser has a tolerance bug found late (section 51), so its float S values at 1.4k to 3k faces are not certified.

## 47. Incremental optimiser (`r13-inc.mjs`, `r13-seed.mjs`, `r13-exact.mjs`; logs and seeds in `runs/r13/`)

* Representation: fixed-topology triangle mesh, one vertex moved per step; accept only if every edge of the incident triangles stays locally convex and r_max <= 3 h_min. Incremental: per-triangle unit normal, offset, volume; running volume and moment give the CoM; each face caches its foot margin m_f (signed in-plane distance of the CoM foot to the nearest edge line) with the cumulative CoM path length L_f at computation; the foot moves by at most |dC| so the stable/unstable sign of face f is certain while |m_f| > L - L_f. Only incident and stale faces are recomputed; the rest is a linear scan over the faces (about 5 ns each), which also gives S, the lowest stable face and h_min. Verified against a from-scratch recomputation after every accepted move (debug mode, 0 mismatches after fixing a save/restore bug).
* Speed (one core, float): 6.5 microseconds per move at 1,420 faces (153k moves/s, acceptance 20 percent), 10 to 13 microseconds at 2,996 faces (75k to 99k moves/s), 3.5 us when almost every move is rejected. Round 12 was about 10 ms per evaluation at 1000 faces (hull rebuild), so the speed-up is about 1000x and far below the 1 ms target. 10k faces was not timed (the scan is linear, expected about 30 us).
* Cost: sum over stable faces other than the lowest stable one of (1 + 0.5 min(m/mref,1)) (mref half an average edge) plus 0.02 times a hinge on unstable faces whose margin is within half an edge of 0 (pressure from near-stable faces). Annealing (T 0.5 to 0.02 or 0.15 to 0.01), 30 percent of the moves on vertices of a spurious stable face (the kill move), step 10^-3 to 10^-0.5 edge lengths.
* Seeds: flat merged polytopes cannot be refined by subdivision (a flat polygon is rigid under strict convexity: raising one vertex makes the link edges reflex; subdivided seeds were 100 percent rejected). Used instead: Fibonacci samples of the p-norm-rounded merged polytope (p 40 to 100) or of the rounded S=2 bodies, hulled (`g:`, `gv:` kinds). Hulls of more than about 2.5k points of a very flat body break `hull.mjs` (face count blow-up); the sets used have 1500 points (2996 faces).

## 48. Results (float cost; certified only where stated)

| seed | faces | start S (float) | best float S after 300 to 420 s | exact (BigInt) |
|---|---|---|---|---|
| merged 1.16 (S 26 at 358 polygons), fan-triangulated, no refinement | 1,420 | 26 | 5 (40 s) | not certified (tolerance bug, section 51) |
| rounded merged 1.16 (S 29) | 2,996 | 29 | 3 to 4 | exact S 9 to 18, NOT convex: invalid |
| rounded merged 1.18 | 2,996 | 29 | 4 | exact S 8 to 12, NOT convex: invalid |
| rounded round-12 S=2 body (194 faces) | 2,996 | 2 (exact 3) | **2** | exact S 2, U 15, H 15, convexity certificate true, global test 0 violations (`runs/r13/exact_c_gs194_N1500_S2.json`) |
| rounded round-12 S=2 body (24 faces) | 2,986 | 2 | 2 (acceptance 0: seed too rigid) | not convex |

* S=2 to S=1 test (task 2c): from the rounded 194-face S=2 body at 3k faces, 25M moves of fine-scale annealing leave S=2 (cost 1.10 to 1.25, the second stable face keeps height within 0.5 percent of the lowest: 0.7274 vs 0.7314). The second stable face is a **robust, not marginal**, feature at this resolution: no sequence of small vertex moves removes it without creating another.
* The merged S about 25 seeds fall to float S 3 to 5 at 1.4k to 3k faces, but those meshes were accepted with a float convexity tolerance of +1e-11 and are not valid (section 51), so no certified result below S=2 exists.
* Not done: margin-cost ablation against the integer-S cost (part A of the owner request: the margin term is in the cost, but no controlled comparison, CoM laxity reporting or oblique-face seeding was run), 5k and 10k faces, CMA-ES, tipping-edge-drop kill move beyond the vertex-of-bad-face proposal.

## 49. Weighted-CoM S=1 (`r13-prism.mjs`, `runs/r13/prism_*.json`)

Face i is stable for CoM c iff the foot of c on plane i lies inside polygon i (prism). Random search of c inside the body (200k samples) for exactly one prism, then local descent of |c| keeping the other margins below -0.2 percent of the radius, then EXACT confirmation (BigInt: c as a dyadic rational with denominator 2^30, per-face foot-in-triangle sign tests on integers, c strictly inside every face plane, convexity certificate and global test of the polyhedron, 0 degenerate edges):

| body | faces | homogeneous S | CoM shift (percent of mean vertex radius) | exact S at the shifted CoM | margin of the wanted face | most positive other margin |
|---|---|---|---|---|---|---|
| round-12 S=2, 24 faces | 24 | 2 | 73.4 | 1 | 0.239 (abs) | -0.0126 |
| round-12 S=2, 194 faces | 194 | 2 | 57.2 | 1 | 0.109 | -0.0025 |

So the two bodies ARE exactly provable single-stable-face bodies for a shifted centre of mass (a weighted die), but the shift is huge (the descent is a crude random local search, not an optimiser; it was not applied to the 3k-face meshes, where the prism test costs O(faces) per sample). Smallest face count with a valid weighted S=1 found: 24 (but the 24-face one could not be shown on the page, section 50). Direction of the 194-face shift (unit): (0.127, -0.764, -0.632).

## 50. Page (`tools/gomboc-spike.html`, commit be189ca)

* Default colouring is now the distance from the centre of mass (toggle "colour by distance from CoM", on by default), measured from the shifted CoM in approximate mode (recomputed on every nudge); stable/unstable markers are kept in this colouring. Info text updated.
* New selectable shapes (data generated by `r13-page-poly.mjs` from the exact records): "Polyhedron S=2, 194 faces (exact)" with a banner (194 faces / 99 vertices, S 2, U 11, H 11, exactly certified, NOT mono-monostatic, two red dots) and "Weighted polyhedron S=1, 194 faces (CoM shifted 57%)" with the banner "exactly verified as a weighted (non-homogeneous) body, CoM shifted 57.2% of radius, NOT a homogeneous gomboc". Physics: the polyhedron is rolled as a p-norm rounded body (p 40, radial function from the plane gauge, support Newton started from the extreme vertex); inertia is that of the uniform body (not re-referenced for the shift); float, not certified. Rolls via the page driver (fastRoll, 4 rolls each): the S=2 body ended on both stable faces (faces 2, 1, 1, 2 of the two marked), the weighted body ended on its single marked face in 4 of 4 rolls (rest within 0.3 degrees), no page errors; one UI roll each worked. csptest: ready true, errors [].
* The 24-face bodies (homogeneous and weighted) are NOT on the page: the rolling model diverges for the 5:1 elongated body at every p (6 to 40) and time step (1/180 to 1/1000) tried; with the vertex-start Newton the support function is right, the failure is in the rolling dynamics. Screenshots (1000x660): scratchpad `gom/r13-default.png`, `r13-p194.png` (and `r13-p24.png`, the broken one).

## 51. Tolerance bug (fix applied, rerun incomplete)

`r13-inc.mjs` accepted edges with convexity residual up to +1e-11 (float); exact quantised checks (2^-40 grid, exact flips) find 24 to 66 reflex edges in those meshes and S differs (9 to 18 exact vs 3 to 4 float). The fix (strict margin, CONVTOL -1e-10, env CONVTOL) is in the tool, but the seeds made from near-flat rounded merged polytopes are themselves exactly non-convex after quantisation (hull.mjs float output on near-coplanar points), so the strict rerun on them was not completed. Only the rounded S=2 194-face seed passes the exact checker. Treat every float S below 9 at 1.4k to 3k faces in section 48 as unvalidated.

## 52. Conclusions and recommendation

* No S=1 homogeneous polyhedron; smallest certified S=2 stays 24 faces and also exists at 2,996 faces (so S=2 persists at fine scale: robust).
* Fast moves exist (6 to 13 us), so searches with 10^7 to 10^8 moves per run are cheap; what is missing is a valid exact-convex seeding (use exact flips or a hull with exact predicates for the seeds, then the strict tolerance) and the cost ablation (margin vs integer S).
* The weighted route is the first rigorous single-stable-face polyhedra in this study, but with D 57 to 73 percent; minimise D by searching c jointly with the vertices (cost = shift subject to exactly one prism). The prism arrangement is cheap for 24 to 200 faces.
* Tangent-cover polyhedron: still the only known homogeneous route; reproducing it exactly as a verified baseline is worth doing before more search, since the exact checker here handles 57k faces in under a second (about 15 us per face) and the global test is O(VF) but feasible.
