# v4 parallel sessions: lanes, protocol, starter prompts

Status: proposal 2026-11-13. Context: [v4-roadmap.md](v4-roadmap.md), cards under PD-142.

## Lanes

| Lane | Branch / worktree | Cards | Touches |
|---|---|---|---|
| integrator | `v4` at /home/ryan/code/pretty_dice-v4 | backlog hygiene, checkpoints | nothing in app code |
| games-core | `v4-games-core` at ../pretty_dice-games-core | PD-142.3 engine, .5 Yahtzee model, .6 Farkle/Pig, .7 Craps engine | new files (`games/`, `tests/games*.spec.mjs`), docs |
| games-ui | `v4-games-ui` at ../pretty_dice-games-ui | PD-142.1 hold dice, .4 Games tab and scorecard, .8 declutter mat, Yahtzee playable prototype | `index.html` (mat, tabs, roll flow) |
| settings | `v4-settings` at ../pretty_dice-settings | PD-142.9 advanced labels and slider upgrades, PD-142.2 roll notation | `index.html` (settings pane, notation parser) |
| perf | `v4-perf` at ../pretty_dice-perf | PD-142.10 spike, .11 ladder, then .12 Lite, .13 PWA | `index.html` (renderer, loop), `scripts/` |
| guide | `v4-guide` at ../pretty_dice-guide | PD-140 user guide, then PD-142.14 playtest prep | `docs/guide/`, `scripts/guide-*`, no app code |

Start order if you do not want all six: games-core, games-ui, guide first (they unblock the playable prototype and the playtest); settings and perf can start any time since they are independent. The integrator is a light session: this one can keep that role.

Why these cuts: `index.html` is one 2,400-line file, so three lanes edit it. The split keeps them in different regions (mat/roll flow, settings pane, renderer), and games-core stays out of it entirely by writing a pure, node-testable engine that games-ui wires in.

## Protocol (all lanes)

1. **Own worktree, own branch.** `git worktree add ../pretty_dice-<lane> -b v4-<lane> origin/v4` from the v4 worktree. Never edit another lane's worktree or the main checkout. Lane branches stay local; `v4` is the only shared branch.
2. **The board.** `sh scripts/board.sh tail` at the start of every task and before landing. Post with `sh scripts/board.sh <lane> "..."`: `TOUCHING <area>` before you edit a shared region of `index.html`, `LANDED` (the land script does this), `NEED <lane>: ...`, `BLOCKED ...`. The board is a plain file at /home/ryan/code/pretty_dice-coord/board.md, outside git, so all worktrees share it. For something urgent and live, `ListAgents` then `SendMessage` reaches another running session. Address sessions by their `[id]` from `ListAgents` (the registry on the board, `REGISTRY`/`ID` lines, is the current list); display names and `/rename` are cosmetic and may collide after a changeover; still post to the board so the decision is not lost.
3. **Land small and often.** `LAND_TESTS="tests/<your>.spec.mjs" sh scripts/land.sh` from your lane branch. It takes a landing lock (one lander at a time), rebases on `origin/v4`, runs only your feature's tests under the machine test lock, and does a fast-forward-only push to `origin/v4`. On a rebase conflict it stops without damage; resolve and rerun. Land at least whenever a card reaches Needs Review. Rebase onto `origin/v4` at the start of each work block to keep conflicts small.
4. **Tests.** Per feature only (v4 cadence in CLAUDE.md): run only the specs for your own feature. If you need a larger test bed (several specs, a whole area, anything long), post `NEED integrator: test bed ...` and the integrator schedules it, so the machine is not overloaded (load hit ~39 with 3 lanes plus a full run). Always go through `npm test -- <files>` with `PD_LOCK_NOTE`. Do not run the full suite; the integrator does.
5. **Regression checkpoints (integrator).** After each themed batch (and before release) the integrator posts `CHECKPOINT n starting <sha>`, runs the full `npm test` on a throwaway checkout of that sha (lanes keep landing meanwhile), and posts `CHECKPOINT n green|red <details>`. On red, the integrator bisects the LANDED lines and posts `NEED <lane>: fix <test>` to the lane that owns the commit. That lane fixes first, with a regression test, then continues.
6. **Cards.** Each lane moves only its own cards: In Progress when started, Needs Review when landed on `v4` with its tests. Review Complete is the owner's; Done happens only when v4 merges to main. Commit card files with the work.
7. **Publishing.** Only the integrator pushes the "Pretty Dice v4 Dev" artifact and refreshes :8123 (after checkpoints). Lanes view their work on their own port (games-core 8131, games-ui 8132, settings 8133, perf 8134, guide 8135) with `python3 -m http.server <port>` in their worktree.
8. **Shared contracts.** If your work needs an API from another lane, post `NEED` and write the contract into a short doc under `docs/design/` and land it first. Games engine API: games-core lands `docs/design/games-engine.md` within its first work block, games-ui reads it.
9. **Cost discipline.** Sonnet by default, no subagents unless truly parallel, read files in parts, and when a session nears 150-200K tokens run `/checkpoint` and continue in a fresh session. Do not start Opus on your own; suggest it only for hard design or debugging.
10. **Owner is the tiebreaker.** Product decisions not covered by the roadmap go to the board as `NEED owner: ...`; the integrator batches them for the owner.

**Concurrency (owner, 2026-11-13):** at most 2-3 lanes active at once. Settle before adding a lane; settings and perf start only when a running lane finishes or the owner says so.

## Common preamble (included in every starter prompt)

> You are one of several parallel Claude Code sessions working on Pretty Dice v4 (repo /home/ryan/code/pretty_dice-v4, integration branch `v4`). First read CLAUDE.md, docs/design/v4-roadmap.md and docs/design/v4-sessions.md (protocol; follow it exactly). First action: run `ListAgents`, read your own `[id]` from its first line, and post `sh scripts/board.sh <lane> "ID <lane> <id> (replaces <old id or none>)"`. Set up your worktree and branch for your lane, run `sh scripts/board.sh tail`, and work only on your lane's cards. Use Sonnet-level effort, no subagents unless I ask, tests per feature only, land with scripts/land.sh.

## Starter prompts

**integrator** (this session or a new one)
> Preamble. You are the integrator. Own the board, the checkpoints and publishing, never app code. Each time the board shows 3+ new LANDED lines or I say so, run a regression checkpoint per the protocol. Keep backlog cards tidy (statuses match reality). Refresh :8123 and the "Pretty Dice v4 Dev" artifact after green checkpoints. Summarize board activity and open `NEED owner` questions for me when I ask.

**games-core**
> Preamble. Lane games-core. Cards PD-142.3, .5, .6, .7. Build the games rules engine as pure JS with no DOM or three.js, in a new `games/` directory, tested in node with seeded dice sequences (and wired into the Playwright suite as @quick specs). First deliverable, landed within your first work block: `docs/design/games-engine.md` with the rule-schema and engine API that games-ui will call (state, `rollSpec`, hold, score suggestions, turn advance, final result, serialization). Then Yahtzee (including joker and upper bonus), then Farkle and Pig, then the Craps engine (point, pass/don't pass, odds, field, place, play money). Mock-up for reference: docs/design/game-table-mockups/games.html. Check how scripts/build-static.py inlines scripts before choosing a file layout, and post what you find on the board.

**games-ui**
> Preamble. Lane games-ui. Cards PD-142.1 (hold dice), .4 (Games tab, setup, scorecard, suggest scores default ON with an off switch), .8 (declutter the mat: audit current controls, then try a long-press on the roll/showcase toggle that slides out extras like Games), and the playable Yahtzee prototype. Start with hold dice and the mat declutter audit since they do not need the engine. The mock-up (docs/design/game-table-mockups/games.html) is illustrative: the real app has a Showcase/Roll toggle and the bag sheet rather than the tab strip drawn there, so adapt it. Wire games-core's engine through the contract in docs/design/games-engine.md once it lands; post `NEED games-core` for gaps. Goal: a playable one-player Yahtzee as early as you can, then multi-player and polish. Post TOUCHING before changing the mat, tabs or roll flow.

**settings**
> Preamble. Lane settings. Cards PD-142.9 and PD-142.2. Part 1: audit the settings pane and label which controls are advanced (list them in the card first). Rule from the owner: 1-2 advanced controls stay in place under an "Advanced" sub-label; a group with 3+ may collapse. Add slider upgrades (value readout, tap to type, double-tap reset) and make the pane work better in the small phone area (consider a bottom sheet so the mat stays visible while dragging a slider). Part 2: roll notation: `kh`/`kl`/`dh`/`dl`, advantage/disadvantage, reroll, exploding, with parser tests (@quick) and roll-log display. Post TOUCHING before editing the settings pane markup or the notation parser.

**perf**
> Preamble. Lane perf. Cards PD-142.10, .11, then .12 (Lite 2D fallback; watch the time and tell me if it grows, it can be deferred) and .13 (PWA). First the spike: measure frame time and heap under software GL (`--use-gl=swiftshader`) with CDP CPU throttling 4x/6x, 1/10/50 dice, epoxy on/off; write the table to docs/design/perf-spike.md and post the findings and a proposed ladder order on the board for me before building. Reuse PD-141's lag monitor if it has landed (it is uncommitted work in the main checkout; ask on the board). Post TOUCHING before editing the renderer or loop.

**guide**
> Preamble. Lane guide. Card PD-140 (user guide with automated screenshots) first: docs/guide/ markdown pages plus images generated by a Playwright script (`npm run guide`) from fixed seeds so they regenerate every release; hide the PD-141 lag toast in shots. Pages: first steps, designing a die (shape, substrate, colours, numbers, finish), the bag and shelf, sets and the editor, rolling, roll log, save/load, phone versus desktop, sound. Then PD-142.14 prep: write the playtest brief (docs/playtests/README.md) for one DM and three players who may use only the UI and docs, with a findings template and the parent/sub-card filing rules. The guide must be written from the running UI, so use it, not the source logic. Software GL works for screenshots (see launch flags `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Control ids seen so far: #mode/#roll toggle, #bagopen, #layout (hide settings), #snd, #spinbtn, #info, #rand.

## Open questions for the owner
- How many lanes to start now (recommended: games-core, games-ui, guide, plus settings)? Each running session spends its own tokens and re-reads its own context.
- Is the integrator this session, or a fresh one?
