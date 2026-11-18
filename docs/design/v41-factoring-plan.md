# 4.1 factoring plan

Status: plan, 2026-11-18 (4.1 lane, branch `v4.1`). Owner intent: "start off by factoring the code and locking in an all-green pre- and post-factor regression set (that also gives us a solid A/B comparison point later)." Baseline and evidence: [v41-baseline.md](v41-baseline.md). Rule for every step: **no behaviour change**; the app stays runnable after every commit; the golden set (`tests/golden.spec.mjs`, `scripts/golden-build.mjs`) must stay identical.

A successor session continues from this file: the step table at the bottom is the source of truth for what is done.

**Handoff state (2026-11-18, opus agent a85af5ad stopped on the integrator's request; mechanical steps continue on a Sonnet agent):** S1-S8 committed and verified (last: the S8 commit, `src/bagmodel.js`). Tree clean. **Next: S9** (`#main-src` -> `src/main.js`), then S10, then gate 3 / post-factor proof (full suite x2 `--retries=0`, the pre vs post table in v41-baseline.md). Gotchas so far:
- **Never edit the tree while a spec run is going**: the dev server serves the working tree live, so a run started on step N silently tests a mix of N and N+1 (happened once in gate 1). Prepare the next step only after the run ends, or in a scratch copy.
- `bindState(state)` (S6) is called on the same line that creates `state`; marble palettes read `liveState.stone`. Anything new in substrates that needs app state goes through that setter, never an import of main.
- The lag hooks reassign nine function bindings (`buildDice=L.wrap(...)` etc., section "lag monitor hooks"): none of those has been moved; a module cannot export a reassignable binding, so if one moves, wrap it inside its module or keep a main-owned wrapper.
- `rng` stays in main (reassigned by `reseed`); modules take `r` arguments.
- `extract.mjs --header` adds its own `// `; pass the header text without a leading `//` (S8 needed a one-line fix).
- S7 (`src/app.css`): the dev bootstrap injects the main module only after the sheet's load/error event; the builds inline the CSS byte-identically (build sha unchanged by S7).
- **S9 notes (not started):** a module loaded by `src` resolves imports against `src/`, so `./src/x.js` becomes `./x.js` in main.js; build-static.py must put src/main.js text (imports rewritten back to `./src/`) into the module tag so `src_bundle()` and the artifact/offline outputs stay byte-identical to S8 (that is the equivalence proof). `tests/sound.spec.mjs:116` reads `MAT_HARD`/`RING`/`GLASS_FM` from `index.html` text: in S9 point it at `src/main.js` (or do S10 together). `scripts/factor/*` read `#main-src` from index.html; extract.mjs already handles a `src/main.js` main file, check deps.mjs/prune.mjs. A dynamically inserted `src` module can fail to load (404), unlike inline text: the boot watchdog still reports no progress after 10 s.

## 1. Current structure (v4 @7503b05)

`index.html` is 3,179 lines / 436 KB:

| Lines | Bytes | What |
|---|---|---|
| 7-239 | 53 KB | the app CSS (one `<style>`) |
| 240-260 | 2 KB | `<!--BOOTSTRAP-->` loader: CDN probe, import map, then injects `#main-src` as an inline module. The builds replace this block. |
| 263-311 | | boot screen markup + boot-progress script (`__bootStage`, watchdog) |
| 312-370 | | lag monitor (`window.__lag`), classic script |
| 371-498 | ~30 KB | the page markup (pane, dock, sheets, drawer) |
| 499-3177 | ~330 KB | **the main module** `<script type="text/plain" id="main-src">`: one ES module scope with **533 top-level declarations** |

`games/*.js` (the rules engine) is the only code already in modules: pure, node-testable, imported as `pd-games` through the import map; `build-static.py` inlines it (`games_bundle()` for the artifact, data: URLs for the offline file).

Sections of the main module (from its own `/* ---------- */` markers) with the cross-section coupling measured by a scope analysis (eslint-scope over the module; "uses" = distinct top-level names it reads or writes from other sections):

| # | Section | KB | Uses names from other sections | Used by sections |
|---|---|---|---|---|
| 1 | utils (mulberry32, rng, pick, range, V, signs) | 0.7 | 1 (THREE) | 13 |
| 2 | polyhedra: hull, SHAPES, assignLabels | 3.2 | 5 | 10 |
| 3 | number atlas: FONTS, makeAtlas | 5.3 | 1 | 7 |
| 4 | geometry: buildGeometry, filigree | 9.3 | 3 | 2 |
| 5 | material: shader injection, makeMaterial, U | 11.2 | 1 | 3 |
| 6 | substrates & palettes | 5.4 | 3 (state.stone) | 7 |
| 7 | scene: renderer, lights, table, camera, rig | 2.7 | 2 | 13 |
| 8 | state, persistence, notation parser | 9.7 | 9 | 22 |
| 9 | inclusion models + buildDice/applyLook/randomize | 20.2 | 51 | 12 |
| 10 | undo/redo | 7.5 | 8 | 11 |
| 11 | UI wiring (pane controls) | 22.7 | 56 | 7 |
| 12 | design file JSON | 4.4 | 14 | 6 |
| 13 | dice bag model | 4.7 | 3 | 4 |
| 14 | live vs saved design | 15.4 | 32 | 9 |
| 15-16 | bag browser, design pictures (thumbnails) | 21.3 | 45 | 9 |
| 17 | bag sets, roll log, dock | 46.3 | 57 | 10 |
| 18 | 'New' callouts | 16.8 | 13 | 0 |
| 19 | interaction (drag, flick) | 5.9 | 15 | 8 |
| 20 | physics roll | 4.7 | 11 | 13 |
| 21 | per-die design, holds, roll flow, result reading | 22.0 | 104 | 9 |
| 22-23 | sound synthesis + backends | 26.6 | 13 + 15 | 8 + 2 |
| 24 | nat 20 / nat 1 effects | 14.7 | 50 | 6 |
| 25 | thumbnail lab (dev tool) | 13.9 | 15 | 2 |
| 26-27 | lag hooks, boot sequence ("go") | 5.2 | 25 + 43 | 2 |
| 28-29 | games UI, hidden info, render loop, test API | 46.4 | 34 + 161 | 4 |

Global mutable state: `state` (one `const` object, mutated everywhere, persisted), plus about 60 top-level `let`s (`dice`, `bag`, `game`, `held`, `rolling`, `settled`, `world`, `bodies`, `history`, `thumbs`, `rng`, ...) read and written across sections. Events are wired inline (`$('id').onclick=...`, `addEventListener`) next to the code they drive; DOM is reached by id through `$()`.

## 2. Coupling problems

1. **One scope for everything.** Any function can read or write any of the ~60 mutable globals; the late sections (21, 24, 28-29) touch 50-161 names from up to 25 sections. There is no way to load, test or reason about one area alone; the specs can only drive the whole app.
2. **Reassigned function bindings.** The lag hooks (section 26) do `buildDice=L.wrap('buildDice',buildDice)` for nine functions (`buildDice, randomize, restore, loadDesign, importBag, renderDesignPicture, updateThumbs, startRoll, audioInit`). An imported binding cannot be reassigned, so a function that moves to a module must be wrapped where it is defined (or the wrap kept in main around a main-owned name).
3. **`rng` is reassigned** (`reseed`, section 29 assigns it): modules that need randomness take an `r` argument (most already do: `assignLabels(faces, labels, rng)`, palettes `pal(r)`), never import `rng`.
4. **Hidden reads of `state`** from data tables (e.g. `SUBSTRATES.marble.pal` reads `state.stone`).
5. **Specs coupled to the file layout:** `tests/sound.spec.mjs` reads `MAT_HARD`/`RING`/`GLASS_FM` from `index.html` text; `tools/sound-audition.html` mirrors those tables by hand; `build-static.py` requires the `import * as GAMES from 'pd-games';` line and the `main-src` tag. These are updated (not weakened) when the code moves.
6. Sections were appended by feature, so names are often declared far from their section header (section 9 "inclusion" also holds `buildDice`, `applyLook`, `randomize`).

## 3. Target layout

```
index.html          markup, boot screen, lag monitor, bootstrap loader (unchanged contract)
src/app.css         the app CSS (was the head <style>)
src/main.js         the main module (what is left of #main-src: state, scene, UI wiring, roll flow, games UI, test API)
src/util.js         mulberry32, pick, range, PHI, V, signs
src/polyhedra.js    vertex sets, hull, SHAPES, assignLabels
src/atlas.js        FONTS, PIPS, makeAtlas
src/geometry.js     buildGeometry, filigree, slerp
src/material.js     shader chunks, makeUniforms, U, makeMaterial
src/substrates.js   hsl, SUBSTRATES, STONES, palettes, pickPaint
src/bagmodel.js     bag file model: slug/unique names, parseBag (pure)
src/sound-*.js      later: synthesis tables and voices (context-injected)
games/              unchanged
```

Rules for `src/` modules (checked by the build script, which refuses anything else):

- ES modules with `export const|function|class` only: **no exported `let`/`var`** (live bindings would not survive bundling), no default export, no `export *`, no top-level `await`, **no import cycles**.
- External imports only as the exact lines main already uses (`import * as THREE from 'three';` ...); they are dropped when bundled and the closure sees main's binding.
- No module reads main's state directly; a module that needs it gets it as an argument or through a small setter called once by main (`setStateRef(state)`), documented in the module header.
- Leaf utilities first, state and event wiring last.

## 4. How the dev server, the builds and the CSP keep working

- **Dev / test server** (`python3 -m http.server`, `scripts/serve.mjs`): the main module imports `./src/x.js` natively. `#main-src` is injected as an inline module, whose base URL is the page, so `./src/x.js` resolves to `/src/x.js` with either import map (`?libs=local|cdn`). Modules import `three`/`cannon-es` through the same import map, so there is one three.js instance.
- **Artifact build** (`build-static.py --artifact`, CSP `script-src 'unsafe-inline'` + CDNs, no data: scripts): a small bundler in `build-static.py` (same technique as the existing `games_bundle()`, no new dependency) replaces the `import {..} from './src/x.js'` lines with `const {..} = __pdm['x'];` and puts each module, in import (depth-first) order, in a closure `__pdm['x'] = (() => { ...; return {exports}; })();` at that spot. Native ESM evaluates dependencies before the importer in the same depth-first order, so evaluation order is unchanged; the rules above make destructured imports equivalent to live bindings.
- **Offline file** (`build-static.py`): the same inline bundle (file:// cannot fetch `./src/`).
- **CSS**: `<link rel="stylesheet" href="src/app.css">` in the head; both builds replace it with the same `<style>` text.
- Checks: `tests/artifact-csp.spec.mjs` (artifact boots under the CSP and plays), `tests/offline.spec.mjs` (file:// with network off), `scripts/golden-build.mjs` (sizes; changes explained), the golden spec, and a no-bundler-needed dev boot (every spec).

Rejected: a real bundler (esbuild/rollup) — a new dev dependency and a build step for the dev server, for no gain at this size; concatenating script fragments — keeps the single scope, so it moves text without reducing coupling.

## 5. Tools (scripts/factor/)

- `deps.mjs <file>`: per-section coupling (the table above), `--section N` for names, `--globals` for free names.
- `extract.mjs <repo> <name> <a-b>[,c-d] [--dry] [--header "..."]`: moves those lines of the main module (index.html's `#main-src`, or `src/main.js` once it exists) into `src/<name>.js`, adds `export` to its column-0 declarations, imports what it needs from earlier `src/` modules and the externals, and adds the import line to main. It refuses (exit 2) when the block reads a name that stays in main, when main writes a block name, when a `let` would be shared, or when the block has top-level statements; it lists initialisers that call something at load for review.
- `prune.mjs <repo>`: drops names main no longer uses from its `./src/` import lines.
- `sec.sh <file> '<marker>' '<next marker>'`: line range of a section by its comment markers.
- Install their parser once outside the repo: `npm i --no-save --prefix /tmp/pdfactor acorn eslint-scope`.

Manual edits needed so far (each keeps behaviour): substrates read `state.stone` (marble palette) through `bindState(state)`, called right after `const state=` is created; `LOG_MAX` moved from main's `STORE` line into the bag model; the dev bootstrap waits for `src/app.css` to load before injecting the main module (the main module reads layout at start; the builds inline the CSS, so they do not need the wait).

## 6. Steps (each: one commit, app runnable, verified)

Verification per step: `tests/golden.spec.mjs` (identical) + the specs that touch the area + `tests/artifact-csp.spec.mjs` and `tests/offline.spec.mjs` when the build changes; `node scripts/golden-build.mjs` (size change explained in the commit). Pre-factor baseline first (v41-baseline.md). Stage gates after S3, S7 and S10: broader set (smoke, logic, physics, shader, bag, bagbrowser, notation, games-ui, sound, offline, artifact-csp, golden) and `git merge origin/v4`.

| Step | What | Risk | Verify | Status |
|---|---|---|---|---|
| S0 | build-static.py: src/ bundler with the rule checks; no module yet (output identical) | build only | golden-build sha identical, csp+offline | done a13c088 |
| S1 | `src/util.js` (mulberry32, pick, range, PHI, V, signs; `SEED`/`rng` stay in main) | low | golden, logic, physics | done afced1d |
| S2 | `src/polyhedra.js` | low | golden (rolls, atlas), logic per-shape, physics | done 4414884 |
| S3 | `src/atlas.js` | low (canvas fonts) | golden atlas hashes, shader, logic | done 64b2ecb |
| gate 1 | broader set + merge origin/v4 | | | done after S6: 137 passed (note: S7's CSS edit landed in the tree while it ran, so it covered a mix of S6 and S7); origin/v4 had nothing new |
| S4 | `src/geometry.js` | low | golden rolls/frames, shader, relief-rule | done 075df3e (with S5) |
| S5 | `src/material.js` | medium (shader strings) | golden frames, shader, smoke | done 075df3e |
| S6 | `src/substrates.js` (`state.stone` via setter) | medium | golden looks, logic randomize | done (S6 commit; golden, logic, shader, artifact-csp, offline: 29 passed) |
| S7 | `src/app.css` (link + build inlining) | medium (cascade order) | golden screens (DOM boxes), nav/phone specs | done (S7 commit): `<link>` at the old `<style>` spot; builds byte-identical to S6 (inline_css restores the same `<style>` text); dev bootstrap injects the main module after the sheet's load/error |
| gate 2 | broader set + merge origin/v4 | | | partly: S7's own set (golden screens, nav-*, phone-*, boot, offline, csp; 69 passed) and S8's set ran green; the full broader list was NOT rerun after S7/S8; origin/v4 had nothing new (7503b05) |
| S8 | `src/bagmodel.js` (pure bag file model) | low | bag, bagsets, bagbrowser | done (S8 commit): `LOG_MAX` moved from main's STORE line into the module; also the pure canonical-design helpers (sortKeys, canonD, hashStr, thumbKey). golden, bag, bagsets, bagbrowser, bagsave-commit, logic, csp, offline: 86 passed; builds +650 bytes vs S7 (one module wrapper) |
| S9 | `#main-src` -> `src/main.js` (bootstrap injects `src` instead of text) | medium (boot path, line numbers) | boot-screen, bootlag, offline, csp, all | todo |
| S10 | sound tables `MAT_HARD/RING/GLASS_FM` -> `src/sound-tables.js`, sound.spec reads the module | low | sound | todo |
| gate 3 / post-factor proof | full suite x2 `--retries=0`, golden identical, builds | | | todo |

Later (not in this pass; needs explicit context objects, design first): sound engine, physics roll, bag UI, sets/dock, games UI. The approach there: one `app` context object (`state`, `dice`, scene handles, getters for the mutable lets) passed to `init(app)` functions per area, extracted one area per commit with the same verification.
