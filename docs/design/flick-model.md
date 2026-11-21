# Flick model (PD-199)

Source: `flickVel(dx,dy,ms)` and `startRoll(launch,place,vel)` in `src/main.js`. Tuning constants (`FLICK_*`) sit right below `flickVel`.

## Before (PD-142.38.49 / .65, PD-169)

A swipe (dx,dy px over ms) gives `sp = clamp(hypot(dx,dy)/ms*11, 7, 30)` and unit direction `ux = dx/l`, `uy = -dy/l` (uy > 0 is up the screen).
With camera right `r` and forward `f` flattened to the table plane:

    dep = uy > 0 ? 0.55*uy : uy
    (vx,vz) = sp * (r*ux + f*dep)

So an up swipe always sent 0.55*uy toward the back wall, even a perfectly vertical one (depth 0.55*sp).
Launch height: `vy = 13 + 7*rng()`; the whole velocity and spin are scaled by `throwK = clamp(sqrt(g/34), .5, 8)` (PD-169: same arc at any gravity).

## After

    theta   = angle of the swipe from vertical (up)
    k(theta)= min(1, 0.55 * 2 * sin^2(theta))     // 0 at vertical, 0.55 at 45 deg, ~0.97 at 70 deg
    dep     = uy > 0 ? uy * k(theta) : uy          // down and sideways unchanged
    (vx,vz) = sp * (r*ux + f*dep)
    vy      = (13 + 7*rng()) * liftK(g)            // flicks only (shake / Roll button unchanged)
    liftK(g)= 1.25 * max(1, g/g_default)^0.12      // 1.25 at default and below, rising smoothly above
    then throwK(g) scales all of it as before.

At g = 2x realistic (slider top) liftK = 1.98 (1.58 relative to the new default); 1x realistic = 1.82; .25x = 1.54.

## Depth component sp*dep/sp (share of speed going 'in'), up flicks

| angle from vertical | old | new |
|---|---|---|
| 0 | 0.550 | 0.000 |
| 10 | 0.542 | 0.033 |
| 20 | 0.517 | 0.121 |
| 45 | 0.389 | 0.389 |
| 70 | 0.188 | 0.332 |

Side-to-side (r*ux) is unchanged. Aiming dead at the back wall remains impossible (accepted).
Feel is only judgeable on a real device: adjust `FLICK_DEPTH_AT_45`, `FLICK_DEPTH_MAX`, `FLICK_LIFT_BOOST`, `FLICK_LIFT_GRAV_EXP`.
