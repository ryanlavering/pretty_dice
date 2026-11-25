# Integrator handover (written 2026-11-25, after the 4.2 release)

For a new integrator session. Read this, then `docs/design/integrator-workflow.md` and the `parallel-lanes` skill (`~/.claude/skills/parallel-lanes`). You coordinate; lane agents (Sonnet) write the code. You never edit app code.

## 1. State of the world
- **4.2 is released.** `main` = tag `v4.2` = `67cec71` (annotated tag object `52846a6`), pushed and verified with `git ls-remote`. `~/code/pretty_dice` (main checkout) is on `main` at that commit. Release artifact: https://claude.ai/artifact/LRKRkoyWCfj71nwjDKFgCr (private; byte-identical to the release candidate that passed two clean full runs, 718/0, `--retries=0`; GitHub Actions green at the head).
- Cards for 4.2 are Done on branch `v4` (this worktree, `~/code/pretty_dice-v4`). `main` still shows some of them as Review Complete because the card move happened after the tag; that is intended (main = tag).
- Nothing is running: no lane agents, no tests. The recurring idle-check cron was removed when parking.
- 4.3 has not started. It waits on the owner's go (they watch a 5-hour usage budget and pause lanes when it runs low).

## 2. Repos, branches, worktrees
- `~/code/pretty_dice-v4` branch `v4`: integrator home (backlog cards, `scripts/board.sh`, checkpoint and checklist scripts). Push cards here.
- `~/code/pretty_dice` branch `main`: keep fast-forwarded to main after each release (owner standing request).
- Kept on purpose: `~/code/pretty_dice-v4.2-gomboc` (archive of the Gömböc research branch `v42-gomboc`), `~/code/pretty_dice-v4.2-lighttune` (branch `v42-lighttune`, the PD-149 lighting lab, a 4.3 item, unmerged), `~/code/pretty_dice/.claude/worktrees/agent-a9e1f623493fc4081` (branch `v42-gomboc-die`, the parked d1mono spike).
- Remote branches left on origin on purpose (not deleted; ask the owner before deleting any): `v4.2` (sits beside tag v4.2), `v4.2-wiggle`, `v42-gomboc`, `v42-gomboc-die`, `v4.1`, `v4.1-sentgen`, `feat/*`. Local `v4.2`, `v42-setlook`, `v42-rrdefault` were deleted after merge.
- Not touched: `~/code/pretty_dice-backup`, `~/code/pretty_dice-coord`, branch `feat/pd-20.7-ci`.
- Start 4.3 as a new branch from `main` (suggested name `v4.3`), with its own worktree; link `node_modules` from `../pretty_dice-v4/node_modules` (the old `pretty_dice-v4.1` target is gone).
- Gömböc research lives in a separate private repo `https://github.com/ryanlavering/monostatic` (clone `~/code/monostatic`), run by a different integrator session. Do not edit its worktrees or touch Pretty Dice main from there.

## 3. Owner rules (binding)
- Never tag or push `main` before the owner's explicit final sign-off ("ship it"). Review answers like "ok" on sub-questions are not that sign-off.
- Golden set: no re-record without explicit approval for the specific files.
- Models: Sonnet by default; set `model` explicitly on every Agent call. Opus only with the owner's explicit OK (ask each time). Do not spawn agents without cause.
- Review style: owner says "ok" / "needs more review"; resolving an artifact comment thread means ok. Reviews move cards Needs Review -> Review Complete; Done after the release.
- Verify every lane push: `git merge-base --is-ancestor <old head> origin/<branch>`. Never trust a lane summary; re-run key tests, look at screenshots for UI.
- Artifacts: always run the CSP check before publishing and check the BUNDLED file, not the dev server: `node <scratch>/csptest.mjs FILE "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com cdn.jsdelivr.net unpkg.com; style-src 'unsafe-inline' fonts.googleapis.com; img-src data: blob:; font-src fonts.gstatic.com data:; connect-src 'none'; worker-src blob:; media-src blob: data:"` must print `errors: []` (`ready: true` for pages with a canvas). `csptest.mjs` lived in the old session scratchpad; `~/code/monostatic/tools/gomboc-spike-verify/r19-csptest.mjs` does the same.
- Build commands: review/Dev build `python3 scripts/build-static.py --artifact` (writes `dist/pretty-dice-artifact.html`); release build `python3 scripts/build-static.py --artifact --release-tour` (writes `dist/pretty-dice-release.html`, a different file). The bundler only sees the first name of `export const a=..., b=...`, so use one declarator per export (guard added in the d1mono branch, card PD-222).
- Test cadence on `v4` branches: tests per feature; full `npm test` only at checkpoints and before release. Checkpoint = two clean full runs with `--retries=0` in a clean detached worktree (pattern: scratchpad `ckpt42j.sh`; `PD_PORT=<free port> npm test -- --retries=0 --workers=4 --output=<dir>`, about 25 min per run). Always go through `npm test`, set `PD_LOCK_NOTE`.
- Do not track 4.0 or 4.1 items. Owner treats information about them and their project as private; never send personal details to outside services.
- Tagging: use `git tag -a v4.2 <commit>` (NOT `refs/tags/v4.2` as the name; GitHub rejects it) and push `refs/tags/v4.2:refs/tags/v4.2` when a branch of the same name exists.
- Board and cards: `cd ~/code/pretty_dice-v4 && sh scripts/board.sh integrator "msg"`; cards with `PATH=$HOME/.local/opt/node/bin:$HOME/.local/npm-global/bin:$PATH backlog task ...`. Keep cards In Progress / Needs Review as work proceeds. Release routine after each phase: push branch, refresh the Dev artifact.
- Idle-check routine the owner liked (they sent it every 17 minutes by cron): `sh scripts/board.sh tail | tail -15`, `git fetch -q; git log --oneline HEAD..origin/v4`, `python3 ~/.claude/skills/parallel-lanes/scripts/lane-tail.py`, then a 2-3 sentence status. The cron is session-only and expires; ask the owner whether to recreate it.

## 4. Artifacts
- Release 4.2: https://claude.ai/artifact/LRKRkoyWCfj71nwjDKFgCr
- Dev/review build (4.2, v32): https://claude.ai/artifact/RxfqVoxXtRYJNvdXpR8MR2 (comments there are how the owner reviews; read with the ArtifactComments tool; the page auto-replies, so check what was promised and correct it, e.g. 4.3 items were once promised as "on it")
- 4.2 checklist (v6): https://claude.ai/artifact/1wUQwwGWWf9iZLZ7K7r633 (generator `scripts/release-checklist-4.2.py`; make a 4.3 version when a release is planned)
- d1mono spike (parked): https://claude.ai/artifact/5Gh2PWC3kwvYKgZ1estPAV
- Gömböc page (owned by the monostatic session): https://claude.ai/artifact/KCR4MGdM2Kyp63TZvgh7N9
- 4.1 release (history): https://claude.ai/artifact/CLyMR9Tjhx3RMwwkDGioWT

## 5. What is next (4.3 backlog, all labelled v4.3; start only on the owner's go)
- PD-211 Möbius d1 (sibling of the parked d1mono), PD-210, PD-209, PD-75, PD-85.
- PD-142.42.2 / .3 / .42 (longhand rolls, chained rolls, roll triggers; design draft in `docs/design`).
- PD-149 top-down glare: lab on `v42-lighttune`; the matte commits were reverted from 4.2. Owner tunes in the lab first.
- PD-222 build-static.py multi-declarator guard (exists on `v42-gomboc-die`; cherry-pick candidate).
- PD-223 `rr` repeating reroll (r = once today, rr = repeat, cap about 100); the owner has NOT yet chosen between one grammar or also accepting Roll20 aliases (`ro`).
- PD-224 (i) info tap with a grammar primer on Formula fields.
- Gömböc cards (PD-207, 208, 217-221) belong to the monostatic session.
- Possible housekeeping: `scripts/probe.mjs` has a syntax error on the d1mono branch only; golden JSON files `screens-*.json` still mention nothing stale; the 4.2 findings doc on `v4.2` is stale vs the monostatic repo copy.

## 6. Parked work (do not lose)
- **d1mono** (Gömböc 172-face die inside Pretty Dice): remote branch `origin/v42-gomboc-die` at `e97c0dd`, not merged, owner said "fun experiment, implementation decent, not production ready; do not bake the candidate shapes into PD now; later we may bring this back". Memory note `pretty-dice-d1mono-parked.md`.
- **PD-149 lab**: branch `v42-lighttune`.
- **Gömböc research**: separate repo, separate session.

## 7. Known facts and gotchas from 4.2
- PD-214 removed set-level designs: a set names a design only through `@design` on its dice; old stored sets migrate on load (`parseBag`). "Apply to all" sits beside "Dice use" in the set editor; Dice use always adds a new term; the Dice use dropdown defaults to the single design all terms share.
- PD-212 reroll: manual is the default (ring plus green chip, `r` key or chip re-throws only pending dice, same for leaning dice); the option is "Automatically roll leaning and re-roll dice" (checkbox id `#autoreroll`, 1 s ring); bots always reroll themselves. A stuck green chip after a normal tap-and-settle was reported by the owner and could not be reproduced by the lane (only the rebuild/leave path was fixed): watch for a repeat report.
- Full-suite checkpoints can fail for reasons the focused specs miss (a stale expectation in a game-draft test exposed a real PD-214 bug). Budget a full run after any late change.
- Review-build tingles ("New" callouts) and the release tour have revision numbers; a rev bump needs the tour spec updated (`tests/release-tour.spec.mjs`).
- The artifact viewer warns about a file-download link on the page (downloads need a declared capability); harmless for review.

## 8. First moves for a new session
1. `ListAgents`; read `sh scripts/board.sh tail | tail -20`; confirm `git ls-remote origin refs/heads/main 'refs/tags/v4.2^{}'` both show `67cec716d955...`.
2. Ask the owner for their go on 4.3 and which cards first, plus the PD-223 grammar choice.
3. When they go: `git worktree add ../pretty_dice-v4.3 -b v4.3 main`, link `node_modules`, write lane tasks (Sonnet), follow the rules above.
