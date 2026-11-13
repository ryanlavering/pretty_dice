# Games engine: rule schema and API (PD-142.3)

Status: v1 contract, 2026-11-13, lane games-core. Consumers: games-ui (PD-142.4, .5). Gaps: post `NEED games-core` on the board.

## Principles

- **Pure model code.** No DOM, no three.js, no `Math.random`, no clocks. Everything lives in `games/` as ES modules and runs in node and in the browser.
- **The engine never rolls dice.** The app rolls (physics) and reports the settled face values. That keeps seeded tests exact and lets the real 3D dice drive the game.
- **State is plain JSON.** `JSON.stringify(state)` is the save format; `JSON.parse` restores it. Functions never mutate their input; each returns a new state.
- **Data-defined games, named engines for stateful ones.** Scoring games (Yahtzee, Farkle, Pig) are described by a small rule object plus scorer functions; Craps (PD-142.7) is a state machine with the same outer API.

## Import

```js
import { listGames, newGame, status, rollSpec, act, suggest, result } from 'pd-games';
```

`pd-games` is an import-map entry. Dev: `/games/index.js`. Offline and artifact builds: `scripts/build-static.py` bundles `games/*.js` into one `data:` URL (modules inside `games/` import each other with relative paths; the bundler flattens them). Do not import `games/` files by path from `index.html`.

## API

### `listGames()` -> `[GameInfo]`
```js
{ id: 'yahtzee', name: 'Yahtzee', minPlayers: 1, maxPlayers: 6,
  dice: { count: 5, sides: 6 },
  options: [{ id: 'joker', label: 'Joker rules', type: 'bool', default: true }] }
```
Option types: `bool`, `choice` (`choices: [{id,label}]`), `int` (`min`, `max`). The setup screen renders options from this list.

### `newGame(id, { players, options?, seed? })` -> `state`
`players` is an array of names (1 to `maxPlayers`). Unknown options fall back to defaults. `seed` is not used for dice (the app rolls); it only seeds any engine-side choice (none in v1), so tests can pass it freely.

### `status(state)` -> view of the turn
```js
{ phase: 'roll' | 'score' | 'over',   // 'roll': a roll is expected; 'score': must choose a category (or may keep rolling, see canRoll)
  player: 0,                           // index into state.players
  round: 1, rounds: 13,
  rollsUsed: 1, rollsLeft: 2,
  canRoll: true, canHold: true, canScore: true,
  held: [false, true, ...],            // per slot; slots are 0..dice.count-1
  dice: [4, 4, 2, 6, 1] | null,        // last settled values by slot, null before the first roll of a turn
  message: 'Roll 2 of 3' }             // short text for a status line (UI may ignore)
```

### `rollSpec(state)` -> what the app should roll now
```js
{ slots: [0, 2, 3], sides: [6, 6, 6] }   // slot indexes to throw (not held), and the sides of each die
```
Empty `slots` when `canRoll` is false. The app throws `slots.length` dice (using the active design, so the mat looks right), then calls `act` with the values **in slot order**.

### `act(state, action)` -> `{ ok, state, events, error? }`
On `ok: false` the original state is returned unchanged with a human-readable `error`. Actions:

| action | meaning |
|---|---|
| `{ type: 'roll', values: [3, 5, 1] }` | settled values for the slots from `rollSpec`, in slot order |
| `{ type: 'hold', slot: 2, held: true }` | hold or release one die (`held` omitted = toggle); only when `canHold` |
| `{ type: 'score', category: 'fullHouse' }` | take a score (Yahtzee); for Farkle use `{type:'score', dice:[slotsToSet aside]}`, `{type:'bank'}`; Pig `{type:'hold'}` is named `{type:'bank'}` too, see game notes |
| `{ type: 'pass' }` | end the turn with no score where the game allows (Farkle bust is automatic, not a `pass`) |

`events` is an array the UI can animate or log: `{ type: 'scored', player, category, points }`, `{ type: 'bonus', player, name, points }`, `{ type: 'turn', player }`, `{ type: 'bust', player }`, `{ type: 'gameOver' }`. The engine advances the turn itself after a score; the UI never advances turns.

### `suggest(state)` -> `[Suggestion]`
```js
[{ category: 'fullHouse', label: 'Full House', points: 25, open: true, best: false }, ...]
```
One entry per category for the current player (all of them, including taken ones with `open: false` and their score in `points`), so the UI can draw the scorecard and highlight. `best` marks the highest-scoring open category (ties: the first listed). Before the first roll `points` for open categories is `null`. The UI decides whether to show suggestions (the setup toggle); the engine always computes them.

### `result(state)` -> final standings
`null` until `phase === 'over'`, then `{ ranking: [{ player, name, total, rank }], winners: [playerIndex...] }` (ties share a rank).

### `scorecard(state, playerIndex)` -> rows for drawing the sheet
```js
{ sections: [{ id: 'upper', label: 'Upper', rows: [{ category: 'ones', label: 'Ones', points: 3 | null }], subtotal, bonus }, ...], total }
```

## Rule schema (data-defined games)

A game module exports a rule object; the engine core (`games/core.js`) supplies turns, players, holds, round counting and result ranking.

```js
{ id, name, minPlayers, maxPlayers,
  dice: { count, sides },
  rollsPerTurn: 3,                 // 1 for games that roll once per decision
  hold: true,                      // dice may be held between rolls
  rounds: 13,                      // turns each; null = play to a target score
  options: [...],                  // as in listGames
  categories: [{ id, label, section, score(dice, ctx) -> points }],   // scorecard games
  bonuses:   [{ id, label, section, applies(card, ctx) -> points }],
  total(card, ctx) -> number }
```

`ctx` carries `{ options, dice, card }` so scorers can check the joker rule. Stateful games (Farkle, Pig, Craps) supply `init`, `status`, `rollSpec`, `act`, `suggest`, `result` directly with the same signatures; `core.js` just routes by id.

## Game notes

- **Yahtzee** (PD-142.5): 13 categories, upper bonus 35 at 63+, Yahtzee bonus 100 per extra Yahtzee, forced Joker rule (option `joker`, default on). Rolls 5 dice up to 3 times; held dice are kept.
- **Farkle / Pig** (PD-142.6): target score (options), per-turn running total, `bank` to keep, bust ends the turn with no score. Details land with that card.
- **Craps** (PD-142.7): `rollSpec` is always 2d6; phases `comeOut` / `point`; bets list in state; play-money bankroll; `act` gains `{type:'bet', ...}` and `{type:'removeBet', id}`. Details land with that card.

## Testing

`tests/games.spec.mjs` (tagged `@quick`) imports `games/index.js` directly in node via a Playwright test with no page (no browser boot) and drives games with fixed value sequences.
