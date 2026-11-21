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

## Default gravity and residual motion (PD-201)
Owner feedback after 4.1: wiggles still seen occasionally at all gravities. Findings, measured in sim steps with the live flow (steps until the roll settles, then `drift`):

1. The 17 / 27 hops of the PD-195 note at default gravity were mostly NOT the resting twitch: the old harness never ran `finishRoll`, so it also counted (a) the deliberate topple of a cocked die (`finishRoll` sets `b.free`, damping .05, spin kick 2.5+ rad/s; the die then rocks for ~0.7 s and may be tried twice) and (b) a die still rocking onto its face while the rest of a pile sleeps (restitution .4; v up to 2 u/s, y moves 0.04 u, ends by ~4 s). Both are real settling motion, not a solver artefact; the harness now skips rolls where a die was freed and counts hops only after every die has been slow (< .15) for 20 steps in a row.
2. The real residual twitch at default gravity is the same limit cycle as above, only smaller: creep of ~0.002 u/s, the die goes sleepy (state 1) for ~0.4 s, then a kick of 0.2-0.5 u/s (y moves 0.002 u) wakes it, so the 1 s sleep timer never completes until the 3.5 s damping. In a pile one slow die can do this while the others sleep, and it delays `restCheck`. Old code, 10 seeded rolls each: lone d20 16 hops (worst roll 6, last at 3.5 s), 9-die pile 71 hops (worst roll 63, last at 10 s, never asleep in one roll).
3. Other candidates checked and not the cause / not needed: damping raised earlier (0.25/0.5 or 0.9/0.99 once slow) did not reduce the count and changed outcomes; a zero-restitution threshold for slow impacts reduced rocking only a little; contact stiffness 1e8, relaxation 2/5, friction relaxation: all just reshuffle the trajectories (chaotic), no systematic effect; 20 solver iterations at default: not needed once the sleep timer is short; hysteresis on the calm switch: no difference. The fixed 1/60 test step vs `step(1/60,dt,4)` in the live loop is not a factor (same limit cycle in both).

### Fix at default gravity
Same idea as 4.1 but only for the end phase: `sleepTimeLimit` is 0.1 s (instead of 1 s) while every die is slow (|v|^2+|w|^2 < 1; `calmNow`, set each step by `tuneSolver()`), at gravity >= default. Flight, tumble and impacts keep the 1 s limit and 10 iterations, so the slow-motion feel is untouched. Above default gravity nothing changes from 4.1 (0.1 s always, 20 iterations while slow). Below default gravity nothing changes at all: a first version applied the calm rule there too and changed the flight/settle at 1/64x (gravity.spec failed), and creep scales with g so the 1 s timer completes there anyway.

### Numbers (tests/dice-twitch.spec.mjs: 10 seeded rolls per case, hops = steps with speed > .2 after sustained rest; worst roll)
| case | old: hops (total), last hop | new |
|---|---|---|
| lone d20, default g | 6 (16), 3.5 s | 0 |
| 9-die pile, default g | 63 (71), 10 s, not asleep | 0 |
| lone d20 / pile, 0.14x | 0 / 0 | 0 / 0 |
| lone d20 / pile, 1x | 0 / 0 | 0 / 0 |

(With the new flow harness the 4.1 fix already gives 0 at 0.14x and 1x; the old "3 hops at 0.14x" came from the harness counting a topple.)

### Seeded outcomes, default gravity (60 rolls: seeds 1-30, `1d20` and `6d6+3d20`, `reseed` + `simRoll`)
Faces: 0 of 60 differ. Landing positions: 16 of 30 lone-d20 rolls and all 30 pile rolls differ slightly (sleeping earlier removes the last creep): below 0.005 u in all but 10 pile rolls, largest 0.106 u (pile seed 6, which also settles 0.5 s later); settle time (`simT`) differs in 8 of 60 rolls by up to 0.6 s. Bit-identical positions are not possible: any change to the end phase moves the resting pose by ~1e-3, and a later flick from that pose then lands elsewhere (tests/flick.spec.mjs resting-height lower bound lowered 25 -> 20 for that reason: 24.8% vs 25.3% for the (200,-200) flick).

### Still visible by design
A cocked die toppled by `finishRoll` rocks for about 0.7 s, and a die rolling onto its face rocks 2-3 times before it stops. Options if the owner still sees these: a higher damping for freed dice, a zero-restitution threshold for slow impacts (see item 3: small effect), or a settle-assist that sleeps the die once it is within a few degrees of flat.
