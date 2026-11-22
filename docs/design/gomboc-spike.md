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
