# Automated testing

Status: agreed design (2026-11-10). Umbrella card: PD-20; sub-cards PD-20.1 (physics), PD-20.2 (visual), PD-20.3 (offline), PD-20.4 (CI), PD-20.5 (perf), PD-20.6 (fairness, deferred).

The app stays zero-install for users. Testing adds a dev-only `package.json` with Playwright Test, pinned to **1.64.1** (Chromium revision 1248, which is already in the local Playwright cache).

## Principles

- **Deterministic or it doesn't count.** Every test loads `?seed=N`, which switches the app's own RNG (`rng()`: looks, throws, drop orientations) to `mulberry32(N)`. Seeding `Math.random` alone is not enough, because three.js draws on it for object UUIDs a timing-dependent number of times; audio and particle jitter stay on `Math.random`. Tests also start with empty localStorage, uses a fixed viewport at DPR 1, loads `?libs=local` (no network) and stubs audio. Physics runs in fixed 1/60 s steps with the render loop paused.
- **Invariants over goldens.** Physics and logic tests assert properties ("every die settles on the table, result = the face pointing up"), not recorded trajectories, so tuning the physics doesn't churn the tests. Only the visual tier stores baselines.
- **Every test fails on `pageerror` or `console.error`.** A shared fixture enforces this.
- **Every bug-fix card adds a regression test.**

## Test API (`window.__pd`)

This replaces `window.__dice` and the in-page `?test=` hooks. It is always present and costs nothing when unused.

- `state`, `designToJSON`, `loadDesign`, `randomize`, `buildDice`, `applyLook`, `startRoll`, `undo`/`redo`, `parseNotation`, `SHAPES`, `exportImage`
- `pause()` / `resume()`: stop or restart the rAF render and physics loop.
- `renderOnce()`: draw one frame.
- `setView({az, el, zoom})`: set the camera.
- `simRoll({maxSteps})`: start a roll and step it to rest synchronously. Returns per-die `{label, up, pos}`, plus `settled`, `simT`, `leans` and `retries`.
- `memory()`: returns `renderer.info.memory` (geometries and textures).
- `reseed(n)`, `step(n)`, `leans`, `rollT`, `fx`/`triggerFx`/`updateFx`, `rerollLeans`, `rig`, `TABLE_Y`: used by the physics specs.

## Fixtures (`tests/helpers/app.mjs`)

- `app`: a fresh page per test (empty localStorage). `app.open({seed, query, storage})` boots it. For UI and anything that touches persistence.
- `shared`: one booted, paused page per worker. `shared.reset(seed)` exits any roll, restores the boot design and reseeds, so tests do not depend on run order (checked by running the physics spec with one worker). Booting is most of a test's cost, so state-only specs should use this; it took the physics spec from 4.0 to about 1 minute.
- Both fail the test on `pageerror`, `console.error` or a dialog.

### Projects and the browser split (PD-20.7)

`playwright.config.mjs` has two fast projects. `fast-state` holds the specs that use only `shared` (`STATE_SPECS`: logic, physics). `fast-ui` holds everything that boots fresh pages (smoke, `boot.spec.mjs`). Each project gets its own workers, so its own browsers. This matters because, in a browser that also holds the paused shared page, the next new page's `getContext('webgl2')` blocks for about 18 s. On a busy runner, that showed up as boots hanging at `waitForFunction` and a `context.close` timing out. Many specs in 4.1 mix `shared` and `app` tests, so the fixtures do not enforce the split; instead the `shared` page runs in its own browser process (`_sharedPage` in `tests/helpers/app.mjs`), which removes the stall wherever the spec lives. A new state-only spec may go into `STATE_SPECS` for the faster project grouping. `--project='fast-*'` runs both projects.

### Browser flags

Tests run with software WebGL (`--use-angle=swiftshader`) and `--disable-accelerated-2d-canvas`. Without that second flag, Chrome rasterises the 2D canvases (atlases, filigree, substrate textures) through SwiftShader. That was the main cost of the suite: one filigree build took about 60 s. On a 4-CPU Docker run, the fast tiers took 20 minutes with 3 failures before the change and 6.8 minutes with none after. `scripts/probe.mjs` uses the same flags.

The `?test=` hooks in `index.html` are moved into specs and then deleted, so test code no longer ships to users. Ad-hoc checks use `node scripts/probe.mjs '<js>'`, which boots the page and prints the result of evaluating the snippet.

## Tiers

| Tier | File | Contents | Runs |
|---|---|---|---|
| Smoke/UI | `tests/smoke.spec.mjs` | clean boot; Randomize, Roll, Showcase, shape buttons; Ctrl+Z/Y; persistence across reload; PNG export (download event, dimensions); save/load design via the file chooser; layout toggle; phone viewport with pinch and flick | push |
| Logic | `tests/logic.spec.mjs` | notation parsing; JSON round-trip and clamping of bad input; palette migration; 200 randomizes reach every option without errors; per shape: face count, opposite faces sum to N+1, valid hull  (undo history and determinism across page loads are in `tests/boot.spec.mjs`, on fresh pages) | push |
| Physics | `tests/physics.spec.mjs` | seeded rolls of every shape plus set7 and a 24-dice set: all settle within a time limit, stay on the table and in the tray, and the reported result equals the up face; lean rate under a threshold; regression scenarios (PD-59 snagging, PD-62 leans, PD-88 stacks later) | push |
| Bag | `tests/bag.spec.mjs`, `tests/bagbrowser.spec.mjs`, `tests/bagsets.spec.mjs` | bag storage, import/export and clash renaming; the shelf, Modified/Save/Revert, Randomize draft; sets, quick roll, the roll log, the set editor (dirty guard, long press, unique names). Cheap ones are tagged `@quick`, boot-heavy ones `@slow` | push (`@quick` via `npm run test:quick`) |
| Visual | `tests/visual.spec.mjs` | about 15–20 fixture designs (`tests/fixtures/designs/*.json`) rendered at a fixed camera and frame, canvas-only screenshots compared with `toHaveScreenshot`; plus baseline-free checks (canvas not blank or black, brightness in range, die centred) | push (Docker only) |
| Offline/build | `tests/offline.spec.mjs` | `build-static.py` output opened via file:// with all network blocked; CDN blocked → falls back to `vendor/` | push; live-CDN check nightly |
| Perf/leaks | `tests/slow/perf.spec.mjs` | 100 randomizes don't grow live geometries or textures; frame-time limit with 24 dice (PD-58) | nightly |
| Fairness | — | chi-square uniformity over about 600 rolls per die. **Deferred.** | — |

## Visual baselines: Docker only

Software WebGL output depends on the machine, so baselines are created and compared only inside `mcr.microsoft.com/playwright:v1.64.1-noble`, both locally and in CI. `npm run test:docker` / `npm run test:update` run the suite in that image. A plain `npm test` on the host skips the screenshot comparisons (it still runs the baseline-free render checks), so a host run never writes or fails on baselines. Baselines live in `tests/visual.spec.mjs-snapshots/`, and baseline changes are reviewed as PNG diffs in the PR.

## Commands

- `npm install`, once.
- `npm test`: fast tiers on the host (`--project='fast-*'`).
- `npm run test:docker`: fast tiers in the pinned image, including visual. This is what CI runs.
- `npm run test:update`: refresh visual baselines (in Docker).
- `npm run test:slow`: perf.
- `npx playwright show-report`: HTML report with diffs and traces.

The Playwright config starts `node scripts/serve.mjs 8124` (8123 is left for the dev server).

## CI (GitHub Actions)

- `.github/workflows/test.yml`: on pushes to any branch and PRs to `main`, run the fast tiers in the Playwright container. Upload `playwright-report/` and `test-results/` on failure.
- Nightly cron: slow tier plus the live-CDN check.

## Speed (PD-178)

Goal: full suite from 24-26 min to 15 min or less. Measured on the 16-core dev machine (software WebGL), 2026-11-19.

**Finding.** A Chromium page on swiftshader burned CPU even when nobody was looking: an unpaused app page drew ~8 frames/s at 960x600 and used ~11 cores (about one core-second per frame; the 2048 px PCF shadow map, MSAA, transmission); a *paused* page still cost ~7 cores (the compositor). Two workers already saturated the box, so more workers gave nothing (102-test sample: 2 workers 357 s, 4 workers 359 s, load 32).

| Lever | Measured | Kept? |
|---|---|---|
| Workers 2 -> 4 before any other change | 357 s -> 359 s (sample), no gain: CPU bound | no, not alone |
| `?lite` test render profile (below) | sample at 2 workers 357 s -> 195 s; idle page 44 -> 2 CPU-s per 4 s | yes |
| Workers after `?lite` | 2: 195 s, 4: 149 s, 6: 160 s, 8: 165 s (load 12 / 23 / 44 / 53) | 4 is the knee, now the local default (`PD_WORKERS` overrides; CI stays 1 per 4-core runner) |
| Chromium flags: `--disable-gpu-vsync` (worse: 22 CPU-s boot), `--num-raster-threads=1`, `--in-process-gpu`, `--disable-features=...`, `--use-gl=angle` | no gain in boot CPU or idle CPU | no |
| `--disable-gpu-compositing` | paused page 30 -> 0 CPU-s, but boot +0.9 s and a running page 44 -> 50; moot once `?lite` makes idle ~0 | no |
| Viewport 480x300 | 3x fps for the same CPU (cost scales with pixels) but breaks layout specs | no |
| CI `--shard` matrix | 3 shards in `.github/workflows/test.yml` | yes |

**`?lite`** (src/main.js, read only from the URL, production defaults unchanged): no MSAA, no shadow pass, and the animation loop does not draw (`renderOnce()` and the boot frames still draw, so pixel readers such as `canvasStats` work; physics, state and DOM are unchanged). `app.open()` and the shared page add it by default (`tests/helpers/app.mjs`). Opt out with `app.open({ lite: false })`, or `PD_NOLITE=1` for the whole run. Specs on the real loop: `golden.spec` (frame hashes, screens), `flick.spec` (reads pointer physics against real frames). Anything that compares real rendered pixels or relies on rAF frames having been drawn should pass `lite: false`.

No coverage was removed by this work: no test was deleted, demoted or tagged `@slow`. (Boot-count merging and pruning were not needed to pass 15 min; candidates if more is wanted: owner-comments 30 tests / 190 s, bagbrowser 22 / 205 s, games-story-ui 8 / 161 s.)

**Result.** Full suite `npm test -- --retries=0`: 490 passed, 12 skipped, 0 failed in 12.8 min (baseline 23.7-26 min, 475 passed; the first lite run was 12.7 min with 6 failures, fixed as described above). Other sessions' runs add load, so a quiet machine should be a little faster.

**Recipe.** `npm test` (4 workers, lite). Sharding by hand: `npm run test:shard -- 1/3`. CI: `--shard=N/3` matrix, `retries` as configured.

## Workflow

Run `npm test` (or `test:docker` when rendering changed) before moving a card to Needs Review. Cards that intentionally change the look update baselines in the same branch.
