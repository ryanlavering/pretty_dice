# Games engine: what it cannot support yet

Status: audit 2026-11-13, lane games-core. Companion to [games-engine.md](games-engine.md). Popularity is my judgment of how widely a game is known and played (high / medium / low), not measured data. Sizes are rough: S = a day or less, M = a few days, L = a week or more, XL = a project of its own.

## What the engine does today

Hot-seat turns on one device. All state is visible JSON. The app rolls (physics) and reports settled values; the engine validates and scores. Supported shapes: hold between rolls (Yahtzee), set-aside and push-your-luck (Farkle, Pig), a changing number of dice per roll (Shut the Box), automatic locking (Ship, Captain and Crew), per-player bankrolls with bets and a shared shooter (Craps), rounds, lowest- or highest-wins ranking. Built: Yahtzee, Farkle, Pig, Craps, Shut the Box, Ship Captain and Crew, Bunco (individual).

## Fits the current engine (not built, no new feature needed)

| Game | Popularity | Notes |
|---|---|---|
| Left-Right-Center | medium | Chips move between neighbouring players; dice count depends on chips (already possible). S. |
| 10000 / Farkle scoring variants | high | Scoring tables as option presets in `farkle.js`. S. |
| Poker Dice, Generala | medium | Roll 5 dice up to 3 times with holds, rank the hand. Needs a hand-ranking scorer only. S. |
| Yacht, Kismet, Maxi Yahtzee (6 dice), Triple Yahtzee | medium | See "Variant scorecards": the Yahtzee engine hard-codes its 13 categories and 5 dice. S to make that data-driven, then each variant is configuration. |
| Snake Eyes, Over/Under 7, Beat the Banker style single-roll bets | low | Same shape as Craps single-roll bets. S each. |

## Gaps

| # | Gap | Games affected | Missing engine feature | Size | Popularity |
|---|---|---|---|---|---|
| 1 | Hidden information and bidding | Liar's Dice / Perudo / Dudo, Mexico / Meyer, Poker Dice bluffing variants | Per-player views (`view(state, player)` that redacts other players' dice), a cup that hides a roll until challenged, bid/claim/challenge as a turn structure, a pass-the-device privacy screen in the UI. Everything the engine returns is currently public. | M | high (Liar's Dice), medium (Mexico) |
| 2 | Custom-face dice and dice pools | Zombie Dice, Dice Forge, Cosmic Wimpout, Sagrada-style drafting, Kingsburg | Die identity (colour or type per die, not just `sides`), non-numeric faces (brain, shotgun, sword), a pool or cup you draw dice from, shared pools players take dice from. The app already has a custom die designer and a bag, so this is mostly engine data plus UI mapping from faces to designs. | M to L | medium to high (Zombie Dice) |
| 3 | Simultaneous decisions on one roll, roll-and-write | Qwixx, Qwinto, Ganz Schön Clever, Railroad Ink | A "decision round" where every player acts on the same roll (hot-seat: each in turn without re-rolling), coloured dice with ownership rules (white dice for all, coloured for the active player), per-player boards that are not a simple scorecard. | M | high (Qwixx) |
| 4 | Teams, tables and rotation | Bunco as played socially (12 players, 3 tables, teams, round ends at 21, winners move), team Yahtzee | Team scoring is small. Table rotation and round-ends-at-21 need a tournament layer above single games. The built Bunco is the one-table individual version. | S (teams) to M (tables) | high (US social play) |
| 5 | Board-integrated games | Backgammon, Ludo, Snakes and Ladders, Monopoly, Catan, Sorry | A board model (positions, legal moves from the roll), piece state, board rendering in the UI, often doubling cubes and capture rules. Backgammon also needs AI or two humans on one board. Very different surface from the dice mat. | XL | very high |
| 6 | Craps extras | Come / don't come, hardways, proposition bets, buy/lay with commission, big 6/8, Sic Bo, Hazard | Each come bet carries its own point (bets with sub-state), hardways need both dice (already passed in), commission needs a house edge rule. All fit the current bet model. Cee-lo needs a banker and bets between players (transfers, not house bets). | S to M | medium (high among craps players) |
| 7 | Variant scorecards | Yacht, Kismet, Maxi Yahtzee, Triple Yahtzee, Yahtzee Free-for-all, Balut, Generala, Poker Dice | The Yahtzee categories, dice count (5) and joker rules are hard-coded in `games/yahtzee.js`, not data-defined as the schema in games-engine.md describes. Make categories, dice count and rolls per turn configuration, add multi-card and column-multiplier variants. Balut's exact rules I have not verified. | S to M | medium |
| 8 | Computer opponents | Any game; most useful for Yahtzee, Farkle, Pig, Craps shooter-less play | No `ai` player type. Needs a `decide(state)` per game: simple heuristics are S per game (Pig hold-at-20, Farkle thresholds, Yahtzee best-suggest), expected-value play is M, bluffing AI (Liar's Dice) is L. | M | high (anyone playing alone) |
| 9 | Real-time and timed play | Tenzi, speed Yahtzee, Boggle-style races | The engine has no clock; a timer must come from the UI as an action field. Solo timed play is S. Real-time multi-player needs simultaneous input from several people, which one device cannot do. | S (solo) / L (multi) | medium |
| 10 | Networked multiplayer | Everything, especially hidden-information games | Rooms, an authoritative state holder, action log sync, redacted views per player (gap 1), reconnects. The pure, serializable engine suits this (replay the action log), but it needs a server, which v4 ("no server") rules out. | XL | high demand |

## Ordering suggestion (if the owner wants more games)

1. Variant scorecards (7) and computer opponents (8): they widen the games already built.
2. Hidden information (1): unlocks Liar's Dice, the most requested missing game, and is the basis for networked play.
3. Custom faces and pools (2): the app's custom dice make this a good fit, and Zombie Dice is a fun showcase.
4. Simultaneous decisions (3): Qwixx.
5. Board games (5) and networked play (10) are separate products and should be scoped on their own after v4.

## Follow-up cards

Each gap above has a low-priority research card under PD-142 labelled `games`, `research`: gap 1 = PD-142.17, 2 = .18, 3 = .19, 4 = .20, 5 = .21, 6 = .22, 7 = .23, 8 = .24, 9 = .25, 10 = .26. The "fits today" games have no card; say if you want them built. Research means: confirm the rules, write the contract change to games-engine.md, estimate the work, then build only on the owner's go-ahead.
