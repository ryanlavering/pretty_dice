// Liar's Dice panel (hidden dice per viewer, pass-the-device) and computer seats in setup (PD-142.37).
import { test, expect } from './helpers/app.mjs';

const PIP = /[⚀-⚅]/g;
const panel = app => app.page.locator('#gamepanel');
const text = async app => (await panel(app).innerText());
const cupText = async app => (await app.page.locator('#gamepanel .cups').innerText());   // the cups only (the face picker also draws die faces)
async function open(app, seed, players = 2, bots = []) {
  await app.reset(seed); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'liarsdice');
  await app.page.selectOption('#gamepanel select >> nth=1', String(players));
  for (const b of bots) await app.page.check(`#gamepanel input[aria-label="Seat ${b + 1} is a computer player"]`);
  await app.page.click('#gamepanel button.big');
}
async function rollUnderCup(app) {
  await app.page.click('#gamepanel button.big');   // Roll N dice under the cup
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
}

test('liar\'s dice hot-seat: pass screens hide dice, each player sees only their own cup, reveal shows all', async ({ shared: app }) => {
  await open(app, 71);
  await expect(panel(app)).toContainText('Pass the device to Player 1');
  expect(await text(app)).not.toMatch(PIP);
  await app.page.click('#gamepanel button:has-text("I\'m Player 1")');
  await expect(panel(app).locator('button.big')).toContainText('under the cup');
  await rollUnderCup(app);
  await expect.poll(() => app.run(pd => pd.rolling), { timeout: 5000 }).toBe(false);   // the set goes back to the showcase: no values on the mat
  await expect(panel(app)).toContainText('Pass the device to Player 2');
  expect(await text(app)).not.toMatch(PIP);                                              // nothing of Player 1's dice on screen
  await app.page.click('#gamepanel button:has-text("I\'m Player 2")');
  await rollUnderCup(app);
  // bidding starts with the starter: pass screen again, then only their own five dice are drawn
  const who = await app.run(pd => pd.GAMES.status(pd.game.state, null).handoff);
  await app.page.click(`#gamepanel button:has-text("I'm Player ${who + 1}")`);
  expect((await cupText(app)).match(PIP) || []).toHaveLength(0);                          // the rows show dots, never your dice
  const full = await app.run(pd => pd.game.state.hands);
  await expect(app.page.locator('#cuppeek')).toBeHidden();
  const box = await app.page.locator('#gamepanel .cup.peekme').boundingBox();
  await app.page.mouse.move(box.x + 20, box.y + box.height / 2); await app.page.mouse.down();   // press and hold: big dice
  await expect(app.page.locator('#cuppeek .bigdie')).toHaveText(full[who].map(String));
  await app.page.mouse.up();
  await expect(app.page.locator('#cuppeek')).toBeHidden();                                  // released: hidden again
  await app.page.click('#gamepanel button:has-text("Bid")');                              // minimal first bid
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bid !== null)).toBe(true);
  await expect(panel(app)).toContainText(`Pass the device to Player ${2 - who}`);
  await app.page.click(`#gamepanel button:has-text("I'm Player ${2 - who}")`);
  await app.page.click('#gamepanel button:has-text("Challenge")');
  await expect(panel(app)).toContainText('Next round');
  expect((await cupText(app)).match(PIP)).toHaveLength(10);                                 // reveal: both cups open
  await app.page.click('#gamepanel button:has-text("Next round")');
  await app.run(pd => pd.endGame());
});

test('liar\'s dice with a bot seat: the human sees their own cup, the bot rolls out of sight and bids on its own', async ({ shared: app }) => {
  await open(app, 72, 2, [1]);
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bots)).toEqual([1]);
  expect(await app.run(pd => pd.gviewer())).toBe(0);                                      // a lone human never gets a pass screen
  await rollUnderCup(app);
  await expect.poll(() => app.run(pd => pd.GAMES.status(pd.game.state).phase), { timeout: 20000 }).toBe('bid');   // the bot rolled itself (simulated, not thrown)
  expect((await cupText(app)).match(PIP) || []).toHaveLength(0);                          // nobody's dice are on screen until you hold your row
  const box = await app.page.locator('#gamepanel .cup.peekme').boundingBox();
  await app.page.mouse.move(box.x + 20, box.y + box.height / 2); await app.page.mouse.down();
  await expect(app.page.locator('#cuppeek .bigdie')).toHaveCount(5);
  await app.page.mouse.up();
  expect(await app.run(pd => pd.rolling)).toBe(false);
  await app.run(pd => pd.endGame());
});

test('bot seat in another game: the bot takes its turn by itself and hands back', async ({ shared: app }) => {
  await app.reset(73); await app.run(pd => pd.openGames());
  await app.page.selectOption('#gamepanel select >> nth=0', 'pig');
  await app.page.selectOption('#gamepanel select >> nth=1', '2');
  await app.page.check('#gamepanel input[aria-label="Seat 2 is a computer player"]');
  await app.page.click('#gamepanel button.big');
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).bots)).toEqual([1]);
  expect(await app.run(pd => pd.game.state.players[1])).toBe('Bot 2');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const st = await app.run(pd => pd.GAMES.status(pd.game.state));
  if (st.canBank && st.player === 0) await app.page.click('#gamepanel button:has-text("Bank")');
  await expect.poll(() => app.run(pd => { const s = pd.GAMES.status(pd.game.state); return s.botTurn; }), { timeout: 15000 }).toBe(true);
  // the test page does not step physics on its own, so settle each of the bot's throws by hand; the bot decides (roll, bank) by itself
  for (let i = 0; i < 40; i++) {
    const bt = await app.run(pd => pd.GAMES.status(pd.game.state).botTurn); if (!bt) break;
    await app.page.waitForTimeout(900);                                                  // the bot's pause between moves
    await app.run(pd => { if (pd.GAMES.status(pd.game.state).botTurn && pd.GAMES.status(pd.game.state).canRoll) pd.simRoll({ rerolls: 6 }); });
  }
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).botTurn)).toBe(false);       // it rolled and banked or busted, then handed back
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).player)).toBe(0);
  await app.run(pd => pd.endGame());
});
