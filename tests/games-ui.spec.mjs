// PD-142.4/.5: the Games panel drives the pd-games engine from real dice rolls (Yahtzee).
import { test, expect } from './helpers/app.mjs';

test('yahtzee: engine gets the real dice, holds keep dice, scoring advances the turn', async ({ shared: app }) => {
  await app.reset(41);
  await app.run(pd => { pd.openGames(); });
  await app.page.click('#gamepanel button.big');   // Start game (1 player)
  if (await app.page.locator('#gamepanel td').count() === 0) await app.page.click('text=Scorecard');
  expect(await app.run(pd => pd.state.notation)).toBe('5d6');
  await app.run(pd => pd.simRoll());
  const a = await app.run(pd => { const st = pd.GAMES.status(pd.game.state); return { st }; });
  expect(a.st.rollsUsed).toBe(1);
  const d1 = a.st.dice;
  expect(d1.every(v => v >= 1 && v <= 6)).toBe(true);
  expect(await app.run(pd => pd.toggleHold(0) && pd.toggleHold(2))).toBe(true);
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).held)).toEqual([true, false, true, false, false]);
  expect(await app.run(pd => pd.held)).toEqual([0, 2]);
  await app.run(pd => pd.simRoll());
  const b = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(b.rollsUsed).toBe(2);
  expect([b.dice[0], b.dice[2]]).toEqual([d1[0], d1[2]]);   // held dice keep their values
  // tap the best suggestion on the scorecard
  const before = await app.run(pd => pd.GAMES.status(pd.game.state).round);
  await app.page.click('#gamepanel td.pick.best, #gamepanel td.pick');
  const c = await app.run(pd => ({ st: pd.GAMES.status(pd.game.state), held: pd.held }));
  expect(c.st.rollsUsed).toBe(0); expect(c.held).toEqual([]);
  expect(c.st.round).toBe(before + 1);
  // the roll/showcase button cannot pull the dice off the mat mid-game
  await app.page.click('#mode');
  expect(await app.run(pd => pd.rolling)).toBe(true);
  await app.run(pd => pd.endGame());
  expect(await app.run(pd => pd.game)).toBe(null);
});

test('yahtzee: a hold before the first roll is refused; suggestions can be switched off', async ({ shared: app }) => {
  await app.reset(42);
  await app.run(pd => pd.openGames()); await app.page.uncheck('#gamepanel input[type=checkbox] >> nth=-1');
  await app.page.click('#gamepanel button.big');
  expect(await app.run(pd => pd.toggleHold(0))).toBe(false);
  await app.run(pd => pd.simRoll());
  expect(await app.page.locator('#gamepanel td.sug').count()).toBe(0);
  expect(await app.page.locator('#gamepanel td.pick').count()).toBeGreaterThan(0);
  await app.run(pd => pd.endGame());
});

test('yahtzee: the scorecard folds away so the dice stay visible', async ({ shared: app }) => {
  await app.reset(43); await app.page.setViewportSize({ width: 390, height: 780 });
  await app.run(pd => pd.openGames()); await app.page.click('#gamepanel button.big');
  await app.run(pd => pd.simRoll());
  expect(await app.page.locator('#gamepanel table').count()).toBe(0);   // phones start folded
  await app.page.click('text=Scorecard'); expect(await app.page.locator('#gamepanel table').count()).toBe(1);
  await app.page.click('text=Scorecard'); expect(await app.page.locator('#gamepanel table').count()).toBe(0);
  await app.run(pd => pd.endGame());
});
