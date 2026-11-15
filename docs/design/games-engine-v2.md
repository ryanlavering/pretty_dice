# Games engine contract v2: one rules model for what comes next

Status: design proposal, 2026-11-14, written by Fable 5.2 at v4 head `0016920`. Nothing here is built. It is written so that an Opus or Sonnet session can pick up any step without the conversation that produced it.

Related: [games-engine.md](games-engine.md) (the v1 contract), [games-engine-gaps.md](games-engine-gaps.md), [games-hidden-info.md](games-hidden-info.md), [state-invariants-audit.md](state-invariants-audit.md), [project-review-2026-11.md](project-review-2026-11.md).

## Why now

The v1 engine works and five games ship on it. Three things make a second pass worth doing before the 4.0 tag rather than after:

1. **The saved-game format becomes public at release.** A game in progress is stored as `{id, state}` under `GKEY+'.game'` (`index.html`, `gsaveGame`), and the state has no version field. After 4.0 ships, any change to a game's state shape either breaks a player's saved game or needs a migration that has nothing to key on.
2. **The documented schema and the code have drifted.** games-engine.md describes data-defined scorecard games (`categories`, `bonuses`, `rollsPerTurn`). In the code, Yacht is a hand-written engine inside `games/core.js` (`yahtzeeEngine()`, with 5 dice, 3 rolls and 13 rounds as constants), and every other game supplies a full engine of its own. Gap 7 in the gaps doc already says so.
3. **The roadmap leans on things v1 does not have.** 5.0 (characters, hidden DM rolls) and 6.0 (shared rooms) need per-viewer views for every game and a way to sync state between devices. Gaps 2 and 3 (custom-face dice, everyone-acts-on-one-roll games) need dice to have an identity beyond `sides`.

## What v1 looks like today (read from the code)

- `games/core.js` holds a registry `GAMES = { id: { info, mod } }` and routes `status`, `rollSpec`, `act`, `suggest`, `result`, `scorecard`, `redact` to `mod`. `act` clones the state, lets the engine mutate the clone, and returns `{ok, state, events}`.
- State is whatever `mod.init({game, players, options})` returns, plus `bots`. There is no version, no move counter and no history.
- Each engine re-implements seat rotation, round counting, final-round handling, ranking and value validation.
- `rollSpec` returns `{slots, sides}` (plus `private` and `player` for Liar's Dice).
- Only Liar's Dice honours `viewer` in `status`, `suggest` and `redact`.
- Only Craps has the roll-in-flight lock (`rollStart`, `rollCancel`). The other games rely on a UI flag (`gameAwaiting` in `index.html`).
- `runBots` plays seeded bot-against-bot games in node. `tests/games-bots.spec.mjs` checks legal moves only.
- Build constraint: `scripts/build-static.py` bundles `games/*.js` by rewriting plain import and export forms. Keep to the forms listed in games-engine.md.

## Design

Six parts, in the order they should be built. Parts 1 and 2 are the ones I recommend before 4.0; the rest can wait for 5.0.

### 1. State envelope and migration (before 4.0)

Every state carries `v` (engine state version, starting at 2) and `seq` (count of accepted actions).

```js
{ v: 2, game: 'farkle', players: [...], options: {...}, bots: [...], seq: 17, ...game fields }
```

- `core.js` adds `load(json) -> { ok, state, error? }`. It checks `game` is registered, runs `mod.migrate?.(state)` when `state.v` is lower than the current version, and refuses a higher version with a readable error. A state with no `v` is treated as version 1.
- The app calls `load` in `gsaved()` in place of the bare `JSON.parse`. A save that fails to load is dropped with one line in the game panel ("Your saved game was from an older version and could not be resumed"), not silently.
- `act` increments `seq`. Nothing else changes for callers.

Size: S. Risk: low. Tests: a fixture of each game's v1 state (taken mid-game from the current build) loads and plays to the end.

### 2. Action log and replay (before 4.0 if time allows)

A game is fully determined by its setup and the list of accepted actions, because the engine never rolls dice and settled values arrive inside `roll` actions.

- `core.js` adds `replay(setup, actions) -> state`, where `setup = {id, players, options, bots}`. Invariant: replaying the log gives a state deep-equal to the live one.
- The log lives beside the state in the app's save (`{id, state, setup, actions}`), not inside the state, so `status` and `redact` stay cheap. Cap it per game (Craps tables can run long): keep a checkpoint state plus the actions since.
- What this buys: undo of the last action (replay to `seq - 1`; the owner should decide which games allow it), a "copy game log" for bug reports and playtests, exact reproduction of any reported bug, and the sync format for shared rooms in 6.0 (send actions, not states).
- Hidden information: the log contains every cup. It is not safe to show a player. A redacted log is 6.0 work; note it in games-hidden-info.md and do not build it now.

Size: S for `replay` and the invariant test, M with undo wired into the UI.

### 3. A shared turn kernel

Move what every engine repeats into `games/kernel.js`:

- `nextSeat(state, {skip})`, round counting, and the final-round rule (Ten Thousand has it; Pig ends at once).
- `rank(rows, {lowWins})` with shared ranks for ties (Yacht and Shut the Box each have their own copy).
- `checkValues(values, sides)` for `roll` actions.
- The roll lock for every game: `rollStart`, `rollCancel`, `status.rolling`. Today a reload or an abandoned roll is handled differently per game, and the app never sends `rollCancel` (see the audit doc, lead C3).

Rule for the refactor: no behaviour change. The existing specs (`games*.spec.mjs`) and the replay invariant from part 2 are the safety net, which is why part 2 comes first.

Size: M. Good Sonnet work once parts 1 and 2 are in.

### 4. Scorecard games as data

Make the schema in games-engine.md real. A scorecard game is a rule object handed to `scorecardEngine(rules)`:

```js
{ id, name, dice: {count, sides}, rollsPerTurn, rounds,
  categories: [{ id, label, section, score(dice, ctx) }],
  bonuses:    [{ id, label, section, applies(card, ctx) }],
  joker:      (dice, card, options) => ({ ids, joker }) | null,   // the forced-category rule, optional
  options }
```

Yacht becomes the first rule object and `yahtzeeEngine()` leaves `core.js`. Its state shape must not change (same `cards`, `turn`), so no migration is needed. Variants (Kismet, Maxi, Generala) then cost a rule object each; build none of them without the owner's go-ahead, since the 4.0 list was cut to five on purpose.

Size: S to M.

### 5. Die identity in `rollSpec`

Add an optional `dice` array alongside the existing fields, which stay for old callers:

```js
{ slots: [0, 2], sides: [6, 6],
  dice: [{ slot: 0, sides: 6, kind: 'white' }, { slot: 2, sides: 6, kind: 'red', faces: ['brain','brain','brain','run','run','shot'] }] }
```

- `kind` is a game-level name. The UI maps kinds to bag designs (a setup step: "red dice use: Ruby"), which plays to the app's strength.
- `faces`, when present, are labels for values 1..n. The app still reports numbers; the engine translates.
- This is the whole engine cost of gap 2 (Zombie Dice) and the coloured dice of gap 3 (Qwixx). The UI cost is separate and larger.

Size: S in the engine. Do it only when a game needs it.

### 6. Views and actors for every game

- `status(state, viewer)` and `redact` get a default in the kernel (public games return everything), so the UI can always pass a viewer. That removes the special case in `index.html` for Liar's Dice.
- `status.actors: [seat...]` joins `status.player`. For turn games it is `[player]`. A decision round (gap 3) lists several seats and each acts once. Hot-seat UI walks the list; a networked UI lets them act in any order.

Size: S for the default, M for the decision round. 5.0 or later.

## What not to do

- No networking, rooms or server. Part 2 only makes sure the format will suit them.
- No new games. Parked games stay parked.
- No change to game ids, action shapes or event names. v2 adds fields; it removes none.
- Do not move engine code into `index.html` or import `games/` files by path from it (the artifact build depends on the `pd-games` import line).

## Owner decisions needed

1. Do parts 1 and 2 go into 4.0? My recommendation: part 1 yes (it is small and it is the only part that gets harder after release), part 2 yes without undo, the rest in 5.0.
2. Undo in games: allowed anywhere, only for bets and score choices, or never after dice have been thrown? A sensible default is "undo the last non-roll action".
3. Should a saved game of a parked game show a message rather than vanish? Today `gsaved()` returns null for it.

## Handoff

| Step | Model | Notes |
|---|---|---|
| Part 1 | Sonnet | Mechanical. Capture v1 fixtures first, from the current build, before touching any engine. |
| Part 2, `replay` and invariant test | Sonnet | Add the invariant to `games-bots.spec.mjs`: every bot-against-bot game replays to the same state. |
| Part 2, undo rules and UI | Opus for the rules, Sonnet for the UI | Needs owner decision 2. |
| Parts 3 and 4 | Sonnet | Refactor under the existing specs. Land in small steps; games-ui reads `index.html` near the `GAMES.` calls. |
| Parts 5 and 6 | Opus to confirm the shape against one real game (Qwixx or Zombie Dice), then Sonnet | Do not build ahead of a game that needs it. |

Lane: games-core (`v4-games-core`). Post `TOUCHING games/core.js` on the board first; games-ui consumes the API, so land the doc change to games-engine.md before the code.

## Done when

- Every state has `v` and `seq`; v1 fixtures for all five games load and finish.
- `replay(setup, actions)` equals the live state for seeded bot games of every game.
- games-engine.md describes what the code does, including where Yacht's rules live.
