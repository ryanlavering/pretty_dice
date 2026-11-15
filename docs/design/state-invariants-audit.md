# State invariants audit: bag, roll flow, saved games and the engine

Status: audit plan with unverified leads, 2026-11-14, written by Fable 5.2 at v4 head `0016920`. I read the bag model, the roll loop and `games/core.js`; I did not run the app or the tests. The leads in this doc are places where the code looks as if it can break a rule. None is a confirmed bug. It is written so that an Opus or Sonnet session can run the audit without the conversation that produced it.

Related: [dice-bag-design.md](dice-bag-design.md), [design-format.md](design-format.md), [games-engine.md](games-engine.md), [games-engine-v2.md](games-engine-v2.md), [testing.md](testing.md), [project-review-2026-11.md](project-review-2026-11.md) section 4 (release tier).

## Why

- v4 defers full regression runs to checkpoints, so rules that span features are checked less often than they change.
- Three lanes edit `index.html` at once. The state rules (pending edits, drafts, holds, the game mirror) live in that file as conventions between functions, not as checks.
- The bag lives only in localStorage, and `saveBag()` swallows write errors. A broken rule here loses a player's designs.
- The review's release tier asks for bot-against-bot invariants and storage fixtures from 1.0, 2.0 and 3.0. Neither exists yet.

Scope note: this began as a v3.0 pre-release audit. v3.0 has shipped and dice jail (PD-105) moved to 5.0, so the audit now covers the state that exists on `v4`, and section F settles the jail rules on paper before anyone builds them.

## Method

1. **Write each rule as a check.** One function, `checkInvariants()`, exposed as `__pd.checkInvariants()`, returns a list of violations (`[{rule, detail}]`) for the current bag, live state and game. It is pure over the bag JSON wherever it can be, so it moves to node when the bag model leaves `index.html`.
2. **Drive it with seeded random operations.** A spec generates a sequence of operations from a seed (the bag operations in `bagOps`, `activate`, Randomize, import and export, set edits, rolls, holds, a page reload), runs the checker after every step, and on a violation prints the seed and the shortest prefix that still fails. Use the `shared` fixture; boot time dominates otherwise.
3. **Engine rules run in node.** Extend `tests/games-bots.spec.mjs`: seeded bot-against-bot games with the checks in section E after every action.
4. **Each violation becomes a card and a regression test.** Where the rule itself is in doubt, it goes to the owner as a question, not a fix.

Budget guide: the random-operation spec belongs in the batch tier (tag `@slow`), with a short fixed-seed run tagged `@quick`.

## A. Bag model (`index.html`, `syncLive` to `importBag`, near lines 1477 to 1600)

Rules:

- A1. `bag.active.design` is the id of an entry in `bag.designs`, and `bag.designs` is never empty.
- A2. If `bag.active.draft` is true, the live state is the draft, and a saved bag has a non-null `bag.draft`.
- A3. Every key of `bag.pending` is a design id in the bag. A pending entry differs from its saved design (otherwise it should not exist, and the Modified badge would lie).
- A4. Design ids are unique; design names are unique; the same for sets.
- A5. Every `@design` in a set's terms, every `jail[].design` and every `set.character` refers to something in the bag.
- A6. Randomize never changes a saved design or a pending edit: only `bag.draft`.
- A7. Save, Save as copy and Revert leave no pending entry for the design they acted on. Rolls use the pending edit.
- A8. Export then import with replace gives the same bag signature (`bagSig()`).
- A9. What is in localStorage after any operation parses to a bag that satisfies A1 to A5.

Leads to check first:

- A-L1. `enterDraft()` sets `active.draft = true` and `bag.draft = null`. The draft is filled by the next `syncLive()`. Is there any path that saves or exports in between, or any path where `syncLive()` returns early (it does when `bagLoading` is non-zero), leaving a stored bag that breaks A2? What does boot do with `active.draft: true, draft: null`?
- A-L2. Bag operations are async and not serialized against `activate()`. `activate` guards itself with `actBusy`, but `bagOps.save`, `saveCopy` and `keep` call `liveJSON()` directly. If one runs while a design is loading (`bagLoading > 0`), can it store a half-loaded design? `saveBag()` also returns without saving while loading: is every such skipped save followed by a later one?
- A-L3. `importBag` merge maps pending and jail entries through `map.get(oldId)`. If the incoming file has a pending or jail key with no matching design, and `parseBag` has not already dropped it, the result is an entry under the key `undefined`. Confirm what `parseBag` drops.
- A-L4. `importBag` merge skips an incoming character whose id is already present, but incoming sets keep their `character` id, so they attach to the existing character of the same id. Characters are not built yet, so this is a rule to write down before 5.0, not a live bug.
- A-L5. Two tabs. No `storage` event listener was found, so two open tabs each hold a bag in memory and the last write wins. Decide the rule (warn, reload, or merge) and test it.
- A-L6. Quota. `saveBag()` catches and ignores a failed write. With many designs and a 200-roll log, find the bag size at which a write fails and what the user sees (expected: nothing). The review already lists "a backup warning" as missing.

## B. Sets and notation

Rules:

- B1. `parseNotation(fmtNotation(terms, mod))` gives back the same terms and modifier.
- B2. A stored set never exceeds `MAXDICE` (24) dice once built, and a term without `@design` follows the current selection.
- B3. Removing a design removes its reference from every set and leaves the set valid (it becomes a follow-the-selection term).

Lead:

- B-L1. In notation a design id is written with dashes as underscores (`designRef`), and lookup compares the converted form. `slug()` only produces `a-z`, `0-9` and dashes, so app-made ids cannot collide. An imported bag file can carry any id. Check that `parseBag` normalizes ids, or two ids such as `blue-1` and `blue_1` resolve to the same reference.

## C. Roll flow (`startRoll`, `finishRoll`, `exitRoll`, holds, restore, leans)

The variables: `rolling`, `settled`, `placing`, `restoring`, the held set, `leanDice`, `gameAwaiting`, plus the 25 s watchdog in the loop.

Rules:

- C1. Each roll ends in exactly one `finishRoll()` that records exactly one log entry, including when the watchdog fires or the view is left mid-roll.
- C2. A die is never both held and shown as cocked; cocked wins. A leaning die cannot be held.
- C3. After any game action, the mat's held set equals the engine's `status.held` plus the slots the engine is not rolling (the rule at line 2628). The engine is the truth; the mat is a mirror.
- C4. `gameAwaiting` is false whenever no roll is in flight: after a settle, an abandoned roll, `endGame()` during a roll, and a reload.
- C5. Holds clear on a new set, on leaving the roll view and at the end of a game turn; rings match the held set after every settle.
- C6. A restored die ends on its face of record, or the roll reports that it could not (three tries).

Leads:

- C-L1. Craps sends `rollStart` to the engine (line 2627), which sets `state.rolling`. No `rollCancel` call was found in `index.html`. If the game is saved (`gsaveGame`) between the throw and the settle and the page reloads, the resumed table has `rolling: true`, so `canRoll` and `canBet` are both false. Check when `gsaveGame` runs and whether resume clears the flag. Also check leaving the roll view and the watchdog path.
- C-L2. The watchdog calls `finishRoll()` with the dice wherever they are. In a game, do the values reported to the engine match what the player sees, and is a leaning die at that moment handled by rule C2?
- C-L3. A bot's timer (`botTimer`) and a human's tap can both act on the same state. Confirm every human control is disabled on a bot's turn (`st.botTurn` is checked on the roll button; check holds, score cells and bets).

## D. Storage and saved games

Keys found: `prettydice.v1` (settings), `prettydice.bag.v1`, `prettydice.bagsaved.v1`, `GKEY + '.game'`, `prettydice.full`, `prettydice.lag`.

Rules:

- D1. A storage snapshot written by 1.0, 2.0 or 3.0 boots on the current build with no page error, and the designs, sets and log it held are all present.
- D2. Corrupt or wrongly typed values in any key never stop the boot (settings already tolerate this; check the bag and game keys).
- D3. A saved game either resumes into a playable state or is dropped with a message. It never resumes into a state where no action is legal.

Work:

- Build fixtures by checking out tags `v1.0`, `v2.0`, `v3.0` into a throwaway worktree, driving a short scripted session, and dumping localStorage to `tests/fixtures/storage/<tag>.json`. Commit the JSON, not the script output paths.
- D3 has no version to key on today. [games-engine-v2.md](games-engine-v2.md) part 1 adds it; do that first or together.

## E. Engine rules (node, bot against bot, every action)

- E1. `act` never changes its input state (deep-freeze the input in tests).
- E2. A refused action returns the same state and no events.
- E3. `JSON.parse(JSON.stringify(state))` at any point plays on identically.
- E4. Every game ends within a bound on actions; `result` is null before the end and stable after.
- E5. Scores add up: Yacht total equals the sum of the card plus bonuses; Ten Thousand and Pig banked totals change only on `bank`; `scorecard().total` equals the ranking total.
- E6. Craps conserves chips: the sum of bankrolls plus stakes on the table changes only by the `payout` events of that roll, every payout is a whole number, and no bankroll goes below zero.
- E7. `rollSpec(state).slots` is empty exactly when `status.canRoll` is false, and a `roll` with that many in-range values is accepted.
- E8. Every row `suggest` marks available is accepted by `act`; for Craps, `minAmount` and `maxAmount` are both accepted.
- E9. Liar's Dice: `redact(state, viewer)` and `status(state, viewer)` contain no die of another cup before the reveal (search the serialized view for the values), for every viewer including `null`.

## F. Dice jail rules to settle before PD-105 is built (5.0)

The owner's rules so far: only the player releases a die; a served sentence makes it "eligible for parole"; time served counts only rolls the die would have been in; a stand-in stays while its set is active and is re-picked after another set is rolled; the roll log keeps stand-ins, including a random stand-in's full design.

Questions those rules leave open, to answer on paper first:

1. What is jailed: a design (every die of that look) or one die of a set? `bag.jail[]` currently stores `{design}`.
2. "Rolls the die would have been in": for a term with no `@design` (it follows the selection), does a roll count when the jailed design was the selection at the time, or never?
3. If the jailed design appears in two sets, is there one stand-in per set or one for the design?
4. If the stand-in's own design is deleted, edited or jailed, what replaces it, and does the log entry still show the look that was rolled? (The rule that the log keeps a random stand-in's full design suggests the log should always carry the design, not a reference.)
5. Does game play count as time served, and can a jailed design be used in a game?
6. Export and import: does a jail entry travel with the bag, and what happens on a merge when its design id is renamed? (See lead A-L3.)

## Owner decisions needed

1. Two tabs open on the same bag: warn, reload the older tab, or accept last-write-wins?
2. When storage is full: block the edit with a message, or keep working and warn that the bag is not being saved?
3. The jail questions in section F, when 5.0 planning starts.

## Handoff

| Step | Model | Notes |
|---|---|---|
| Verify the leads (A-L1 to L3, B-L1, C-L1 to L3) by reading `parseBag`, `gsaveGame` and the resume path, and writing one failing test per real bug | Opus, or Sonnet with this doc | Reading work; cheap. Do C-L1 first: it is the most likely to hit a player. |
| `checkInvariants()` and the seeded random-operation spec (sections A to C) | Sonnet | Start with A1 to A5 and A9; add rules as leads are confirmed. |
| Engine rules E1 to E9 in `games-bots.spec.mjs` | Sonnet | No browser; fast; tag `@quick`. |
| Storage fixtures (section D) | Sonnet | Needs a quiet machine for the tag checkouts. |
| Section F answers | Owner, with Opus drafting options | Before PD-105 starts. |

Lane: reviews (`v4-reviews`) for the reading and the specs; fixes go to the lane that owns the code (games-ui for the roll flow and game mirror, games-core for the engine). Tests go through `npm test -- <files>` with `PD_LOCK_NOTE`.

## Done when

- Each lead is marked confirmed (with a card and a regression test) or cleared (with one line saying why).
- `__pd.checkInvariants()` exists and the seeded spec runs clean for a fixed set of seeds in the batch tier.
- E1 to E9 run for all five games in the quick tier.
- Fixtures from the three released tags boot on the current build.
