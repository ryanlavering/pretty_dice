# Render performance: diagnosis plan, quality ladder and the Lite question

Status: design proposal, 2026-11-14, written by Fable 5.2 at v4 head `0016920`. No measurements were taken for this doc. Every cost stated below is either quoted from PD-115 or an expectation to be measured; they are marked as such. It is written so that an Opus or Sonnet session can run it without the conversation that produced it.

Cards: PD-115 (clear epoxy cost), PD-142.10 (perf spike), PD-142.11 (quality ladder), PD-142.12 (Lite 2D fallback), PD-20.5 (nightly perf checks). Related: [v4-roadmap.md](v4-roadmap.md) section 2, [project-review-2026-11.md](project-review-2026-11.md), [testing.md](testing.md).

## Where things stand

- The perf lane never started (no `v4-perf` worktree, no `docs/design/perf-spike.md`). The roadmap's ladder is still a list of ideas.
- The one measurement on record is PD-115, from `scripts/profile.mjs` on software GL: clear epoxy costs about 4.5 times every other substrate per frame (one d20: 235 ms against 50 ms; ten d6: 325 ms against 95 ms), adds two shader programs and doubles draw calls. One epoxy die in a mixed set makes the whole scene pay.
- Playtest 1 found that software-GL rolls take 10 to 40 s, and that this drove most of the token cost per turn. So render speed is also a cost of every agent playtest and of the 30-minute test suite.
- The 4.0 contents in the project review list "render-on-demand and a pixel-ratio cap". The review proposes deferring Lite; the owner has not decided.

## What the code does (index.html at `0016920`)

| Line | What | Why it matters |
|---|---|---|
| 902 | `new THREE.WebGLRenderer({antialias:true})` | MSAA is fixed at context creation. It cannot be a runtime rung; it can only be chosen at boot. |
| 903 | `setPixelRatio(Math.min(devicePixelRatio,2))` | Up to 4 times the fragments of ratio 1. |
| 904 | `shadowMap.type = PCFSoftShadowMap` | The shadow map is redrawn every frame by default, even when nothing moves. |
| 796 to 840 | `onBeforeCompile` injects the atlas, bump and paint shader into every die material | Per-fragment cost on every die, in every pass that draws it. |
| 1171 | Epoxy: `transmission: .35+.65*clarity`, `thickness: 2`, `side: DoubleSide` | Triggers three.js's transmission pass. |
| 2433, 2558 | `renderer.setAnimationLoop(loop)`; the loop always runs and always renders | Idle spin in showcase keeps every frame live. With spin paused and dice settled, frames are still drawn. |
| 2443 | `world.step(1/60, dt, 4)` | Up to 4 physics substeps per frame; CPU-bound with many dice. `MAXDICE` is 24, so the roadmap's "50 dice" case cannot occur. |

three.js is 0.160.0 (`vendor/README.md`). What I expect of that version, to be confirmed by reading `renderTransmissionPass` in `vendor/three/build/three.module.js` before relying on it:

- When any visible material has `transmission > 0`, the opaque scene is drawn a second time into a transmission render target, with mipmaps, and with MSAA samples when the context is antialiased.
- That target is sized to the drawing buffer, so it scales with pixel ratio squared.
- Double-sided transmissive meshes get an extra back-face draw.
- A resolution scale for that target (`transmissionResolutionScale`) arrived in a later three.js release than 0.160. If so, the cheapest lever needs either a library upgrade or a local patch.

## Hypotheses, ranked by expected payoff

Each has one experiment. Run them in this order and stop early if H1 and H5 explain the cost.

| # | Hypothesis | Experiment | Lever if true |
|---|---|---|---|
| H1 | The transmission pass (a second full scene draw at full resolution, MSAA, mipmaps) is nearly all of the 4.5x. | Profile epoxy with `transmission` forced to 0 but everything else unchanged. If the frame drops to the solid figure, H1 holds. | Smaller transmission target; or a cheap see-through look; or full transmission only when the dice are at rest. |
| H2 | `DoubleSide` adds a further draw of every epoxy die. | Epoxy with `FrontSide`. | Front side only below the top tier (the far-face numbers are lost; check the look). |
| H3 | The injected shader is the main per-die cost for non-epoxy dice. | Ten d6 with the injected shader stubbed to a flat colour. | Smaller atlas, fewer texture reads, or skip bump at lower tiers. |
| H4 | Shadows are redrawn every frame while nothing moves. | Settled roll: `shadowMap.autoUpdate=false` against the default. | Update shadows only on frames where a die or light moved. |
| H5 | Idle frames are pure waste when spin is paused or a roll has settled. | Count `renderer.info.render.frame` over 2 s in each idle state. | Render on demand (below). |
| H6 | Pixel ratio dominates on real phones. | Ratio 1, 1.5, 2 at fixed canvas size. | Ratio cap per tier. |
| H7 | Physics, not rendering, limits big rolls on slow CPUs. | 24 dice under CDP CPU throttle 4x and 6x; time `world.step` separately from `renderer.render`. | Substep cap, sleep thresholds. |

## Step 1: the spike (PD-142.10)

Extend `scripts/profile.mjs`; do not write a second harness. It already syncs with `gl.readPixels` so frame times are real, and it runs under the test lock (`sh scripts/with-test-lock.sh node scripts/profile.mjs`), which matters because other lanes load the machine.

- Matrix: dice 1, 10, 24; epoxy share none, one die, all; pixel ratio 1, 1.5, 2; shadows soft, basic, off; CPU throttle 1x, 4x, 6x. Not the full product: vary one axis at a time around a baseline of ten d6 at ratio 2.
- Record per cell: steady frame ms (median of 20), first frame ms (shader compile), `renderer.info` calls and triangles, programs, and JS heap.
- Split each frame into physics, JS, and render time.
- Add the H1 to H4 switches as `__pd` test hooks or URL parameters read only by the profiler, not as user settings yet.
- Software GL exaggerates fill cost and hides GPU-side limits. Read ratios, not absolute times. Finish with one headed run on a real GPU and a short table the owner fills in from a phone (a `?perf=1` frame-time readout built on the PD-141 lag monitor, `window.__lag`, is enough).

Output: `docs/design/perf-spike.md` with the tables, which hypotheses held, and a ladder order backed by numbers. Post the summary on the board for the owner before building.

## Step 2: render on demand (do this first; it needs no spike)

One `invalidate()` function sets a flag; the loop renders only when the flag is set or something is animating.

Things that must keep frames coming (the list to audit against the loop body at line 2433):

- A roll in progress, `restoring` (held dice being put back), the settle assist.
- `camBlend` or `topBlend` not yet at their targets.
- Idle spin above a small threshold, or the user dragging.
- Effects (`updateFx`, `updateRolling`) and the lean-ring pulse (`pulseLeans`), which animates for as long as a die leans.
- Any design change, slider drag, rebuild, resize, theme change, the thumbnail lab.

Risks and how to contain them:

- A missed invalidation shows a stale frame. Route every state change through `save()`/`applyLook()`-level hooks rather than sprinkling calls, and add a debug mode that tints the frame when it was drawn by the fallback heartbeat (one frame per second) and not by an invalidation.
- The test API must keep working: `__pd.pause`, `resume`, `renderOnce` (line 2839) drive most specs.
- New spec: with spin paused and no input, the frame counter does not advance over one second; it advances after each of: a slider change, a roll, a hold tap, a resize.

Open product question: showcase spins by default, so on-demand rendering saves nothing there. Options: leave it, or drop showcase to 30 fps after some seconds without input. See owner decisions.

## Step 3: cheaper epoxy (PD-115)

Pick from the spike's numbers. The candidates, cheapest to build first:

1. **Full transmission only at rest.** While dice move, epoxy uses the cheap look; when the roll settles (or in showcase), it switches to full transmission. Motion hides the difference. Watch for a visible pop at settle; a short cross-fade may be needed.
2. **Smaller transmission target.** Half resolution is usually invisible through a rough, tinted die. Needs the three.js upgrade or patch noted above; an upgrade must be checked against the vendored copy, the CDN URL at line 202, `tests/shader.spec.mjs` and the visual baselines.
3. **Cheap see-through look.** Alpha blending, the attenuation colour as a tint, the environment reflection kept, back faces drawn first. No second scene pass. This is the "Balanced" and "Lite" tier look.
4. **Fewer things in the pass.** If only the mat needs to show through the die, other dice can be left out of the transmission draw.

Acceptance for PD-115 is already written: epoxy within 2x of solid on the profile, or a documented reason.

## Step 4: the ladder (PD-142.11)

One settings control, "Graphics: Auto / High / Balanced / Lite". Under it, a small object the renderer reads:

```js
gfx = { tier, pixelRatio: 2|1.5|1, shadows: 'soft'|'basic'|'off', epoxy: 'full'|'atRest'|'cheap', msaa: bool, fpsCap: 60|30 }
```

- **Boot-time choice:** `msaa` (fixed at context creation), and the starting tier from WebGL2 presence, the renderer string (SwiftShader, llvmpipe), `deviceMemory`, core count and the boot frame probe.
- **Runtime step-down:** when the PD-141 lag monitor sees frame time over budget for a sustained window (start with the 75th percentile over 3 s above 33 ms), step down one rung. Never step up in the same session. Store the tier reached per device (`prettydice.gfx`) and offer "try High again" in settings.
- Rung order comes from the spike. Expected: render on demand, epoxy at rest, pixel ratio 1.5, shadows basic, epoxy cheap, pixel ratio 1, shadows off, 30 fps.
- Individual toggles sit under an "Advanced" sub-label, following the owner's advanced-controls rule (three or more may collapse).
- Tests: a spec per rung that the setting changes what it claims (`renderer.getPixelRatio()`, `shadowMap.type`, material `transmission`), and one that a forced slow frame stream steps down exactly one rung.

## Step 5: Lite 2D fallback (PD-142.12)

Recommendation: defer the full Lite roller to 4.1 and ship a narrow version in 4.0 only if the spike shows the bottom rung is still unusable on software GL.

What makes a narrow version cheap: the games engine never rolls dice, so a 2D roller can feed it values from the seeded RNG and all five games work unchanged. The notation parser, the bag, sets and the roll log are model code too. What Lite cannot keep is the physics roll as the source of results; say so in the UI ("Lite mode: results come from the random number generator").

Narrow version: when there is no WebGL2, show the result chips, the log and the game panels over a flat mat, with design pictures drawn by the existing offscreen picture path if it works without GL, or plain coloured chips if not. No second settings UI.

## Owner decisions needed

1. Showcase idle: keep full frame rate while spinning, or drop to 30 fps after a pause in input?
2. Is a three.js upgrade acceptable in 4.0 if it is the cheapest epoxy fix? It touches the vendored copy and the visual baselines.
3. Lite: defer to 4.1 (recommended), or keep the narrow version in 4.0?
4. Is "epoxy looks simpler while the dice are moving" acceptable as the default, or only below High?

## Handoff

| Step | Model | Notes |
|---|---|---|
| 1 Spike | Sonnet to extend the profiler and run it; Opus (or Fable) to read the tables and set the rung order | Run under the test lock on a quiet machine; post `NEED integrator: test bed` first. |
| 2 Render on demand | Sonnet, with a careful review of the invalidation list | Touches the loop: post `TOUCHING index.html loop/renderer`. The navigation lane is active in `index.html`. |
| 3 Cheaper epoxy | Opus for the choice and the look check, Sonnet for the build | Needs owner decisions 2 and 4. Screenshots of full against cheap epoxy for the owner. |
| 4 Ladder | Sonnet | After 1 to 3. |
| 5 Lite | Sonnet, after owner decision 3 | |

Lane: perf (`v4-perf`, not yet created). The owner's rule is two to three active lanes, so this starts when one finishes.

## Done when

- `docs/design/perf-spike.md` exists with measured tables and a ladder order.
- Idle with spin paused draws no frames; the spec proves it.
- PD-115's acceptance criterion is met or its exception is documented.
- A software-GL roll of ten d6 is measurably faster than at `0016920` (record both numbers in the spike doc), since that is what playtests and the suite pay for.
