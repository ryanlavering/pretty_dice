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

## Fix candidate (phase 2) and why it is NOT pushed
Candidate, only above the default gravity (default feel and seeded outcomes untouched): `sleepTimeLimit` 1 s -> 0.1 s plus solver iterations 10 -> 20 (at roll start and live in `setGravity`). Spec `tests/dice-twitch.spec.mjs` (4 seeded rolls per case, 1 d20 and a 9-die pile, gravity 0.14 and 1, counted in sim steps): old code fails all 4 cases (24-115 hops, last hop 3.5-5.5 s, peak speed 2.4-17 u/s), candidate has 0 hops in all 4. physics.spec (23) and flick/dice-twitch pass.

BUT `gravity.spec.mjs` "a flick throws the same arc at low, default and high gravity" fails with the candidate: apex at 2x is 0.48 of the default apex (needs 0.75-1.25). Passes on unchanged code; passes with the iteration bump reverted (sleep-time change alone). So 20 iterations changes the launch/contact at 2x (the 10-iteration solver adds energy the arc calibration relies on). Per the lane rules the golden/physics spec is not re-recorded; stopped here.

Options:
1. Sleep-time only (passes gravity.spec). Cuts hops a lot (pile 0/6 bad at 1x in the sweep; lone die at 1x still 17 hops in one of 4 rolls, last at 2.5 s). Relax the spec for the lone die accordingly.
2. Sleep-time + iterations 20 applied only once all dice are slow (iterations stay 10 during flight/impact, 20 when every die has speed < 1 u/s): should fix the lone die without touching the launch arc. Needs one more experiment.
3. Re-baseline the 2x apex in gravity.spec (owner decision; the old value rests on a solver artifact).
4. Sub-stepping: costly, not reliable alone.

Risk of sleeping at 0.1 s: a die asleep on a lean would freeze; sleeping dice wake on contact and in `setGravity`, lean/face checks are unchanged.
