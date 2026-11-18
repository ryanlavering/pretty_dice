# 4.1 regression baseline (pre- and post-factor)

Status: in progress, 2026-11-18 (4.1 lane). Plan: [v41-factoring-plan.md](v41-factoring-plan.md).

Definition: the full suite with `--retries=0` on a quiet machine passes completely, twice in a row, at one recorded commit, plus the golden set (`tests/golden.spec.mjs`, part of the suite) and `node scripts/golden-build.mjs`.

Command: `PD_PORT=8161 npm test -- --retries=0` (2 workers, the config default).

## Where the flakes came from (diagnosis, 2026-11-18)

Run 0 at `7503b05` (v4 head, CP26 green with retries: 380 passed, 8 flaky): `--retries=0`, 2 workers: 383 passed, **5 failed**. Each was traced to a cause; none was an app bug.

| Spec | Symptom | Cause | Fix |
|---|---|---|---|
| games-turn-ui:117 (craps) | `shared.reset` threw `Cannot use 'in' operator ... in undefined` | `games-resume.spec` **reloaded the shared worker page**; every later shared test in that worker ran on a reloaded, unpaused page with the earlier tests' localStorage | games-resume gets its own page; `shared.reset()` re-boots a page that lost `__pdBoot` |
| nav-tabs:30 (phone dock chips) | 90 s timeout on a click | when it ran right after nav-tabs:20, the **Bag view left open** by :20 covered the drawer button (reproduced alone, 1 worker); in run 0 also an 88 s main-thread freeze (below) | `shared.reset()` closes overlays a test left open (Bag view, card menu, drawer, Full view) and restores the 960x600 viewport |
| physics:178 (watchdog) | 90 s timeout in one `renderOnce()` | **hidden GPU backlog** (below): 70-80 s in `getProgramInfoLog` for two tiny MeshBasic programs; reproducible in-file with 1 worker on a quiet machine, 0.5 s alone | `--disable-accelerated-2d-canvas` |
| offline:22 (CDN blocked) | 60 s boot timeout | the same backlog plus 2-worker contention during boot | same |
| die-design-menu:29 (short tap holds) | tap did not hold the die | not reproduced alone or in-file; did not recur in runs 1-6 after the fixes above (most likely input handled late during a GPU stall) | (none needed) |

**The hidden GPU backlog.** With software GL (`--use-angle=swiftshader`), Chrome also rasterises every 2D canvas in the swiftshader GPU process. The app builds big 2D canvases (the number atlases, with blur filters) on every `buildDice`. That work is asynchronous: a paused page doing `reset` + `buildDice` + three `simRoll`s made **zero WebGL calls** (counted by patching the context) yet left **4-8 s** of GPU-process work per test; the next synchronous WebGL call (a shader link status, `readPixels`, `getImageData`) waits for all of it. With two workers both GPU processes run ~7 cores each on this machine, so the backlog grew to 70-90 s freezes. Measured with a `readPixels` drain at the start of each physics test: 3-12 s per test before, ~20 ms with `--disable-accelerated-2d-canvas` (CPU raster). Test-environment only; the app is unchanged. (Real GPUs do not have this problem.)

Runs 1-4 (after the fixes above; the suite now took 17 min instead of 52) exposed the next layer, all test problems:

| Spec | Symptom | Cause | Fix |
|---|---|---|---|
| games-ui:4, games-phone:43, games-turn-ui:117 | Yacht round did not advance; Liar's Dice opened instead of Yacht; two bets after one click | the **Games setup** (game, player count, bot seats, options) is a module variable saved to `localStorage`, outside `pd.state`, so `shared.reset()` kept the previous test's two players / bot / game | `shared.reset()` re-boots the page from empty storage when the saved setup differs from the booted one |
| flick:44 (up/down) | mean 'down' speed 2.7, 3.9, 3.9 against > 4 | (1) the spec busy-waited the drag time, stretched under load (slower swipe); (2) the live loop drew on the app RNG between steps a timing-dependent number of times (random part of the throw) | clock stepped instead of busy-waiting; loop paused for the up/down test (now reads 8.5-9.6) |
| pane-scroll:12 (Play) | `#shapes [data-id=d20]: 30 -> 0` | entering a room resets the pane scroll on the **next animation frame** (`setPane`); with software GL a frame takes ~300 ms, so the reset landed after the spec had scrolled (traced with a `scrollTop` setter hook: the zeroing came from setPane's rAF, not from the tap) | wait two frames after the room switch. Not an app bug: a person cannot scroll and tap within one frame |
| artifact-csp:19 | `rollsUsed` 0 right after `simRoll()` | the artifact page has no `?seed`; now and then a die rests cocked and the roll is reported a few live frames later | `expect.poll` on the report (30 s) |

Also seen but not changed (documented for later): `tests/artifact-csp.spec.mjs` (second test) and `tests/offline.spec.mjs` both run `build-static.py`, which writes the same `dist/pretty-dice-offline.html`; with 2 workers they could race. Not observed failing.

## Changes to specs and test tooling (pre-factor)

- `tests/helpers/app.mjs`: `shared.reset()` re-boots a lost page, restores the viewport, closes leftover overlays.
- `tests/helpers/app.mjs`: ... and re-boots when the Games setup changed.
- `tests/games-resume.spec.mjs`: own page (it reloads).
- `tests/flick.spec.mjs`: stepped clock; up/down test paused.
- `tests/pane-scroll.spec.mjs`: waits for the room switch's frame.
- `tests/artifact-csp.spec.mjs`: polls for the roll report.
- `playwright.config.mjs`: `--disable-accelerated-2d-canvas`.
- New: `tests/golden.spec.mjs` + `tests/golden/*.json`, `scripts/golden-build.mjs` + `tests/golden/build.json`.
- No assertion weakened, nothing quarantined.

## Golden set (A/B)

| File | What |
|---|---|
| notation.json | `parseNotation` (plain and strict) and `fmtNotation` for 45 inputs incl. errors; `keepSum` |
| looks.json | 3 seeded randomizes for 6 seeds: design JSON, round trip through `loadDesign` |
| rolls.json | every shape x 2 seeds (two rolls each: results, simT, leans, final body poses) + 4 custom notations |
| atlas.json | pixel hashes of 6 number/pip/tip atlases (bump and mask) |
| boot-*.json | 3 fresh boots: boot look, first roll, a rendered frame hash, live geometries/textures |
| screens-*.json | DOM of Play, Design, Bag view, Games at 390x740 and 1280x800: every id'd element (tag, classes, shown, box, own text, value) and the shown buttons |
| build.json | artifact and offline build byte sizes and sha256 prefix |

Recorded at `020101a` (machine-specific hashes: record and compare on this machine). Compared twice with 2 workers: identical. Left out as nondeterministic: a frame of the spinning showcase (depends on wall time before `pause()`), the lag toast text.

## Runs

| Run | Commit | Load before | Result | Time |
|---|---|---|---|---|
| 0 | 7503b05 | ~6 (falling, after CP26) | 383 passed, 5 failed, 10 skipped | 52.2 min |
| 1 | a13c088 | ~8 (lagging average, CPU idle) | 394 passed, 3 failed (flick:44, craps:117, games-ui:4) | 17.2 min |
| 2 | a13c088 | ~13 (lagging, from run 1) | 393 passed, 4 failed (flick:44, games-phone:43, craps:117, pane-scroll:12) | 17.2 min |
| 3 | 15d573e | ~15 (lagging) | 396 passed, 1 failed (artifact-csp:19) | 17.8 min |
| 4 | cee3284 | lagging | 396 passed, 1 failed (flick:47) | 17.8 min |
| 5 | **a55bc59** | 12.5 (lagging average from run 4; CPU idle) | **397 passed, 0 failed**, 10 skipped | 17.8 min |
| 6 | **a55bc59** | < 2 (waited for it) | running | |

Timing, run 0 vs run 5: wall 52.2 -> 17.8 min; summed test time 85.5 -> 26.6 min. Slowest files run 5: bagbrowser 183 s, owner-comments 182 s, smoke 135 s, bagsets 108 s, nav-dock 94 s, golden 93 s, new-callouts 92 s, roll-framing 69 s (run 0: bagbrowser 691 s, roll-framing 622 s, owner-comments 567 s).

The 10 skipped tests are skips in the specs themselves (`test.skip`/fixme, e.g. games-turn-ui shut the box, ship captain, bunco), unchanged from v4.

## Pre vs post factor

(filled in at the end)
