# Playtester D (novice) - Story Dice report (desktop 1280x800)
Shots: .../pt/shots-D/. Driving the roll/dice with scripts, so the 60 s software-render roll time is NOT an app finding. Not done: deleting a set (menu click missed), 2-human full game (a die came up leaning, my script stalled; setup/names verified), 3-play-again loop beyond End game.

## 1 Cold start
- **Opens in Design room, nothing says "games are over there"** (confusing). First click: Play (guess). Then Games tab (hidden behind a "New" dot; ignored). Then a dropdown "Yacht" -> choose Story Dice. Then Start game. = 4 clicks + one dropdown. Yacht is preselected, so a person wanting Story Dice must find the dropdown. shot 01-cold, 01-games.
- **Start game button is below the fold** with Story Dice settings (y=794 of 800); with 2 players it's off screen and the whole side panel scrolls, hiding the Design/Play switch. A real click missed it in my test. (confusing) 03-b-start.
- Choosing Story Dice in the dropdown instantly swaps the table from my d20 to five white glyph dice (before Start). Surprising. 01-storyselect.

## 2 Playing
- Roll > dice tumble > they line up in a row at the bottom, rings 1-5 appear on top. Status line says "put the dice in story order / 0 of 5 placed: click the dice in order, or drag them onto the rings". That is clear. Good.
- **Word hints**: cards "mask / n: mask, play / adj: ... adv: ... v: ..." are jargon (n/adj/adv/v) and are not tied to a die; the card for a die disappears when you place it. If you hide the side pane (H) the words vanish entirely. 05-m-hidepane. There is no "hint" button; the eye icon is "Hold to look from above" (tooltip) which looks like a hint icon. (confusing)
- Placing: clicking dice in order works; dice fly into rings. Last die is not auto-placed (fine).
- After 5 placed: a sentence appears ("One day, a loaf rose beyond the high string...") plus "The bot's version is a prompt: tell your own." In a solo game with no bot, "bot's version" is baffling. Button "Re-word" wraps as "Re-/word" and rewrites the sentence (works). 01-g1-s1-placed.
- Rating buttons "Bad · 0 / Fair · 1 / Good · 2" in the panel AND again in the bottom dock "Bad 0 Fair 1 Good 2" (duplicate, different punctuation). Nothing explains who judges or what the numbers mean beyond the digit; no tooltip. Scoring = points per story, total at the bottom; that is guessable but never written.
- Scoreboard: columns per player, current player gold; "1 fair", then Total. In a bot game the scoreboard is pushed below the fold by the word cards (scroll needed).
- Rating immediately starts next story, dice just drop on the table: no "Story 2 starts" message other than top line "+1 (fair)" and "Roll the dice". OK but terse. 02-g2-rated.
- **End of game**: "Game over: Player 1 wins with 4" (solo: nobody to win against), tie shows "Player 1 & Bot 2 win with 2". The big button still says "End game" and there is no "Play again" / "New game". Roll button looks enabled-gold but is disabled. Dice stay sprawled. 02-g3-end, 07-bot-end. To play again you must click End game, then you're back in the setup form (Story Dice still selected, good). To return to ordinary rolling: no obvious way; after End game the table keeps the 5 white d12 glyph dice and dock formula "5d12", my original d20 is not back until I change dice (where did my d20 go?). 02-y-endgame.
- Log tab after game: "5d12: 7+12+4+9+4 = 36" sums of glyph dice - meaningless. "Story order: sun -> bone -> ..." is nice.
- Bot game: setup shows second name field with Bot checkbox; bot appears as "Bot 2" (name field "Player 2" is replaced). Turn banner is clear ("Bot 2: the bot is rolling / arranging the dice"). For bot's story: top line says "Bot 2: tell it, then rate the story" while panel says "Judge Bot 2's story (an ad-lib): rate it to continue." Conflicting; "ad-lib" jargon; and "Re-word" offered on a bot story. Bot sentence is silly filler ("...To be continued, probably.") - funny, fine. 05-bot-botstory.
- Two humans: names typed fine (Ann, Ben verified in the form). In one run Player 1's name reverted to "Player 1" after I changed "Stories each" first (not reproduced in a clean run - unverified). Turn indicator: gold column + "Player 1: roll the dice". 03-two-placed0.
- **Leaning die**: one roll ended with a die tilted on another, pink ring, message "Fix 1 leaning die". No instruction on how to fix (roll again? nudge?). (confusing) 03-two-placed0.
- "Stories each", "Set number", "Faces per die", "Show word hints" are unexplained. "Set number 1" is mystery. Glyph pack list shows licences (OFL 1.1, CC BY...) as the main text - noisy.

## 3 Mistakes
- Roll twice (double click + R key + Space): Roll disables itself right after the first click; no double roll. Good.
- Drag a die off the table / into the side panel / to the bottom edge: it snaps back to its row. Good.
- Click dice to hold: not tried deliberately in game; clicking a die in the row = place it.
- **End game: no confirmation, no undo**; wipes scores instantly. (bug-ish/high) 02-y-endgame.
- Hide side pane mid-game: loses word hints and scoreboard; "Close" exists only in setup form.
- Design room mid-game: allowed silently; going back kept the game state. Fine but nothing warns.
- **Clicking Design 1 in the Bag mid-game re-skins the story dice (white -> green swirl) and bag closes**; the glyph words also differed. The re-skin vanished after End game. Unexpected. 01-y-bag-click-design.
- Bag mid-game only lists my d20 "Design 1", not the story dice.

## 4 Story Dice sets editor
- Games > Story Dice > "Story Dice sets..." opens a list: "No Story Dice sets yet. Make one: pick the glyph packs, the dice and a seed." Reasonably clear. Opening it swaps the table to a d20 (obsidian).
- "New Story set": name field + Save, glyph packs, dice +/-, faces, Seed, "Reroll seed", "Faces on the dice", "Glyph order", PREVIEW (rows of tiny glyphs), a sample sentence, "SET TEXT / Copy / Use in game / Roll it". Understandable-ish; "Seed" and "SET TEXT" are jargon. Pack list is a small nested scroller. Changing dice count re-rolls the table. Quick-roll formula shows "5d12{noto#332}" - jargon.
- Save works with a real click (my first scripted click did not, my fault). After Save you return to the list showing "Frog Night - noto, 4 x d12, seed 391, different dice" with icons for roll/edit/menu. Close in editor asks "Discard your changes? Discard / Keep editing" even after Save (before returning) - confusing about whether it saved.
- Saving also makes the bag's "Design 1" show "Modified" with Save / Save as copy / Revert and "Bag modified / Bag not saved to a file" - heavy bag jargon for someone who just made a game set. The lightning button rolls the set (log: "4d12: frog=12 + sun=8 + hat=4 + arm=11 = 35" - meaningless sum). Icon-only buttons (lightning, pencil, dots) have no visible words. Delete not tested.

## 5/6 Wording and "did that work?"
- "Bad / Fair / Good" never explained; "ad-lib", "prompt", "Re-word", "Hi-vis", "Autoswap", "n/adj/adv/v", "Seed", "Set number".
- "Hi-vis: flat glyph tiles instead of the 3D dice" - useful but jargon name.
- Dice overlap rings 2/3 right after roll; ring labels fade at hide-pane (minor).
- Page toast "UI paused 1.4 s - tap to copy details" shows constantly (my environment slow, but it looks like an error).
- Where did my stuff go: d20 after the game; Design 1 look after a game.

## What felt good
Ring placement is intuitive; click-to-place works; roll lockout; bot turn messages; sentences are fun; End game returns to setup with Story Dice kept.

## Top 5 to fix
1. End game: confirm, and a real end screen with "Play again" / "Back to normal rolling" (restore my previous dice).
2. Explain scoring: tooltips or one line for Bad 0 / Fair 1 / Good 2, who judges, and fix "bot's version is a prompt" in solo; fix conflicting bot-turn texts.
3. Make Start game always visible (sticky) and make Games discoverable from cold start (Design room opens first).
4. Word hints: show which die each belongs to, plain words instead of n/adj/adv/v, keep them when the pane is hidden.
5. Leaning die: say how to fix; stop the bag from restyling the dice mid-game; clean up set editor jargon (seed, set text, noto#, Modified/Save as copy).
