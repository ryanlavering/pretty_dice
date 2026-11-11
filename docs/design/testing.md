# Automated testing

Status: agreed design (2026-11-10). Umbrella card: PD-20.

The app stays zero-install for users. Testing adds a dev-only `package.json` with Playwright Test, pinned to **1.64.1** (Chromium revision 1248, which is already in the local Playwright cache).

## Principles

- **Deterministic or it doesn't count.** Every test seeds `Math.random`, starts with empty localStorage, uses a fixed viewport at DPR 1, loads `?libs=local` (no network) and stubs audio. Physics runs in fixed 1/60 s steps with the render loop paused.
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

The `?test=` hooks in `index.html` are moved into specs and then deleted, so test code no longer ships to users. Ad-hoc checks use `node scripts/probe.mjs '<js>'`, which boots the page and prints the result of evaluating the snippet.

## Tiers

| Tier | File | Contents | Runs |
|---|---|---|---|
| Smoke/UI | `tests/smoke.spec.mjs` | clean boot; Randomize, Roll, Showcase, shape buttons; Ctrl+Z/Y; persistence across reload; PNG export (download event, dimensions); save/load design via the file chooser; layout toggle; phone viewport with pinch and flick | push |
| Logic | `tests/logic.spec.mjs` | notation parsing; JSON round-trip and clamping of bad input; palette migration; 200 randomizes reach every option without errors; per shape: face count, opposite faces sum to N+1, valid hull | push |
| Physics | `tests/physics.spec.mjs` | seeded rolls of every shape plus set7 and a 24-dice set: all settle within a time limit, stay on the table and in the tray, and the reported result equals the up face; lean rate under a threshold; regression scenarios (PD-59 snagging, PD-62 leans, PD-88 stacks later) | push |
| Visual | `tests/visual.spec.mjs` | about 15–20 fixture designs (`tests/fixtures/designs/*.json`) rendered at a fixed camera and frame, canvas-only screenshots compared with `toHaveScreenshot`; plus baseline-free checks (canvas not blank or black, brightness in range, die centred) | push (Docker only) |
| Offline/build | `tests/offline.spec.mjs` | `build-static.py` output opened via file:// with all network blocked; CDN blocked → falls back to `vendor/` | push; live-CDN check nightly |
| Perf/leaks | `tests/slow/perf.spec.mjs` | 100 randomizes don't grow live geometries or textures; frame-time limit with 24 dice (PD-58) | nightly |
| Fairness | — | chi-square uniformity over about 600 rolls per die. **Deferred.** | — |

## Visual baselines: Docker only

Software WebGL output depends on the machine, so baselines are created and compared only inside `mcr.microsoft.com/playwright:v1.64.1-noble`, both locally and in CI. `npm run test:docker` / `npm run test:update` run the suite in that image. A plain `npm test` on the host skips the screenshot comparisons (it still runs the baseline-free render checks), so a host run never writes or fails on baselines. Baselines live in `tests/visual.spec.mjs-snapshots/`, and baseline changes are reviewed as PNG diffs in the PR.

## Commands

- `npm install`, once.
- `npm test`: fast tiers on the host.
- `npm run test:docker`: fast tiers in the pinned image, including visual. This is what CI runs.
- `npm run test:update`: refresh visual baselines (in Docker).
- `npm run test:slow`: perf.
- `npx playwright show-report`: HTML report with diffs and traces.

The Playwright config starts `python3 -m http.server 8124` (8123 is left for the dev server).

## CI (GitHub Actions)

- `.github/workflows/test.yml`: on pushes to any branch and PRs to `main`, run the fast tiers in the Playwright container. Upload `playwright-report/` and `test-results/` on failure.
- Nightly cron: slow tier plus the live-CDN check.

## Workflow

Run `npm test` (or `test:docker` when rendering changed) before moving a card to Needs Review. Cards that intentionally change the look update baselines in the same branch.
