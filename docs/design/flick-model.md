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

## Launch speed follows the gesture (PD-199 rework, owner review)

The first version kept `vy = 13 + 7*rng()` random, so launch height was uncorrelated with the flick. For organic gestures (touch flick, mouse drag-release; a flick needs > 60 px and < 450 ms) it now follows the gesture speed `sp` (same clamp as the horizontal speed):

    t  = clamp((sp - 7) / (30 - 7), 0, 1)
    vy = (FLICK_LAUNCH_MIN + t^FLICK_CURVE * (FLICK_LAUNCH_MAX - FLICK_LAUNCH_MIN)) * (1 + FLICK_JITTER*(2*rng() - 1)) * liftK(g)
         = (8 + sqrt(t) * 12) * (1 +- 5%) * liftK(g)
    then throwK(g) as before.

R key, Roll button and shake keep `vy = 13 + 7*rng()` exactly as before (no gesture minimum, no boost, never lazy; asserted in the spec). Horizontal speed, depth rule and liftK are unchanged.

Effective launch up-speed (u/s, before the +-5% jitter; throwK then scales by sqrt(g/34) at other gravities):

| gesture speed (px/ms) | sp | base | at default g (x1.25) | at 1x realistic (x1.82) |
|---|---|---|---|---|
| <= 0.64 (min) | 7 | 8.0 | 10.0 | 14.6 |
| 1.0 | 11 | 13.0 | 16.2 | 23.6 |
| 1.67 (typical: 200 px in 120 ms) | 18.3 | 16.4 | 20.5 | 29.8 |
| 2.2 | 24 | 18.3 | 22.9 | 33.3 |
| >= 2.7 (max) | 30 | 20.0 | 25.0 | 36.4 |

So effective min/max at default gravity is 10.0..25.0 (gestures) against 13..20 for R / Roll / shake; at 1x realistic 14.6..36.4. The typical flick (base 16.4) matches today's random mean 16.5 (20.6 with boost). Constants at the top of the flick code: `FLICK_SPEED_LO/HI`, `FLICK_LAUNCH_MIN/MAX`, `FLICK_CURVE`, `FLICK_JITTER`.

Slowest gesture check (sim, default gravity, 3 dice): slowest (70 px in 440 ms) gives mean per-die path 4.6 u (net 2.5 u), 1-2 bounces above 0.6 u (varies run to run), still airborne above 0.6 u up to 1.2 s; the median flick (200 px in 120 ms) gives path 12.7 u, net 4.7 u. The slowest is a short real throw, not a drop (die width ~1.6 u).

## Sensitivity re-fit (owner feedback on 3c8f9e3)

- **Hard flicks easier:** the launch height reaches `FLICK_LAUNCH_MAX` at gesture speed `FLICK_LAUNCH_SPEED_HI = 21` (about 1.9 px/ms, a typical-hard phone swipe) instead of 30 (2.7 px/ms). `t = clamp((sp - 7)/(21 - 7), 0, 1)`, `FLICK_CURVE = .7` (was `.5` on the 7..30 range), which keeps the lazy end as it was (1.0 px/ms still gives base 13.0) and makes the typical flick slightly stronger. The horizontal clamp (`sp` 7..30) is unchanged, so hard flicks still travel sideways as far as before; only the launch height saturates earlier.
- **Smaller gestures register:** `FLICK_MIN_PX = 30` (touch) and `FLICK_MIN_PX_MOUSE = 36` CSS px (were 60 for both), duration under `FLICK_MAX_MS = 450` as before. CSS px already follow the device pixel ratio. Anything slower than 0.15 px/ms reads as the minimum speed (base 8), so a 30 px quick flick is the lazy little roll.
- **Misfire guards (unchanged logic):** a flick needs `rolling`, button 0, one pointer, no pinch; a release under 8 px and 400 ms on a die is the tap-to-hold, a 500 ms press the die menu (it clears the flick), two pointers or a right-drag orbit never flick. The new minimum (30 px) is far above the 8 px tap/long-press slop.

| gesture speed (px/ms) | sp | base | default g (x1.25) | 1x realistic (x1.82) |
|---|---|---|---|---|
| <= 0.64 (min; a 30 px quick flick) | 7 | 8.0 | 10.0 | 14.6 |
| 1.0 | 11 | 13.0 | 16.2 | 23.6 |
| 1.67 (typical) | 18.3 | 18.3 | 22.9 | 33.4 |
| >= 1.9 (typical-hard) | 21 | 20.0 | 25.0 | 36.4 |

Minimum registering gesture: 30 px (touch) / 36 px (mouse) within 450 ms, e.g. 30 px in 80 ms.

## Spin follows the gesture (owner feedback on 923a37b)

Today's spin (R key / Roll / shake, unchanged): `angularVelocity = (R*50, R*50, R*50)` with `R` uniform in +-0.5, i.e. each axis uniform +-25, mean magnitude about 24 rad/s, then scaled by `throwK(g)`.

For gestures the same vector is multiplied by `spinScale`, on the same normalized speed as the launch mapping:

    tc        = clamp((sp - 7)/(21 - 7), 0, 1)^FLICK_CURVE
    spinScale = (FLICK_SPIN_MIN_FRAC + tc*(FLICK_SPIN_MAX_FRAC - FLICK_SPIN_MIN_FRAC)) * (1 +- FLICK_SPIN_JITTER)
              = (0.45 + tc*0.65) * (1 +- 22%)

| gesture speed (px/ms) | sp | tc | mean spin vs today (before jitter) |
|---|---|---|---|
| <= 0.64 (min) | 7 | 0 | 45% |
| 1.0 | 11 | 0.42 | 72% |
| 1.67 (typical) | 18.3 | 0.86 | 101% |
| >= 1.9 | 21 | 1 | 110% |

The +-22% jitter is on top of the already random direction of the spin vector, so the spin spread is wider than the +-5% launch-speed spread. Constants: `FLICK_SPIN_MIN_FRAC`, `FLICK_SPIN_MAX_FRAC`, `FLICK_SPIN_JITTER`.
