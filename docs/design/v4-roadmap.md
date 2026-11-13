# Pretty Dice v4 roadmap (draft for owner review)

Status: DRAFT, 2026-11-13. Branch `v4` (off main at the v3.0 release). Written from a sweep of the backlog (about 45 open cards), the render setup in `index.html`, and the v3 design notes. Nothing here is built yet. Perf numbers below are *expectations to be measured*, not measurements.

## Working mode for v4

- Integration branch `v4`; each feature on its own short branch off it, merged back to `v4`. `main` stays at 3.0 until the v4 release.
- Rapid feature work: per feature, write and run the tests for *that* feature (new spec or `@quick` tests). No full-suite run per feature or per push.
- Periodic regression: full `npm test` at checkpoints (proposal: after each themed batch below, and before any release), not per push. Remote CI runs as normal.
- Milestone publish routine (push, refresh :8123 and a "Pretty Dice v4 Dev" artifact) after each batch, not each card.

## 1. Quick wins and quality of life

**Settings pane organisation (the big one on mobile).** Today `#panes` is one long scroll: Shape, Custom set, then ~25 sliders. Proposal, cheapest first:
1. Collapsible sections (Look, Numbers, Physics, Sound, View) with open/closed state remembered; only one open at a time on phones.
2. **Basic / Advanced** switch: Basic shows the dozen sliders most people touch (colour/palette, finish, number size, spin); Advanced reveals the rest.
3. Slider upgrades: live value readout, tap the value to type it, double-tap to reset to default, a dot when a slider differs from default.
4. Search/filter box in the pane ("friction" jumps to the two friction sliders).
5. Phone: settings as a bottom sheet with a section tab strip, so the mat stays visible while you drag a slider (live preview is the point of most sliders).

**Small features, high value** (all roughly a day or less):
- Roll notation: advantage/disadvantage buttons, keep-highest/drop-lowest (`4d6kh3`), reroll 1s, exploding dice. Probably the best value per effort for tabletop players.
- **Hold dice** (tap a settled die to lock it; reroll the rest). Needed by Yahtzee-style games too. Overlaps PD-63 (tap to nudge/reroll).
- PD-137 reorder sets; PD-99-style one-tap clears; PD-125 nudge-back; PD-126 verify numbering order.
- PD-64 flick to roll; shake-to-roll on phones (devicemotion, opt-in); haptic tick on settle.
- PD-100 roll-feel presets (felt, wood, glass...: bundles of existing friction/bounce values, no new physics).
- PD-69 custom mat colour; PD-16 d24/d30; PD-18 relative sizes; PD-72 semi-random bounds.
- PWA: manifest + service worker so it installs and works with no wifi (game stores, tables in basements). We already have an offline single-file build, so this is mostly packaging.
- Share a design by link (design JSON compressed into the URL hash).
- Keyboard shortcut overlay (`?`).
- PD-19 phone/LAN access from WSL2 (dev convenience only).

**Backlog grooming** (no code): PD-52 (real sound samples) looks superseded by PD-114 and PD-132; PD-79/80/81/82/84/85/86/109 are cosmetic/rare and can move to a "Later" milestone so the board shows what v4 really is.

## 2. Performance and constrained devices

**Where the cost is (from the code and card PD-115):**
| Cost | Where | Expectation |
|---|---|---|
| Clear epoxy (transmission) | MeshPhysicalMaterial `transmission` + thickness | 4-5x per frame (PD-115); the worst offender, esp. with many dice |
| Pixel ratio up to 2 | `setPixelRatio(min(dpr,2))` | ~4x fragments on retina phones vs 1x |
| PCF soft shadows + MSAA | `shadowMap`, `antialias:true` | moderate, matter most on integrated GPUs |
| Bump/paint atlas shader | injected into every material | per-die cost, scales with dice count |
| Big rolls | cannon-es, many dice | CPU-bound on low-end phones |
| Always rendering | spin + loop | battery/heat even when nothing moves |
| No WebGL2 / software GL (SwiftShader, llvmpipe) | whole app | unusable; today no fallback |

**Plan: a quality ladder, auto-chosen and user-overridable.**
- *Detect:* WebGL2 present? renderer string (software GL), `deviceMemory`, cores, and a short boot frame-time probe. PD-141's lag monitor is the foundation for **runtime adaptation**: sustained frame time over budget steps down one rung; never steps back up mid-session without a prompt.
- *Ladder (each rung is cheap to implement, order by payoff):* (1) render on demand: stop drawing when dice are settled and spin is paused; (2) cap pixel ratio 2 → 1.5 → 1; (3) epoxy transmission → cheap see-through (alpha + env tint); (4) shadows soft → basic → off; (5) MSAA off; (6) smaller atlas/bump resolution; (7) physics substep and max-dice caps with a warning; (8) 30 fps cap.
- *Settings:* one "Graphics: Auto / High / Balanced / Lite" control; the individual toggles hide under Advanced.
- *Lite fallback with no usable GL:* a 2D roller (animated chips, same RNG and notation, bag, sets, log all still work). Fairness and tabletop use do not need 3D. This keeps the app useful on anything.
- *Measure first:* a perf spike before building the ladder: Chromium with `--disable-gpu` (SwiftShader) plus CDP CPU throttle 4x/6x, dice count 1/10/50, epoxy on/off, recorded as frame time and heap. This becomes PD-20.5 (nightly perf/leak checks) so regressions are caught. Real low-end phones should be tested by the owner at the end.

## 3. The major ticket: candidates

Seven ideas, then a recommendation. The two audiences in your brief: **tabletop players** (D&D, board games) and **anyone picking it up with no learning curve**.

1. **Characters (PD-73).** Per-character sets, sheet rolls (skills, saves, attacks), stat bonuses. Already designed (dice-bag-design phase 5). Strong for RPG players, invisible to everyone else.
2. **Games and scoring rules.** A *Games* picker: Yahtzee, Farkle, Pig, Bunco, Liar's Dice / Perudo, Shut the Box, Ship-Captain-Crew, Craps. Each is a small data-defined rule set: which dice, how many rolls, which dice can be held, a scorecard, turn order for 1-6 hot-seat players. Craps is a state machine (come-out roll, point, pass/don't pass, payouts with a play-money bankroll). Broadens the audience from RPG to *everyone with a board-game shelf*, and the 3D dice are the selling point.
3. **Table sessions (shared rooms).** Everyone at a remote table sees the same roll; DM can request a roll, make secret rolls, see player rolls. Needs networking (WebRTC plus a signalling service, or a tiny server): a real architecture step and a hosting decision.
4. **DM toolkit.** Initiative tracker, secret/hidden rolls, roll tables (d66, random encounter), grouped monster rolls, HP trackers. Pairs with 3, partly standalone.
5. **Stream / VTT overlay.** Transparent background mode (PD-21), embeddable in OBS or Foundry/Roll20/Discord. A good fit for the 3D dice but a different audience (streamers).
6. **Order real dice (PD-23).** Manufacturer-ready export; feasibility already done (PD-14). Strong story ("design it, then own it"), but depends on a manufacturing partner.
7. **Roll stats and fairness.** Histograms, streaks, "luck" view, tie into PD-20.6 fairness tests. Cheap, fun, good for trust.

**Recommendation.** v4.0 theme **"Game table"**: ship (2) Games with scoring plus (1) Characters, on top of the quick wins and the performance ladder. Rationale: Games is self-contained (no server), makes the app instantly useful to non-RPG people (matching "pick up and use immediately"), and forces the hold-dice and turn UI that characters also benefit from. Characters is already designed and keeps the RPG audience. Table sessions (3) plus DM toolkit (4) become **v5**, but see section 4: the playtest should tell us how urgent they are, and it may promote part of (3) into v4.

Decision needed from you: is Games the right headline, or do you want Characters to lead?

## 4. The agent D&D playtest

**Goal:** four Sonnet agents (one DM, three players) play a short session using Pretty Dice for all dice, using only the UI and the docs, and file bugs and missing-feature cards. The DM logs the session.

**Constraints and how we meet them:**
- *No source reading.* Agents get the running app (via a browser tool; looking at the rendered page, screenshots and the DOM that the UI exposes is fine) plus README, CHANGELOG, and the user guide (PD-140, **not written yet**: right now the docs are thin, so the guide is a prerequisite or the test measures our doc gaps, which is itself useful). Each agent's prompt says not to read `index.html` logic, `tests/`, or `scripts/`.
- *Only I can spawn agents.* Subagents cannot start subagents, so I (the main session) run the table: DM turn, then each player's turn, passing the narrative between them. That is an honest limit of the setup and it costs tokens per turn.
- *Parallel browsers.* Agents must not share one browser tab. Each player gets its own isolated browser instance.
- *Feedback capture.* Each agent writes findings in a structured form (what I tried, what I expected, what happened, severity, screenshot); I file them as cards under a parent card "PD-xxx Playtest 1", subordinate cards per finding, deduplicated.
- *DM log.* The DM agent keeps a session log file in `docs/playtests/2026-11-xx-session-1.md`.

**What we can already predict (and want to confirm):**
- *Players:* they roll on their own instance, so the DM cannot *see* a player's roll, only hear it reported. (Honesty problem, and slow.) Needs: hold/advantage notation, a character sheet with one-tap skills/attacks (characters), "roll for me and tell the table" log sharing.
- *DM:* needs hidden rolls, grouped monster rolls (`3 goblins attack`), initiative order, roll tables, and a log they can copy. None of it exists; the playtest should show which matters most.

**Cost note:** roughly six rounds, four agents, screenshots included, is a sizeable token spend, even on Sonnet. Proposal: cap it at about six rounds and ~20 agent turns each, with screenshots only on demand. Your call on the cap before I start. Best timing: after the settings reorg and a draft user guide, so the findings are about what v4 ships, not what is about to change.

## 5. Proposed order of work

| Batch | Contents |
|---|---|
| A. Foundations | Perf spike and render-on-demand; settings sections, Basic/Advanced, slider upgrades; roll notation (adv/dis, kh/dl); hold dice |
| B. Docs and playtest | PD-140 user guide with screenshots; run playtest 1; triage findings into the plan |
| C. Games | Rules engine (data-defined), scorecard UI, Yahtzee first, then Farkle, Pig, Craps, others |
| D. Characters | PD-73 per the existing design |
| E. Performance ladder | Auto quality tiers, Lite 2D fallback, PWA |
| F. Release | Full regression, docs, merge to main, tag 4.0 |

## Owner decisions (2026-11-13)
1. v4.0 is the "Game table" release, Games before Characters. Mock-ups come first, before the direction is locked (Games mock-ups published as an artifact; findings pending owner review).
2. "Advanced" controls: first label them, then count. One or two advanced controls stay in place under an "Advanced" sub-label (users expect them to be subtler). A group with 3 or more advanced controls may collapse.
3. Playtest budget: start with a cap of about 150k tokens total, check in at about 75k. Say which parts suit Haiku (e.g. bulk log or card filing) or Opus (e.g. DM narration design, if quality suffers).
4. Lite 2D fallback stays in 4.0, watching the time it takes (can be deferred).
