# Agent playtest brief (PD-142.14)

One DM agent and three player agents play a short tabletop session using Pretty Dice for every roll. They use only the running app and the user docs. The point is to find what a real table would trip over: bugs, confusing UI, doc gaps and missing features. It is not to produce a good story.

Written for the person (or session) running the playtest. Copy the **agent prompts** below; do not hand the agents this whole file.

## Before you start

- [ ] The v4 build under test is served (the :8123 dev server, or a fresh `python3 -m http.server`), and you have noted the commit sha in the session log.
- [ ] The user guide is current: run `npm run guide` and check the pages against the UI. Agents get the **docs/guide/ pages and images**, the project README and CHANGELOG, and nothing else from the repo. Give them a copy of those files in a separate folder rather than the repo, so `index.html`, `tests/` and `scripts/` are not within reach.
- [ ] Each agent gets its **own browser instance** (separate profile, own tab), never a shared tab. localStorage is per profile, which is what keeps one character's bag from leaking into another's.
- [ ] Budget agreed with the owner: about **400k tokens total** (pacing target, raised from 150k after Playtest 1 used about 330k), check in with the owner at about **75k**. Cap at about six rounds and about 20 agent turns each. Screenshots only on demand.
- [ ] Parent card "Playtest 1" created under PD-142.14 (see filing rules).

## Who runs what

Subagents cannot start subagents, so the **main session runs the table**: it asks the DM for a scene, passes the narrative to each player in turn, passes their declared actions and reported rolls back to the DM, and appends everything to the session log. Roll in each player's own browser; the DM hears results only as reported (this is itself a finding to record).

Model guidance: **Sonnet** for the players and the DM. **Haiku** is fine for the mechanical parts: appending to the log, deduplicating findings, drafting the cards. **Opus** only if the DM's narration quality is so poor it blocks the test, and only with the owner's say-so.

## Rules for every agent

- Use only the running app and the provided docs. **Do not read** `index.html` logic, `tests/`, `scripts/`, or any source. Do not use `window.__pd`, the console, or the DOM to do something the UI does not let a normal player do. Looking at the rendered page and screenshots is fine.
- Try the docs first. If the guide does not answer a question, note it as a doc gap, then explore the UI.
- Play in character and keep turns short. Do not fix problems; record them.
- Record a finding the moment you hit something, not at the end.

## Agent prompts

### DM

> You are the dungeon master for a short, light fantasy session (about six rounds): a small party reaches a ruined watchtower with a few goblins and one trapped door. You run it with Pretty Dice open in your own browser for all your rolls (monster attacks, saves, a random encounter table). You may use only the running app at <URL> and the docs in <docs folder>. Do not read source code, tests or scripts. Describe the scene, call for rolls, resolve actions, and keep a session log: one line per round with what happened and what you rolled. You cannot see the players' dice, only what they tell you. Record every point where the app or docs got in your way, using the findings template, as you go. Needs a DM would have (hidden rolls, grouped monster rolls such as three goblins attacking, initiative order, tables, a copyable log): note which ones you actually missed and when.

### Player (three copies; give each a name, class and one-line character)

> You are <name>, <class>, in a short fantasy session. You use Pretty Dice open in your own browser for all your rolls. You may use only the running app at <URL> and the docs in <docs folder>. Do not read source code, tests or scripts. When the DM describes a scene, say what you do; when a roll is needed, make it in the app and report the result in plain words (for example "d20 plus 3: 17"). Try the app's features as a player would: your own dice look, a set for your attack, advantage-style rolls if the app seems to offer them, the roll log. Record every point where the app or docs got in your way, using the findings template, as you go.

## Findings template

Each agent returns findings in this form (one block per finding):

```
### <short title>
- Role / round:
- What I tried:
- What I expected:
- What happened:
- Severity: blocker | annoying | polish | idea
- Kind: bug | confusing UI | doc gap | missing feature
- Screenshot: <file name, or none>
```

## Session log

The DM's log lives at `docs/playtests/2026-11-xx-session-1.md` (fill in the date). Use:

```
# Playtest 1: <date>, build <sha>
Cast: DM, <player 1>, <player 2>, <player 3>
Budget used: <tokens> of 400k

## Rounds
1. <what happened; who rolled what>

## Findings (deduplicated)
(list with the card IDs once filed)

## What the table wanted that the app did not have
(DM and player needs observed, ranked by how often they came up)
```

Screenshots go in `docs/playtests/img/session-1/`.

## Filing rules

1. One parent card, **"Playtest 1"**, under PD-142.14 (or PD-142 if you prefer a flat list), with the session log linked in its notes.
2. One **subordinate card per distinct finding**, labelled `playtest` plus its kind (`bug`, `ux`, `docs`, `feature`). Merge duplicates from different agents into one card and list who hit it. Severity goes in the card priority (blocker high, annoying medium, polish and idea low).
3. Doc gaps go to the guide lane (card label `docs`, note which page). Missing features are **ideas for the owner**, not committed work: they go to the board as `NEED owner:` batches, ranked by how many agents hit them.
4. Bugs get a regression test when fixed, as always.
5. When done, post `PLAYTEST 1 done: <n> findings, <n> blockers` on the board and tell the owner what, if anything, the findings say about promoting table-session features from v5 into v4.
