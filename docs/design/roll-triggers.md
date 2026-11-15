# Roll triggers and the reroll shorthand (draft)

Status: draft for owner review, 2026-11-14. Origin: Playtest 2 (PD-142.14.2.1): the DM never rolled damage after three goblin hits, and the halfling rogue (Pip) has no way to express "reroll a natural 1". Owner decisions so far: rerolls are **per die**, the trigger form is the preferred direction, the `r1` shorthand should ship **before** the full trigger system, and every shorthand stays alongside a compatible, more expressive longhand.

Not yet read against the source: this doc describes the notation as the user guide (`docs/guide/04-sets-and-editor.md`) states it. Check the parser in `index.html` before implementing.

## Two phases of work

1. **Phase 1, soon: per-die reroll `r`.** A new dice-term modifier, no trigger syntax needed.
2. **Phase 2: triggers.** A uniform `:trigger(action)` postfix that every existing shorthand can be written as. Chains (attack, then damage) and character traits build on it.

Phase 1 must not paint Phase 2 into a corner: `r1` is defined as sugar for a trigger so the two always agree.

## The roll pipeline

A roll moves through fixed phases. Each shorthand and each trigger belongs to exactly one.

| Phase | What happens | Examples |
|---|---|---|
| `setup` | the pool of dice is decided, before anything is thrown | `adv`, `dis`, `Nx` |
| `die` | each die lands; a die may be re-thrown | `r1`, later exploding dice |
| `pool` | keep and drop across the pool | `kh3`, `kl1`, `dl1` |
| `total` | the modifier is added and the total is final | `+5` |
| `result` | something reacts to the finished roll | result tables, `nat1` / `nat20` labels, `hit`, `crit`, `damage` |

Order is fixed by phase, not by where the text sits in the string, so `2d20kh1r1` and `2d20r1kh1` mean the same thing: reroll first, then keep.

## Phase 1: `r` per-die reroll

### Syntax
`<count>d<sides>r<condition>` where condition is one of:

| Written | Rerolls a die when it shows |
|---|---|
| `r1` | exactly 1 |
| `r<3` | less than 3 (1 or 2) |
| `r<=2` | 2 or less (same as `r<3`) |
| `r>18`, `r>=19` | above / at least |

Examples: `d20r1+5` (halfling attack), `2d6r<3` (Great Weapon Fighting damage), `d20adv+5` with `r1` as `d20 adv r1+5`.

### Semantics
- **Reroll once.** The new value stands even if it matches again (the 5e Halfling Lucky and Great Weapon Fighting wording). There is no recursive form (`rr`) in Phase 1.
- **Per die, before keep and drop.** With advantage (`2d20kh1r1`), each die that shows a 1 is re-thrown on its own; then the highest of the two is kept. This is stricter than restarting the whole roll.
- **The final die decides labels.** A re-thrown 1 that becomes a 14 is not a NATURAL 1.
- **The original value stays visible** in the breakdown, like a dropped die: `1d20: 1→14 + 5 = 19`. It also appears in the log and in Copy / Save text.
- **Rerolled dice do not count toward the 24-dice cap.**
- **Groups:** `4x d20r1+2` applies the reroll to each die in each of the four rolls.
- **Parse errors:** a condition that matches every face (`d6r<7`) is rejected with a message ("would reroll every face"). `r` with no condition is rejected. Sides must already be supported.
- **Name clash to avoid:** Roll20 uses `ro` for reroll once and `r` for reroll until it stops matching; Foundry's `r` is once (from memory, check before relying on it). We follow the Foundry reading and document it in guide 04, which currently lists `4d6r1` under "Not understood yet".

### Normal form
The box rewrites to `<count>d<sides>r<condition>`, with `r` after any `kh`/`kl`: `2d20r1kh1`. `adv` expands to `2d20kh1` as it does today, with `r` before the keep.

### Open implementation questions
- Is a rerolled die thrown again physically on the table, or only re-evaluated? Physically is truest to the app but costs settle time (rolls already take 1-2 minutes on the software renderer). Decide after checking how a roll resolves today.
- Where the re-thrown die sits while its first value is shown.

### Tests (when built)
Parser (accept, normalise, reject), evaluation order with keep (`2d20kh1r1`), final-die natural labels, breakdown and log text, group roll, seeded reproducibility (`?seed=N`), the dice cap.

## Phase 2: triggers

### Grammar
```
roll    := spec (":" trigger "(" action ")")*
spec    := the current dice notation, group prefix included
trigger := adv | dis | face<cond> | nat1 | nat20 | hit | miss | crit | total<cond> | ...
action  := reroll | null | rollspec | pool(<ops>) | label(text) | table
```
- Triggers are repeatable and independent. `:nat1(null)` cancels a default (`nat1` fumble label), as proposed by the owner.
- A bare trigger with a built-in default may omit its action: `d20:adv` means `d20:adv(+1 kh1)`.
- The phase of a clause comes from its trigger, and a trigger may only take actions legal in that phase (`reroll` only on a `die` trigger, `rollspec` only on a `result` trigger).

### `nat1` and the `die` phase
`nat1` means "a die shows its lowest face" in the `die` phase and "the kept d20 was a 1" in the `result` phase. The action decides which: `reroll` makes it a die trigger, `damage(...)` a result trigger. `d20r1` is sugar for `d20:nat1(reroll)`; on other dice the same thing is `:face1(reroll)` and `r1` works on any die. Needs the owner's decision (see open questions).

### Mapping every current shorthand
Every shorthand below stays valid. The trigger form is its exact longhand equivalent (see "Shorthand and longhand").

| Today | Phase | Trigger form (longhand) | Note |
|---|---|---|---|
| `NdS`, `+N`, mixed dice | setup / total | none, these are terms | terms, no trigger needed |
| `d20 adv` | setup | `d20:adv` (= `:adv(+1 kh1)`) | today the box expands it to `2d20kh1`; see Shorthand and longhand |
| `d20 dis` | setup | `d20:dis` (= `:dis(+1 kl1)`) | same |
| Adv / Dis buttons | setup | toggle the `:adv` / `:dis` clause on the set | UI over the clause |
| `kh N`, `kl N` | pool | `:pool(kh N)` | a keep is a property of its dice term |
| `dl N`, `dh N` | pool | `:pool(dl N)` | normalised to `kh`/`kl` today |
| `r1` (Phase 1) | die | `:nat1(reroll)` or `:face1(reroll)` | `r1` ships first (Phase 1) |
| `Nx spec` | setup | `spec:x(N)` | the prefix stays |
| result table | result | `:table` with the set's lines | stored on the set as today |
| NATURAL 1 / NATURAL 20 label | result | `:nat1(label)`, `:nat20(label)` as defaults | built in; `(null)` cancels |
| log `+ label` | result | `:label(text)` | log action, not stored |
| log `+ init` | result | `:init` | log action; idea only |

## Shorthand and longhand

Owner direction (2026-11-14): keep the shorthand, and add a compatible, more expressive longhand. Both are first-class.

- **Same model, two spellings.** The parser reads shorthand and longhand into one internal roll model. Nothing is stored as text only.
- **Shorthand is the subset of longhand that uses default actions.** Every row of the table above is an exact equivalence: `d20 adv+5` = `d20:adv+5` = `d20:adv(+1 kh1)+5`; `4d6kh3` = `4d6:pool(kh3)`; `d20r1` = `d20:nat1(reroll)`; `4x d20+2` = `d20+2:x(4)`. The test for the whole system is a round trip: for every row, parsing either spelling gives the same model, and the model prints back to both.
- **Longhand is a superset.** It adds what shorthand cannot say: chains (`:hit(2d8+2)`), conditions on the total (`:total>=15(...)`), a bounded recursive reroll (`:face1(reroll max 3)`, where `r1` is always once), cancelling a default (`:nat1(null)`), and trait-injected clauses. A set that uses any of those is shown in longhand because shorthand cannot express it.
- **Display follows the set.** The box shows what the player typed. A saved set shows shorthand when its model is shorthand-expressible and longhand otherwise; the set editor has an Expand / Collapse toggle to switch a set between the two when both are possible. The log prefers shorthand because the entry header is narrow on a phone (round 2 found headers truncating, PD-142.14.2.1.10).
- **Both are accepted everywhere** a notation is typed: the set editor, the quick roll bar, and a future chip editor that writes longhand.
- **Rewriting stays gentle.** Today the box rewrites `d20 adv` to `2d20kh1`. With both spellings, the rewrite should not turn the player's shorthand into a different spelling of itself; it normalises only spacing, case and ordering (`d20+5 adv` accepted and shown as `d20 adv+5`).

### Does `d20:advantage(+d20kh1)` map?
Almost. Advantage fits as a `setup` trigger: it fires before anything is thrown and edits the pool. Two adjustments:

1. The action cannot be a roll spec. `+d20kh1` is a second term, and `kh1` applies only inside its own term (one die, so a no-op). The keep has to span both d20s, so the action is a pool edit: `d20:adv(+1 kh1)` adds one die to the pool, then keeps the highest. `d20:dis(+1 kl1)` is the pair.
2. Use the short names `adv` and `dis`, which the box already uses (the guide notes that spelled-out "advantage" is not understood).

Advantage is also situational. It is granted by circumstances, so it is best a toggle on the set, and 5e's rule that advantage and disadvantage cancel (and that multiple sources do not stack) belongs to the trigger, not to the player. If both `:adv` and `:dis` are present the pool stays a plain d20.

### Chains
- `:hit(2d8+2)` rolls damage when the roll succeeds. "Success" needs a target: either `vs 17` on the roll or a **Hit → roll damage** button on the log entry (the DM declares the hit). Both can exist.
- `:crit(+2d8)` extra dice on a natural 20 (or on a hit when the 5e crit rule applies).
- A chained roll is logged with its parent so Copy / Save keep the pair together; this also answers the round-1 question of which roll counts (PD-142.14.1.16).

### Traits
A trait is a named bundle that injects clauses into matching rolls by tag. Halfling Lucky injects `r1` into rolls tagged `attack`, `check` or `save`; it is listed on the character and shown in the log ("Lucky: 1→14"). Needs roll tags on sets. A later design.

## Variables (future, owner direction 2026-11-14)

Expressive specs should be able to read character variables, user inputs, globals and game inputs. Not for Phase 1, but the grammar reserves the space now so adding it never breaks a saved set.

- **Reference syntax: `$name`.** A variable can stand wherever a number, a die count or a whole roll spec can: `d20+$str`, `$sneak_dice d6`, `:hit($sneak)`, `:total>=$ac(...)`. `$ac` also solves "hit needs a target" without a separate `vs` clause. `$` collides with nothing in the current notation.
- **Scopes, innermost wins:** roll prompt, set, character, game/session, global. A character sheet is just the character scope: `$str`, `$prof`, `$level`, derived values such as `$str_mod`.
- **Kinds:** number, dice expression (`2d8`), boolean toggle (`$raging`, `$blessed`, `$advantage_granted`). A toggle can gate a clause: `:if($blessed)(+d4)`. This is how traits become conditional (Halfling Lucky always on, Rage only while raging).
- **User inputs:** a prompt variable, `$?dc`, asks at roll time (a number field or a chip row) and keeps the answer for the session if marked sticky.
- **Game inputs:** the games engine already owns state; expose read-only values (`$game.round`, `$game.player`) by name rather than letting a spec reach into game internals.
- **Values are snapshotted into the log.** A log entry stores the numbers actually used (`d20+$str+$prof` shown as `d20+3+2`), so a later sheet change cannot rewrite history, and Copy / Save text stays reproducible.
- **Missing variable:** the roll does not run on a guess. The editor shows the missing name, and at roll time the player is asked for it once.
- **No code, no eval.** Specs allow a tiny expression grammar only: `+ - * /`, `floor()`, `min()`, `max()`, comparisons and `$` references, parsed by us. Derived values (`$str_mod = floor(($str-10)/2)`) live on the character, not in the roll.
- **Shorthand stays valid.** A variable can appear in shorthand wherever a number can (`d20+$str`). Longhand is needed only for gating and chains.
- **Where they live:** a character or global variable is saved with the character / bag file, a roll prompt is never saved. The save format needs a version bump when characters land; check `docs/design/design-format.md` for how the file is versioned.

## Open questions for the owner
1. Name for a face-based die trigger: `face1` / `face<3`, or only `nat1` plus `r<cond>`?
2. (Resolved 2026-11-14: keep both spellings, longhand is a superset; see "Shorthand and longhand".) Remaining detail: the exact longhand name of the pool clause (`:pool(kh3)`) and of the group clause (`:x(4)`).
3. Physical re-throw or re-evaluation for a rerolled die?
4. Does the Phase 1 `r<` family need `r>` for the table's `kl`-style cases, or is `r1` and `r<N` enough?
5. Should typed notation accept `d20+5 adv` (modifier before `adv`)? Playtest 2 found it rejected without a message (PD-142.14.2.1.1); recommended yes, normalising to `d20 adv+5`.

## Related
Cards: PD-142.42 (umbrella), .1 `r1` shorthand, .2 triggers and longhand, .3 chained rolls, .4 traits, .5 variables. Playtest 1 and 2 logs (`docs/playtests/`), cards PD-142.14.1.1 (advantage and keep notation), PD-142.14.1.2 (group rolls), PD-142.14.1.7 (result tables), PD-142.14.2.1.1, guide 04.
