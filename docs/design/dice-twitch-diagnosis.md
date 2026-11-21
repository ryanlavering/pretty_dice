# Dice twitch at higher gravity (PD-195)

Owner report: at Gravity 0.14x or more, dice sit on the mat and twitch before settling, independent of bounciness and friction.

## Setup
Harness: scripted `__pd` page (`?lite`, seeded), `startRoll()` then fixed `world.step(1/60)` steps, per-step position, speed, angular speed, sleepState recorded. Everything is counted in sim steps, not wall time. Physics: cannon-es, `world.step(1/60, dt, 4)` in the live loop, `step(1/60)` in tests; solver 10 iterations, contact stiffness 1e7 / relaxation 3, dice `sleepSpeedLimit .1`, `sleepTimeLimit 1`, damping .04/.1 (raised to .25/.5 once rollT > 3.5 s).

## Findings
A lone d20 at rest on the mat (seed 1, last 50 steps):

| gravity | what happens |
|---|---|
| default (0.0436x, -34 u/s2) | die goes to rest within ~2.4 s, no hops |
| 0.14x | one to a few hops, up to 24 hops over 4 rolls |
| 0.5x, 1x | a limit cycle: creep, then a kick every 21 steps (0.35 s), identical each time |

The kick at 1x: speed 0.042 u/s creep (x drifts 0.001/step), the die is SLEEPY (state 1) for ~0.3 s, then in one step vy = -0.98, |v| = 2.6 u/s, |w| = 3.25 rad/s, y dips 0.03 u (4% of the radius) below rest, bounces, and the cycle repeats. Every kick wakes the die, so the 1 s sleep timer never completes. The hops only stop when the live loop raises damping at rollT > 3.5 s (last kick at 3.3-3.5 s in every run, sleep ~1 s later at 4.4-4.6 s). The 0.35 s "settled" detector (speed < .5 for .35 s) fires between kicks, so the result is read while the die is still twitching.

Mechanism: each step gravity adds g*dt to the contact velocity (13 u/s at 1x, 1.8 at 0.14x, 0.57 at default, against a sleep limit of .1). The 10-iteration Gauss-Seidel solver leaves about 0.3% of that as residual, which is the 0.042 u/s creep (scales with g*dt: ~0.006 at 0.14x, ~0.002 at default). The creep slides the die across a change of contact set (vertex/edge), the solver then over-corrects, and the die hops. At default gravity the residual is small enough that the sleep timer (1 s) completes first. Things that are NOT the cause: bounciness/friction (hop is a solver artifact, repeats with friction off), penetration/contact stiffness (1e9 stiffness no better), the sleep speed limit (raising it to 1 does not help), the frame/step gap in the live loop (tests step a fixed 1/60 and still twitch). Sub-steps help (g*dt shrinks) but are expensive and not reliable alone.

## Variants tried (9-die pile 6d6+3d20, 6-8 seeds, bad = still hopping after rest, in sim time)
| variant | 0.14x | 0.3x | 1x | 2x |
|---|---|---|---|---|
| base | 6/6 | 6/6 | 6/6 | 6/6 |
| 20 iterations | 3/6 | 1/6 | 0/6 | 1/6 |
| 30 iterations | 1/6 | 1/6 | 1/6 | 1/6 |
| 4 sub-steps + 20 it | 2/6 | 2/6 | 2/6 | |
| micro-velocity damping | no effect | | | |
| sleepTimeLimit .3 | 6/6 | 6/6 | 6/6 | |
| sleepTimeLimit .2 | 2/6 | 4/6 | 4/6 | |
| sleepTimeLimit .1 | 1/6 | 0/6 | 1/6 | 1/8 |
| sleepTimeLimit .1 + 20 iterations | | | | 0/8 |

(The harness metric is loose: even at default gravity big piles show late hops in the same harness, which the owner does not report.)

## Fix (option 2, applied)
Only above the default gravity (default feel and seeded outcomes untouched): `sleepTimeLimit` 1 s -> 0.1 s, and solver iterations 10 -> 20 only while every die is slow (|v|^2+|w|^2 < 1), chosen each step by `tuneSolver()` in `src/main.js` (live loop, `simSteps`, `__pd.drift`). Flight, launch and impact keep 10 iterations, so the arc in gravity.spec is unchanged (the first attempt, 20 iterations always, dropped the 2x apex to 0.48 of default and failed that spec).

Spec `tests/dice-twitch.spec.mjs` (4 seeded rolls per case, counted in sim steps via `__pd.drift`): old code 24-115 hops per case (last hop 3.5-5.5 s); fix: lone d20 at 0.14x 3 hops (last 1.2 s, peak 1.2 u/s), all other cases 0 hops. Thresholds: lone die <= 3 hops and last hop < 2.5 s, pile <= 8 hops and < 3 s.

Default gravity (not changed, report only): the same harness shows hops there too (lone d20 17 hops, last at 8.4 s; 9-die pile 27 hops, last at 6.7 s, firstRest 4.6 s). Quieting it would change default-gravity behaviour and seeded outcomes, so it is left for an owner decision.
