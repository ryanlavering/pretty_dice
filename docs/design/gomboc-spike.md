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
* Naive grid classification is NOT reliable here and I do not use it for the claim: counting discrete minima/maxima/saddles at icosphere vertices (`verify.mjs`) gives many spurious extrema that grow with resolution (e.g. 23 minima, 17 maxima, 38 saddles at L=5 for beta = 0.02, still satisfying chi = 2), because the stable point sits at the bottom of a very long, narrow, almost flat valley: the valley is 4 to 8 thousand times softer along it than across it (Hessian eigenvalues 0.0014 vs 4.5). The gradient-root and index methods above do not have that problem.

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

| set | rolls | rested | time to rest (sim s) | angle from stable point at rest | 30 s later | swings (median-ish) |
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

Low-damping best case (angular damping 0.01 and 0.002, no later increase, up to 150 to 300 s): N=1000, 5 of 100 settle; N=2000, 35 to 79 of 100 settle, still 18 to 26 clusters and the stable point reached in 5 to 12 of them. Cannon has no rolling resistance and its contact solver loses energy at facet impacts, so a faceted body does not behave like the smooth body at any N tried.

Why: the potential landscape of the smooth body varies by only about 0.06 of a radius over the whole sphere and by about 1e-3 across the last few degrees, while the facet bumps of an N-vertex inscribed hull are of order 1/N: tens to hundreds of times larger than the signal near the equilibrium, and the facet interior is a flat rest (plus the app's damping, which stops the body at the first facet it sticks on). With the real beta (a few percent) there is no N in 100..2000 that gives an "always the same face" die: the most common rest has at most 10 percent of the drops, and the intended stable point is reached by about 1 to 3 percent. Pushing N further (10^4 and up) would make cannon vertex-plane collision cost explode and still not fix the lack of rolling friction control; Bezdek's 14-face or Conway-Guy's 19-face mono-stable polyhedra are the only faceted route and are extremely thin/needle-like, not a die look.

Custom smooth collision shape in cannon: cannon-es shapes are a closed set (Sphere, Box, ConvexPolyhedron, ...); a smooth shape needs a new Shape class plus a new narrow-phase function for each pair it meets (plane, box, convex, other Gomboc), contact normal/depth from the support function, and contact-point generation that is stable for a near-sphere (single contact point: the PGS solver with one contact tends to jitter at rest). Realistic only for the Gomboc-vs-plane/walls pair (which we can write: depth = h(n_b) - height, contact at the support point), and then it still needs rolling resistance that cannon does not have (angularDamping only approximates it) and would lose the exact no-slip rolling used on the page. I estimate 3 to 5 days to do this robustly inside cannon (one new Shape type, plane pair, sleeping, tests, jitter tuning) and it is not guaranteed to reproduce the 1-minute valley creep without custom rolling friction.

## 6. Verdict

* As a tool page / artifact: yes, works, and is convincing. A smooth convex homogeneous body that always ends at the same point (82 of 82 rolls, spread 0.1 deg after 30 s more), including from a nudge on the unstable point; side-by-side sphere shows the contrast. Cost already spent: this spike.
* As a novelty die shape `d1` in Look inside the main app via cannon-es: not feasible with the faceted hull (no N from 100 to 2000 gives the property; best case still more than 60 resting orientations). It is also not a good fit for the product: the settle time of the real thing is on the order of a minute of simulation time at physical scale, which is slow for a dice roll (the page needs a x4 time-lapse), and the result is always 1 so there is nothing to randomise.
* If the owner still wants it in the app: build it as a special-case mode outside the cannon world: a single Gomboc on the mat with this spike's own integrator (about 250 lines already written and tested; per step about 1 ms in a headless browser, so a x4 time-lapse costs 8 ms per frame), drawn with the same mesh, and replaced by a cheap scripted ending (blend to the stable orientation after the creep phase) when it must settle in a few seconds. Estimated 2 to 3 days (mode plumbing, camera, sound, no dice-dice collisions, a "Gomboc" entry in Look, tests), with the honesty caveat that the shortened ending is not the real dynamics.
* Recommendation: ship as a tool page only (this artifact), not as a Look shape. Revisit the app special-case mode only if the owner wants a joke die and accepts one-die-only and a time-lapse.
