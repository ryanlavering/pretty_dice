// PD-142.4/.5: the Games panel drives the pd-games engine from real dice rolls (Yahtzee).
import { test, expect } from './helpers/app.mjs';

test('yahtzee: engine gets the real dice, holds keep dice, scoring advances the turn', async ({ shared: app }) => {
  await app.reset(41);
  await app.run(pd => { pd.openGames(); });
  await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  await app.nav.roll();   // Start game (1 player)
  if (await app.page.locator('#scorepane td').count() === 0) await app.page.click('text=Scorecard');
  expect(await app.run(pd => pd.state.notation)).toBe('5d6');
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const a = await app.run(pd => { const st = pd.GAMES.status(pd.game.state); return { st }; });
  expect(a.st.rollsUsed).toBe(1);
  const d1 = a.st.dice;
  expect(d1.every(v => v >= 1 && v <= 6)).toBe(true);
  expect(await app.run(pd => pd.toggleHold(0) && pd.toggleHold(2))).toBe(true);
  expect(await app.run(pd => pd.GAMES.status(pd.game.state).held)).toEqual([true, false, true, false, false]);
  expect(await app.run(pd => pd.held)).toEqual([0, 2]);
  await app.run(pd => pd.simRoll({ rerolls: 6 }));
  const b = await app.run(pd => pd.GAMES.status(pd.game.state));
  expect(b.rollsUsed).toBe(2);
  expect([b.dice[0], b.dice[2]]).toEqual([d1[0], d1[2]]);   // held dice keep their values
  // tap the best suggestion on the scorecard
  const before = await app.run(pd => pd.GAMES.status(pd.game.state).round);
  await app.page.dblclick('#scorepane td.pick.best, #scorepane td.pick');
  const c = await app.run(pd => ({ st: pd.GAMES.status(pd.game.state), held: pd.held }));
  expect(c.st.rollsUsed).toBe(0); expect(c.held).toEqual([]);
  expect(c.st.round).toBe(before + 1);
  // PD-142.38 slice 4: the Design half works mid-game (the game survives), Play puts the dice back on the mat
  await app.nav.toggleMode();
  expect(await app.run(pd => [pd.rolling, !!pd.game])).toEqual([false, true]);
  await app.nav.toggleMode();
  expect(await app.run(pd => [pd.rolling, !!pd.game])).toEqual([true, true]);
  await app.run(pd => pd.endGame());
  expect(await app.run(pd => pd.game)).toBe(null);
});

test('yahtzee: a hold before the first roll is refused; suggestions can be switched off', async ({ shared: app }) => {
  await app.reset(42);
  await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee'); await app.page.uncheck('#scorepane input[type=checkbox] >> nth=-1');
  await app.nav.roll();
  expect(await app.run(pd => pd.toggleHold(0))).toBe(false);
  await app.run(pd => pd.simRoll());
  expect(await app.page.locator('#scorepane td.sug').count()).toBe(0);
  expect(await app.page.locator('#scorepane td.pick').count()).toBeGreaterThan(0);
  await app.run(pd => pd.endGame());
});

for (const rolls of [1, 2]) {
  test(`yahtzee: scoring after toss ${rolls} ends the turn: next player starts at toss 1, holds cleared`, async ({ shared: app }) => {
    await app.reset(70 + rolls); await app.run(pd => pd.openGames());
    await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
    await app.nav.roll();
    if (await app.page.locator('#scorepane td').count() === 0) await app.page.click('text=Scorecard');
    const who0 = await app.run(pd => pd.GAMES.status(pd.game.state).player);
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    if (rolls === 2) { await app.run(pd => { pd.toggleHold(0); pd.toggleHold(1); pd.simRoll({ rerolls: 6 }); }); }
    expect(await app.run(pd => pd.GAMES.status(pd.game.state).rollsUsed)).toBe(rolls);
    await app.page.dblclick('#scorepane td.pick');
    const a = await app.run(pd => ({ st: pd.GAMES.status(pd.game.state), held: pd.held, rings: pd.holdRings }));
    expect(a.st.rollsUsed, 'fresh toss 1').toBe(0); expect(a.st.canRoll).toBe(true); expect(a.held).toEqual([]); expect(a.rings).toBe(0);
    expect(await app.page.locator('#scorepane .gstat small').textContent()).not.toMatch(/roll \d of 3/);
    // the next toss is toss 1 of the next turn, not toss 3 of the old one
    await app.nav.roll();
    await app.run(pd => pd.simRoll({ rerolls: 6 }));
    const b = await app.run(pd => pd.GAMES.status(pd.game.state));
    expect(b.rollsUsed).toBe(1);
    expect(await app.page.locator('#scorepane .gstat small').textContent()).toContain('roll 1 of 3');
    await app.run(pd => pd.endGame());
  });
}

test('End game stays in the Play room and opens the Games setup (PD-142.14.3.1.6)', async ({ shared: app }) => {
  await app.reset(43);
  await app.run(pd => pd.openGames());
  await app.page.selectOption('#scorepane select >> nth=0', 'craps');
  await app.nav.roll();   // Start game
  await app.page.click('#gamepanel button[title="End game"], #scorepane button[title="End game"], button:has-text("End game")');
  await expect(app.page.locator('body')).not.toHaveClass(/design/);
  expect(await app.run(pd => pd.game)).toBe(null);
  await expect(app.page.locator('#scorepane select').first()).toBeVisible();
});

test('liar\'s dice: the dock button reads "Roll" outside the roll phase, never "Roll 0 die" (PD-142.14.3.1.7)', async ({ shared: app }) => {
  await app.reset(44);
  await app.run(pd => pd.openGames());
  await app.page.selectOption('#scorepane select >> nth=0', 'liarsdice');
  await app.nav.roll();
  await app.run(pd => pd.simRoll());
  const t = await app.run(pd => { const o = []; const st = pd.GAMES.status(pd.game.state); o.push([st.phase, document.getElementById('rollbtn').textContent]); return o; });
  expect(t[0][1]).not.toMatch(/Roll 0/);
});

test('liar\'s dice: odds and suggested bids are hidden unless the practice option is on (PD-142.14.3.1.7)', async ({ shared: app }) => {
  await app.reset(45);
  await app.run(pd => pd.openGames());
  await app.page.selectOption('#scorepane select >> nth=0', 'liarsdice');
  await expect(app.page.locator('#scorepane label:has-text("Suggest scores")')).toHaveCount(0);
  await expect(app.page.locator('#scorepane label:has-text("odds and suggested bids")')).toHaveCount(1);
  await app.nav.roll();
  expect(await app.run(pd => pd.game.state.options.help)).toBe(false);
  await app.run(pd => pd.simRoll());
  await expect(app.page.locator('#scorepane')).not.toContainText('likely true');
});

for (const id of ['craps', 'liarsdice']) {
  test(`${id}: End game with no rolls leaves the Roll button and the roll log live (PD-142.14.3.1.14)`, async ({ shared: app }) => {
    await app.reset(46);
    await app.run(pd => pd.openGames());
    await app.page.selectOption('#scorepane select >> nth=0', id);
    await app.nav.roll();   // Start game, no roll
    await app.page.click('button:has-text("End game")');
    await expect(app.page.locator('body')).not.toHaveClass(/throwing/);
    await expect(app.page.locator('#rollbtn')).toBeEnabled();
    await app.nav.openLog();
    expect(await app.page.evaluate(() => getComputedStyle(document.getElementById('logpanel')).pointerEvents)).not.toBe('none');
    expect(await app.page.evaluate(() => +getComputedStyle(document.getElementById('qbar')).opacity)).toBe(1);
  });
}
