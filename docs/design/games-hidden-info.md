# Hidden information and bidding: design note (PD-142.17)

Status: 2026-11-13, lane games-core; engine built to this note (games/liarsdice.js, tests/games-liarsdice.spec.mjs), UI contract open to change on review. First game: Liar's Dice. Extends [games-engine.md](games-engine.md); everything there still holds. Context for later: [games-engine-gaps.md](games-engine-gaps.md) gap 1 (also the basis for Mexico/Meyer and, eventually, networked play).

## What changes

Today every function returns the full public state. Hidden-information games need two things the engine does not have:

1. **A viewer.** Who is looking at the state. Dice a viewer may not see must not appear in anything the UI receives.
2. **A private roll.** The app throws a player's dice, but only that player may see the result until the round is revealed.

Bidding itself (bid, raise, challenge) is just a turn structure and needs no new engine concept.

## The viewer rule (generic, backward compatible)

Every read function takes an optional last argument `viewer`:

```js
status(state, viewer)     suggest(state, viewer)     scorecard(state, p)     result(state)
```

- `viewer` omitted or `'all'`: sees everything. This is today's behaviour, used by tests, the bots and any server. Existing games ignore the argument, so nothing changes for them. (Craps already takes a player as the second argument of `suggest`; that is the same idea.)
- `viewer = n` (a player index): sees public state plus player n's secrets.
- `viewer = null`: public view only (spectator, or the screen between players).

The full state still holds every player's dice (needed to resolve a challenge and to save/restore a game). **The UI must draw from `status(state, viewer)`, never from the raw state.** `redact(state, viewer)` returns a copy of the state with other players' secrets replaced by `null`, safe to send over a network later; `act` refuses a redacted state.

Saved games on one device contain everyone's dice in localStorage. We accept that (the same device is in the room); it is not a security boundary.

## Private rolls and the pass-the-device screen

`rollSpec(state)` gains `private: true` and `player: n` when the dice about to be thrown are secret. The UI throws them under a cup (dice hidden from the other players: games-ui decides how, for example a cup mesh over the settled dice, or a mask), and then calls `act({type:'roll', values})` as usual. The event for a private roll never contains the values (`{type:'rolled', player, private:true}`).

`status.handoff` is the player index who should be holding the device right now (the one who must roll, bid or acknowledge), or `null` when the screen is public (reveal, game over). When it changes the UI shows "Pass the device to <name>" until that player taps, and only then calls `status(state, thatPlayer)`. The engine cannot know the tap happened; that interstitial is UI only.

## Liar's Dice (id `liarsdice`)

Rules (the common casual version, close to Perudo without its special rounds):

- Each player starts with `dice` dice (default 5, option 3-6) in a private cup. 2-6 players.
- A round: every player rolls their own dice secretly. The starter bids a quantity and a face ("three 4s": at least three of all dice in play show 4). Each next player either **raises** (a higher quantity, or the same quantity with a higher face) or **challenges** the standing bid.
- Option `wild` (default on): ones count as any face, and bids are on faces 2-6 only. With it off, ones are an ordinary face.
- On a challenge everyone reveals. If the count is at least the bid quantity the bid was true and the challenger loses a die; otherwise the bidder loses a die. The loser starts the next round (if out, the next active player). A player with no dice is out. Last player standing wins.
- Not in this version (listed, not built): Perudo's palifico rounds, the "exact" (calza) call, ace-bid halving rules, bidding on ones under wild.

### Phases and actions

| `status.phase` | who | action |
|---|---|---|
| `roll` | `status.player` rolls their own cup, in seat order | `{type:'roll', values:[...]}` (one value per die they still have); `rollSpec` is private |
| `bid` | `status.player` | `{type:'bid', quantity, face}` or `{type:'challenge'}` (not allowed on the first bid of a round) |
| `reveal` | everyone | `{type:'next'}` starts the next round (or the game ends when one player is left) |
| `over` | | none; `result(state)` ranks the winner first, then by elimination order (later out = better) |

`act` errors are plain strings, as before ("Bid must raise the quantity or the face", "Ones are wild: bid 2-6", "Quantity too high: 9 dice in play").

### What the viewer sees (`status(state, viewer)`)

```js
{ phase, player, handoff, round, viewer,
  bid: { player, quantity, face } | null,          // the standing bid
  cups: [{ player, name, count, dice: [..] | null }],   // dice only for the viewer's own cup, or for everyone in 'reveal' / 'over'
  totalDice, wild, canBid, canChallenge,
  reveal: null | { count, quantity, face, bidTrue, loser, winner, cups },   // filled in the reveal phase
  message }
```

`count` is public (everyone knows how many dice each player has). Invariance test: two states that differ only in another player's hidden dice must produce identical `status(state, viewer)`; the spec checks this directly, so a leak fails a test.

### Suggestions (hint, same on/off switch as Yahtzee's)

`suggest(state, viewer)` for the bidding player returns the legal next bids as `[{ quantity, face, label, chance, kind: 'raise' | 'challenge' }]`, where `chance` is the probability (0-1) that the bid is true given the viewer's own dice and the unknown dice (exact binomial, wilds included). The challenge row's `chance` is the probability the standing bid is false. It is a teaching aid; games-ui can hide it with the suggestions toggle.

## Bots (PD-142.24) and networking

Bots call the same API with `viewer` set to their own seat, so they cannot cheat by construction. A networked game would keep the full state on the host and send each client `status(state, thatClient)`; the pure, serializable engine means replaying the action log reproduces a game. Neither is built here.

## Cost and risk

- Engine: one new game file plus the optional `viewer` argument threaded through `core.js` (small). Spec with fixed dice, including the leak test.
- UI (games-ui): the privacy hand-off screen, a cup/mask for private rolls, a bid picker, a reveal screen. The cup is the one real design question; the app's existing roll animation shows the dice before they settle, so the dice must be hidden for the whole throw or thrown "inside" the cup.
- Risk: a casual player may find passing the device clumsy; a one-tap "I'm ready" screen keeps it short.

## Decisions for the owner

1. Is the casual rule set above right, or should it follow Perudo (palifico, calza, ace-bid halving)? Recommended: casual first, Perudo as an option later.
2. Hint probabilities on by default for solo play against bots, off for hot-seat?
3. Show the dice under a cup for the whole throw (hidden), or let a player peek by holding a button?
