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

### `status(state, viewer?)` -> view of the turn
`viewer` is optional (a player index, `null` for the public view, omitted = sees everything). Only hidden-information games use it; see [games-hidden-info.md](games-hidden-info.md). The UI of such a game must draw from `status(state, viewer)`, never from the raw state. `redact(state, viewer)` returns a copy safe to show that viewer; `act` refuses a redacted copy.

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
| `{ type: 'score', category: 'fullHouse' }` | take a score (Yahtzee) |
| `{ type: 'score', dice: [0, 3] }` | Farkle: set these slots aside (every die must score) |
| `{ type: 'bank' }` | Farkle and Pig: keep the turn total and pass the turn |

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
- **Farkle** (PD-142.6): 6 dice, options `target` (10000) and `opening` (500, minimum turn total to get on the board; 0 = off). Flow: `roll` (the live slots) -> `score {dice}` sets aside scoring dice -> `roll` the rest or `bank`. A roll with nothing scoring auto-busts (events `rolled`, `bust`, `turn`). Setting aside all six emits `hotDice`, clears the set-aside and all six are live again. Scoring: 1 = 100, 5 = 50, three of a kind = face x 100 (1s = 1000), each extra die doubles it, 1-6 straight = 1500, three pairs = 1500. Reaching the target starts a final round (one more turn for everyone else, event `finalRound`). `suggest` returns the valid set-aside choices for the current roll: `[{ slots, points, label, best }]` sorted by points (empty before a roll).
- **Pig**: 1 die, option `target` (100). `roll` one value; a 1 busts (turn total lost, turn passes), otherwise it adds to the turn total; `bank` keeps it; reaching the target ends the game at once. `suggest` is always `[]`.
- Extra `status` fields for these two: `canBank`, `turnTotal`, `scores` (banked totals per player), `target`, and for Farkle `finalRound`. `held` marks Farkle's set-aside slots (display only; `canHold` is false). `scorecard(state, p)` returns `{ sections: [], total, turnTotal }`.
- **Craps** (PD-142.7, .32): `craps`, 1-6 players, options `bankroll` (500), `minBet` (5), `oddsMax` (3x). One shared table: `status.player` is the shooter; every player has a bankroll (`status.bankrolls`) and their own bets (`status.bets`: `{id, player, kind, amount, number?, on?}`); `status.stage` is `comeOut` or `point` with `status.point`. `rollSpec` is always two d6 (`values: [a, b]`). Payouts round down to whole units.
  - **Actions:** `{type:'bet', kind, amount, number?, on?, player?}` (`player` defaults to the shooter; `number` for place and hardway; `on` = id of the come/don't come bet for come odds), `{type:'removeBet', id}`, `{type:'roll', values}`, `{type:'end'}` (refunds open bets, closes the table, `result` ranks by bankroll).
  - **Roll in flight (PD-142.32):** `{type:'rollStart'}` when the dice are thrown sets `status.rolling` (`canBet` and `canRoll` go false); `bet`, `removeBet`, `end` and a second `rollStart` are refused with "No bets while the dice are rolling". `roll` (settled values) clears it; `{type:'rollCancel'}` clears it without a roll. Calling `roll` without `rollStart` still works.
  - **Kinds:** line `pass`, `dontPass` (come-out only), `passOdds`, `dontPassOdds` (behind the line bet, <= `oddsMax` x); `come`, `dontCome` (point stage; the next roll is the bet's own come-out and a number moves it, event `comeMove`), `comeOdds`, `dontComeOdds` (need `on` = a come/don't come bet that has a number, <= `oddsMax` x, off on a come-out roll: returned as a `push`); `place` 4/5/6/8/9/10, `hardway` 4/6/8/10 (7:1 on 4/10, 9:1 on 6/8; lose on the easy way or a 7), `bigSix`, `bigEight` (1:1) — all off on the come-out, stay up after winning; one-roll `field`, `anySeven` (4:1), `anyCraps` (7:1), `two` and `twelve` (30:1), `three` and `eleven` (15:1), `horn` (amount a multiple of 4, split over 2/3/11/12; the hit pays 30:1 or 15:1 on its quarter while the other three lose).
  - **Taking down:** pass, come, field, horn and the other one-roll bets cannot be removed; don't pass only once a point is set; don't pass and don't come take their lay odds with them; odds, place, hardway and big 6/8 come down any time (when not rolling). A come bet's number stays on it (`number: null` until its first roll).
  - **Events:** `betPlaced`, `betRemoved`, `rollStart`, `rollCancel`, `rolled {dice,total}`, `payout {player,id,kind,number,result:'win'|'lose'|'push',amount}` (net change), `comeMove`, `point`, `pointMade`, `sevenOut`, `shooter`, `gameOver`.
  - **`suggest(state, player?)`** lists the bets open to that player (default shooter): `[{kind, label, number?, on?, minBet, available, note, help}]`. Rows for unavailable bets are included (with a `note`) so the UI can grey them; `help` is a one-line plain-language rule for every kind. All rows are `available: false` while the dice are rolling. Odds rows appear once per eligible come bet (`on`, `number`), or as one disabled placeholder if there is none. Not modelled: buy/lay bets with commission, Sic Bo, Cee-lo (PD-142.22 remainder).
- **Shut the Box** (`shutbox`): options `tiles` (9), `oneDie` (true: one die once every tile above 6 is shut), `rounds` (1). `roll` then `{type:'score', tiles:[...]}` closing open tiles that add up to the roll; a roll with no match ends the turn and scores the open tiles (lower is better, 0 = shut the box, `status.lowWins` is true; `result` ranks ascending). `suggest` lists valid tile sets `[{tiles, label, best}]`. `status` adds `tiles` (open flags), `openTiles`, `openSum`, `scores`.
- **Ship, Captain and Crew** (`shipcaptain`): option `rounds` (3). 5 dice, 3 rolls. After each roll the engine locks a 6 (ship), then a 5 (captain), then a 4 (crew) automatically (events `ship`, `captain`, `crew`; locked slots show in `held`). With a crew, the other two dice are the cargo: `status.cargo`; `{type:'bank'}` keeps it early, otherwise the third roll ends the turn. Score is the cargo, or 0 without a crew (event `turnScore`). `status.lock` = slot of each role or null.
- **Bunco** (`bunco`, one-table individual version): option `rounds` (6). 3 dice; round n's target number is n (`status.targetNumber`). Each roll scores 1 per target die, 21 for three targets (Bunco), 5 for three of anything else; keep rolling while a roll scores, a roll with no points ends the turn. A round is one turn per player. Tables, teams and "round ends at 21" are not modelled (see games-engine-gaps.md).

- **Liar's Dice** (`liarsdice`, PD-142.17): 2-6 players, options `dice` (5) and `wild` (ones wild, bid 2-6 only). Hidden information: each cup is private until a challenge. Phases `roll` (each player rolls their own cup in seat order; `rollSpec` has `private: true` and `player`), `bid` (`{type:'bid', quantity, face}` or `{type:'challenge'}`), `reveal` (`{type:'next'}`), `over`. `status.handoff` is the player who must hold the device; `status.cups[i].dice` is `null` unless the viewer may see it. `suggest(state, viewer)` returns the legal bids with `chance` (probability the bid is true given the viewer's own dice) and a leading `challenge` row. Full rules, phases and the privacy contract: [games-hidden-info.md](games-hidden-info.md).

## Testing

`tests/games.spec.mjs` (tagged `@quick`) imports `games/index.js` directly in node via a Playwright test with no page (no browser boot) and drives games with fixed value sequences.
