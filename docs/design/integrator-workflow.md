# Integrator workflow (how we run Pretty Dice with Claude sessions)

Written 2026-11-19. Companion to `docs/design/v4-sessions.md` (lanes, protocol, starter prompts) and the personal skill `parallel-lanes` (`~/.claude/skills/parallel-lanes/SKILL.md`, the integrator's playbook plus `changeover.sh` and `lane-tail.py`). This page is the short version plus what changed after 4.0.

## Roles
- **Owner:** decides scope, reviews on artifacts, marks cards Review Complete (resolving an artifact comment thread means "OK"), the only one who starts sessions or spends Opus.
- **Integrator** (one long-lived Sonnet session): never edits app code. Owns the board, backlog cards, regression checkpoints, artifacts, releases, replies on artifact comment threads, idle checks. Starts short-lived Sonnet **lane agents** for implementation, one task each, in their own worktree.
- **Lane agent:** reads its card, edits code and tests in its worktree, runs only its own specs, commits, pushes, reports sha and results. Opus only with the owner's explicit OK.

## Where things live
| Thing | Place |
|---|---|
| Release branch history | `main` (tags `v4.0`, `v4.0.1`) |
| 4.0.x hotfixes and cards | branch `v4`, worktree `~/code/pretty_dice-v4` (integrator's home) |
| 4.1 development | branch `v4.1`, worktree `~/code/pretty_dice-v4.1`; plain `git pull --ff-only origin v4.1` then `git push origin v4.1` (`land.sh` is NOT used on v4.1) |
| Board (not in git) | `~/code/pretty_dice-coord/board.md`; post with `sh scripts/board.sh <who> "msg"`, read with `sh scripts/board.sh tail` |
| Cards | `backlog/tasks/*.md` (Backlog.md CLI: `PATH=$HOME/.local/opt/node/bin:$HOME/.local/npm-global/bin:$PATH backlog task create/edit ...`). Cards created on `v4` and on `v4.1` are separate files until merged: edit a card in the checkout that has it |
| Source on v4.1 | `src/*.js` modules + `src/app.css`; `index.html` is a thin shell; `scripts/build-static.py` bundles them. Hotfixes to v4's `index.html` must be hand-ported into `src/main.js` |
| Golden behavioural set | `tests/golden/`, `tests/golden.spec.mjs`. Owner rule: do not re-record; fix code (or exclude additively) instead |

## The loop
1. Owner gives feedback (chat or artifact comment thread). Integrator files/updates a card (`--priority`, `-l v4.1`), replies on the thread, never edits code.
2. Integrator starts a Sonnet lane agent with a self-contained prompt: worktree, branch, files it may touch, tests to run (`--retries=0`, own `PD_PORT`, check `scripts/test-lock-status.sh`, no full suite), commit message format with the Co-Authored-By line, push, report.
3. Lane lands; integrator verifies git and the board, builds the review artifact, moves the card to Needs Review.
4. Owner reviews; OK/resolve gives Review Complete. Landed -> Needs Review -> Review Complete.
5. Every 3+ landed commits: checkpoint = one full-suite run on a quiet machine (about 20 min with `--disable-accelerated-2d-canvas`). Full suite is the lane's/integrator's gate before a release, not per change.
6. Idle checks: the owner periodically sends the standing "Integrator idle check" message; reply in 2-3 sentences (what landed, claims vs board/git, idle or stuck lanes, NEED owner/REVIEW, checkpoint due).

## Review artifacts
- Build: `python3 scripts/build-static.py --artifact`, then `sed` the `<title>`; check the page boots under the artifact CSP with `node <scratch>/csptest.mjs <file> "<CSP>"` (expects `ready: true`); publish with the Artifact tool (same file path / `url` to update in place). The download-link warning is the app's export link, harmless.
- "Tingles" (flashing dots, the `New` callouts) show only when `window.__PD_REVIEW` is set (artifact build) or `?new=1`. List: `NF_ALL` in `src/main.js`. At artifact build, entries whose card is Review Complete/Done are dropped (`window.__PD_RETIRED`). A page cannot read live comment state, so retirement happens at each republish. Release build = artifact build with the review flag stripped (no tingles). Release tour (PD-164, landed b421d2c on v4.1): build with `python3 scripts/build-static.py --artifact --release-tour` (writes dist/pretty-dice-release.html; no review flag; `TOUR_VERSION` is now 4.2, override with `--tour-version X`; four 4.2 entries in `NF_RELEASE`, which holds only the current release; bump `TOUR_VERSION` and rewrite `NF_RELEASE` next release). See docs/design/testing.md on v4.1.
- The release artifact is private, review callouts stripped. The standalone Story Dice Prototype artifact is retired (owner 2026-11-19): do not republish it; the v4.1 Dev artifact carries Story Dice.

## Release recipe (4.0 / 4.0.1 pattern)
Settled when the owner has no new change requests on a normal review round. Then: guide + docs review, CHANGELOG and README, full suite green, ff `main` to the branch, annotated tag, push, verify with `git ls-remote`, release artifact. Lesson: never pipe a failing `git merge` into `tail` and chain more commands.

## Cost rules (from `~/.claude/CLAUDE.md`)
Sonnet default; set `model` explicitly on every Agent call (haiku lookups, sonnet implementation and review); Opus only if the owner asks (PD-152 stays parked for that reason). Heavy workflows are opt-in. Suggest `/checkpoint` near 150-200K tokens of context.

## Starting a NEW integrator session (if this one is lost)
1. Owner: in VS Code open a new session with working directory `~/code/pretty_dice-v4` (or `cd ~/code/pretty_dice-v4 && claude`). Default model Sonnet.
2. Say: `/restore-checkpoint latest` (if `/checkpoint` was run: files are in `~/.claude/checkpoints/-home-ryan-code-pretty_dice-v4/`, `latest.md` points at the newest). If no checkpoint exists, say: "You are the Pretty Dice integrator. Load the parallel-lanes skill, read docs/design/integrator-workflow.md and docs/design/v4-sessions.md, then `sh scripts/board.sh tail | tail -30`, `git log --oneline -15` in ~/code/pretty_dice-v4 and ~/code/pretty_dice-v4.1, and the memory files pretty-dice-*.md in ~/.claude/projects/-home-ryan/memory/."
3. The new integrator's first actions: run `ListAgents`; read the board tail; `git fetch` and compare `v4`, `v4.1` and `origin`; list cards in Needs Review (`grep -l "status: Needs Review" backlog/tasks/*.md` in both worktrees); read recent owner messages in the checkpoint; check the test lock (`sh scripts/test-lock-status.sh`) and for stray servers on port 8124 (`ss -ltnp | grep :8124`; always use `PD_PORT=81xx` for runs).
4. Post `integrator: new session started, replaces <old>` on the board. Resume the standing idle-check replies.
5. Lane agents are short-lived. If one was mid-task, find its worktree (`git worktree list`, `git status`) and either resume it with SendMessage (if still listed) or start a fresh agent from the card plus `git diff`.
6. Memory index to read: `~/.claude/projects/-home-ryan/memory/MEMORY.md` (entries `pretty-dice-v4-released`, `pretty-dice-v41-plan`, `pretty-dice-release-gate`, `pretty-dice-card-workflow`, `pretty-dice-resolve-means-ok`, `pretty-dice-grammar-decisions`).

## Standing owner decisions
4.0 and 4.0.1 shipped; everything since is 4.1+. Golden set is sufficient (no re-record). Conserve weekly budget: no Opus without a go. 4.1 = Story Dice (PD-160/161/166/167) plus carried items; everything else is v4.2.

## Release checklist artifact
`python3 scripts/release-checklist.py <out.html>` builds the 4.1 checklist page (card statuses live from the backlog in this checkout and ../pretty_dice-v4.1; gates edited by hand in the script). Republish to the same artifact url after each landing, review OK or gate change: https://claude.ai/artifact/9stZVx8h5Pe58AfaR2LmGs

## Lane hygiene (learned 2026-11-19)
Two lanes sharing one checkout swept each other's uncommitted hunks into a commit (PD-167 carried PD-172 edits). Rule: one worktree per concurrently running lane (`git worktree add ../pretty_dice-v4.1-<lane> -b v4.1-<lane>` then merge/rebase to v4.1), or `git add -p`; never run a full suite in a checkout another lane is editing (use a clean detached worktree). Run suites with a free `PD_PORT` and a separate `--output` dir.
