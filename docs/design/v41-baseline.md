# 4.1 regression baseline (pre- and post-factor)

Status: **pre-factor baseline recorded** 2026-11-18: runs 11 and 12 at `d028972`, both 397 passed / 0 failed / 10 skipped (spec-level skips), `--retries=0`, 2 workers, load < 2 at start. Post-factor proof: section at the end (4.1 lane). Plan: [v41-factoring-plan.md](v41-factoring-plan.md).

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
| artifact-csp:19 | `rollsUsed` 0 right after `simRoll()` | the artifact page has no `?seed` (see run 8 below for the real cause) | first fix (a poll) was wrong, replaced after run 8 |

Runs 6-10 (quiet machine, baseline candidates) each found one more rare race:

| Spec | Symptom | Cause | Fix |
|---|---|---|---|
| owner-comments:110 | Custom controls hidden after tapping a die shape then Custom | a die shape button waits out the 250 ms double-click window (tap = replace, double = add) before it applies; the spec clicked Custom inside that window and the pending tap then overrode it. A person tapping two shapes within 250 ms sees the same; reported on the board as a low-priority UX note | wait for the dock box to show the tapped die |
| artifact-csp:19 (run 8) | `rollsUsed` stayed 0 for 30 s | the first fix was wrong: the unseeded artifact page sometimes leaves a die **leaning**, and a game waits for a lean re-roll before it counts the roll (trace: `leans: 1`) | `simRoll({ rerolls: 6 })`, as every other game spec does |
| bagbrowser:87 (tile drag) | tile dropped in the wrong slot | each finished design picture re-renders the tiles (`renderBag`); one landed mid-drag. The app postpones the picture pass while the user is active, but a pass already in flight still re-renders after its `await` (reported on the board, low priority) | wait for the picture pass to finish before dragging |

Also seen but not changed (documented for later): `tests/artifact-csp.spec.mjs` (second test) and `tests/offline.spec.mjs` both run `build-static.py`, which writes the same `dist/pretty-dice-offline.html`; with 2 workers they could race. Not observed failing.

## Changes to specs and test tooling (pre-factor)

- `tests/helpers/app.mjs`: `shared.reset()` re-boots a lost page, restores the viewport, closes leftover overlays.
- `tests/helpers/app.mjs`: ... and re-boots when the Games setup changed.
- `tests/games-resume.spec.mjs`: own page (it reloads).
- `tests/flick.spec.mjs`: stepped clock; up/down test paused.
- `tests/pane-scroll.spec.mjs`: waits for the room switch's frame.
- `tests/artifact-csp.spec.mjs`: `simRoll({ rerolls: 6 })`.
- `tests/owner-comments.spec.mjs`: :110 waits for the shape tap to apply.
- `tests/bagbrowser.spec.mjs`: :87 waits for the picture pass before the drag.
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
| 5 | a55bc59 | 12.5 (lagging average from run 4; CPU idle) | 397 passed, 0 failed, 10 skipped | 17.8 min |
| 6 | a55bc59 | < 2 | 396 passed, 1 failed (owner-comments:110) | 18.1 min |
| 7 | 364e59c | 1.75 | 397 passed, 0 failed | 17.6 min |
| 8 | 364e59c | 1.97 | 396 passed, 1 failed (artifact-csp:19) | 18.1 min |
| 9 | 9e5c3b6 | 1.91 | 397 passed, 0 failed | 17.7 min |
| 10 | 9e5c3b6 | 1.87 | 396 passed, 1 failed (bagbrowser:87) | 18.0 min |
| **11** | **d028972** | 1.96 | **397 passed, 0 failed**, 10 skipped | 17.8 min |
| **12** | **d028972** | 1.80 | **397 passed, 0 failed**, 10 skipped | 19.4 min |

**Pre-factor baseline = runs 11 + 12 at `d028972`.** Golden set compared green inside both runs; `node scripts/golden-build.mjs` at `d028972`: artifact 938,441 bytes, offline 3,751,769 bytes, both identical to the recording. `index.html` at the baseline: 3,179 lines, 435,909 bytes.

Timing, run 0 vs run 5: wall 52.2 -> 17.8 min; summed test time 85.5 -> 26.6 min. Slowest files run 5: bagbrowser 183 s, owner-comments 182 s, smoke 135 s, bagsets 108 s, nav-dock 94 s, golden 93 s, new-callouts 92 s, roll-framing 69 s (run 0: bagbrowser 691 s, roll-framing 622 s, owner-comments 567 s).

The 10 skipped tests are skips in the specs themselves (`test.skip`/fixme, e.g. games-turn-ui shut the box, ship captain, bunco), unchanged from v4.

## Pre vs post factor

Post-factor pair at `4c3e11e` (S1-S10 done), `PD_PORT=817x npm test -- --retries=0`, 2 workers, same command as the baseline:

| Run | Commit | Load before | Result | Time |
|---|---|---|---|---|
| post 1 | 4c3e11e | ~19 (other lanes' runs on the box; queued on the test lock) | 397 passed, 0 failed, 10 skipped | 26.0 min |
| post 2 | 4c3e11e | ~19, started right after post 1 | 397 passed, 0 failed, 10 skipped | 19.6 min |

Caveat: the machine was NOT quiet (load 19-37 from other sessions), so these are not the "load < 2" runs the baseline used. The pass counts are the evidence (a loaded box tends to add failures, not remove them); the times are not comparable. The golden spec (inside both runs) is green: same golden set as the pre-factor recording. A third run on a quiet box would give comparable times; not done.

| | Pre (`d028972`) | Post (`4c3e11e`) |
|---|---|---|
| index.html lines | 3,179 | 272 |
| src/main.js lines | (in index.html) | 2,190 |
| other modules (lines) | - | util 10, polyhedra 58, atlas 57, geometry 126, material 158, substrates 58, bagmodel 51, sound-tables 7, app.css 231 |
| total lines (html+src) | 3,179 | 3,218 |
| artifact build | 938,441 B | 941,754 B (+3,313) |
| offline build | 3,751,769 B | 3,755,082 B (+3,313) |
| passed / failed / skipped | 397 / 0 / 10 | 397 / 0 / 10 |
| wall time | 17.8 / 19.4 min (quiet) | 26.0 / 19.6 min (loaded) |

Build growth is the nine closure wrappers for the modules (`__pdm[...] = (() => {...})()`); S9 itself left both builds byte-identical to S8 (sha1 aff75a26 / 496505d4), which is the proof the boot path move changed nothing in the built files. `tests/golden/build.json` is deliberately NOT updated: it still records the pre-factor sizes, so `golden-build.mjs` reports the +3,313 byte wrapper delta as the one explained difference (update it only when the owner accepts the factoring).

### After merging origin/v4 (f4cac79) into v4.1, at `b5e7536`

The 4.0 fixes since 7503b05 (showcase rig, roll framing and flick bias, chips, Design pane Filigree/Showcase markup, PD-142.38.67 title centering) were re-applied by hand in `src/main.js`, `src/app.css` and the `index.html` markup (merge commits e1978bf, f0dfa95). Check: a line diff of a pure-v4 artifact build (843e915) against the merged v4.1 artifact showed only factoring differences (module wrappers and header comments, `liveState` for the stone palette, LOG_MAX moved).

A/B golden: the golden set was re-recorded on a throwaway tree = pre-factor `d028972` + `git merge origin/v4` (monolithic index.html, clean merge), then v4.1 compared against it: all 9 golden tests pass. boot frame hashes and the screen DOM boxes changed versus the old recording on purpose (4.0 changes); rolls, looks, atlas and notation are unchanged. `tests/golden/build.json` now records that tree's sizes (artifact 942,585; offline 3,755,913); v4.1 is +3,313 bytes each (the same module wrappers).

| Run | Commit | Load before | Result | Time |
|---|---|---|---|---|
| merged 1 | b5e7536 | ~13 (other lanes) | 408 passed, 1 failed (bagbrowser:87 tile-drag reorder), 10 skipped | 20.3 min |
| merged 2 | b5e7536 | ~13 | **409 passed, 0 failed**, 10 skipped | 20.3 min |

bagbrowser:87 passed 4 of 4 when repeated alone (`--repeat-each=4`); it is the same test that flaked in pre-factor run 10 (v4 has since changed it to wait for the picture pass), so it is read as the known timing flake, not a factoring regression. The count is 409 = v4's 400 + the 9 golden tests. Times are close to the quiet-box baseline (17.8 / 19.4 min) even at load ~13.

## 4.0.1 port

Merged `origin/v4` (tag v4.0.1 @9ded17c) into v4.1 at `c1499c9`. Docs, tests and backlog merged cleanly; `index.html` kept as v4.1's thin shell and the five `index.html` hunks (PD-154 `gameDiceFixed` and its three call sites, PD-157 split early return in `gameOnSettled`) were hand-applied to `src/main.js`. All the names live in main.js, so no bindState or module injection was needed.

Results: `tests/hotfix-401.spec.mjs` 8/8, artifact-csp (artifact and offline builds boot) green. Golden set passes unchanged: the hunks alter no recorded value, so nothing was re-recorded (`tests/golden/*.json` as before). `golden-build.mjs`: build sizes are +3,861 bytes each versus the recording (was +3,313: +548 is the hunk text; the rest is the module wrappers), sha differs as expected; `build.json` not updated. Full suite `--retries=0` twice: 417 passed, 10 skipped, 0 failed (21.1 and 21.0 min).

## S10 factoring (PD-168)

Moved: the 'sound: everything is synthesised with Web Audio' and 'sound backends (PD-114)' sections (188 lines) to `src/sound.js`. Function bodies are byte-identical except where they read main's reassigned roll variables: `placing`, `rolling`, `settled`, `bodies`, `dice` are read through `live.*` getters. `main.js` calls `initSound({state, camera, TABLE_Y, $, save, live})` once, at the place the section used to run (that call also runs the old trailing settings-wiring block). Shared state stays single-source: `state`, `camera`, `$`, `save` are main's own objects, never copies. Two wrinkles found by the artifact build, both fixed without changing behaviour: the lag-monitor hook reassigns `audioInit` (an import is const), so main holds `let audioInit=audioInitM` and tells the module through `wrapAudioInit`; and `_ip`, a scratch vector shared with the collision hook, stays in main.

Not extracted (stopped per the plan, each is entangled with roll state rather than self-contained): physics roll (about 45 outside names, including `world`, `placed`, `rolling`, `topHold` and ~35 of its own names used by holds, games and the room), nat 20 / nat 1 effects (lean UI and `droppedDice` shared with the roll code, `labOn` from the loop), inclusion (`mesh`, `M`, `dice`, `bag`, ~40 outside names), thumbnail lab (`labOn` is read by the main loop). Each needs a state-object redesign first, not a move.

Validation: behavioural golden (`tests/golden.spec.mjs`) unchanged, no re-record; artifact CSP and offline builds boot; physics, logic, hold, sound, tingles, new-callouts, whoopsie, face-selfcheck, gravity, grammar, games-story, smoke, boot, roll-framing, flick: 163 passed, 2 load flakes (face-selfcheck yahtzee, golden atlas) that pass alone. `tests/golden/build.json` re-recorded at the end of S10.
