// PD-191: the Story Dice look is held while the Games tab shows it and released when the user leaves it (no game running).
import { test, expect } from './helpers/app.mjs';

const mine = app => app.run(pd => ({ look: JSON.stringify(pd.designToJSON()), notation: pd.state.notation, shape: pd.state.shape, n: pd.dice.length, pending: JSON.stringify(pd.bag.pending), active: JSON.stringify(pd.bag.active), sets: JSON.stringify(pd.bag.sets), view: JSON.stringify(pd.view || null) }));
const dock = app => app.page.locator('#qbar').boundingBox().then(b => b && Math.round(b.height));
const storyOn = app => app.run(pd => ({ sub: pd.state.substrate, custom: pd.state.shape === 'custom', n: pd.dice.length }));
const pick = (app, id) => app.page.selectOption('#scorepane select >> nth=0', id);
const toStorySetup = async app => { await app.run(pd => pd.openGames()); await pick(app, 'story'); await app.run(pd => { pd.step(30); pd.renderOnce(); }); };
const startStory = async app => { await toStorySetup(app); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); };
const endButton = async app => { await app.page.getByRole('button', { name: 'End game' }).first().click(); await app.page.waitForTimeout(700); };
const box = app => app.page.locator('#qbar input').first().inputValue().catch(() => null);
const own = async (app, before, dock0, box0) => {
  expect(await mine(app)).toEqual(before);
  expect(await app.run(pd => pd.state.substrate)).not.toBe('solid-story');
  expect(await dock(app), 'dock back to its height').toBe(dock0);
  if (box0 !== null) expect(await box(app), 'formula box back').toBe(box0);
};
const leaves = {
  table: app => app.page.click('#paneltabs [data-pane=table]'),
  log: app => app.page.click('#paneltabs [data-pane=log]'),
  design: app => app.nav.toDesign(),
  close: app => app.page.locator('#scorepane').getByRole('button', { name: 'Close' }).click(),
  yacht: app => pick(app, 'yahtzee'),
  full: app => app.nav.fullView(true),
};
for (const size of ['desktop', 'phone']) {
  for (const [name, leave] of Object.entries(leaves)) {
    if (size === 'phone' && !['table', 'close', 'design'].includes(name)) continue;
    test(`PD-191 ${size}: after End game the story dice stay; ${name} releases them (a), selected-not-started too (b)`, async ({ shared: app }) => {
      await app.reset(191, { plain: true });
      if (size === 'phone') await app.page.setViewportSize({ width: 390, height: 780 });
      if (name !== 'design') await app.nav.toPlay();
      const before = await mine(app), dock0 = await dock(app), box0 = name === 'design' ? null : await box(app);
      await startStory(app);
      await endButton(app);
      expect(await storyOn(app), 'still on Games after End game: story dice stay').toMatchObject({ sub: 'solid', custom: true });
      await leave(app); await app.run(pd => { pd.step(20); pd.renderOnce(); });
      await own(app, before, dock0, box0);
      // (b) selected, never started
      if (name === 'full') await app.nav.fullView(false);
      if (name !== 'design' && name !== 'close') { await app.nav.toPlay(); }
      await toStorySetup(app);
      expect(await storyOn(app)).toMatchObject({ custom: true });
      await leave(app); await app.run(pd => { pd.step(20); pd.renderOnce(); });
      await own(app, before, dock0, box0);
      if (name === 'full') await app.nav.fullView(false);
    });
  }
}

test('PD-191 (d): a running game keeps its dice through Table, Log and Design', async ({ shared: app }) => {
  await app.reset(192, { plain: true });
  await startStory(app);
  const g = await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation }));
  for (const go of [leaves.table, leaves.log, leaves.design]) {
    await go(app); await app.run(pd => { pd.step(10); pd.renderOnce(); });
    expect(await app.run(pd => ({ n: pd.dice.length, notation: pd.state.notation, g: !!pd.game }))).toEqual({ ...g, g: true });
    await app.nav.toPlay();
  }
  await app.run(pd => pd.endGame());
});

test('PD-191 (c): reload with a paused game shows the user\'s table; Games shows story dice + Resume; leaving releases; Resume works', async ({ app, page }) => {
  await app.open({ seed: 193, plain: true });
  const before = await mine(app);
  await startStory(app);
  await page.reload(); await page.waitForFunction(() => window.__ready && window.__pd); await app.run(pd => pd.pause());
  const boot = await mine(app);
  expect(boot.notation, 'boot shows the user\'s own table').toBe(before.notation);
  expect(await app.run(pd => pd.state.substrate)).not.toBe('solid-story');
  expect(await app.run(pd => !!pd.game)).toBe(false);
  await app.nav.openGames(); await app.run(pd => { pd.step(30); pd.renderOnce(); });
  await expect(page.getByRole('button', { name: /Resume/ })).toBeVisible();
  expect(await storyOn(app)).toMatchObject({ custom: true });
  await page.click('#paneltabs [data-pane=table]'); await app.run(pd => { pd.step(20); pd.renderOnce(); });
  expect((await mine(app)).notation).toBe(before.notation);
  await app.nav.openGames();
  expect(await storyOn(app)).toMatchObject({ custom: true });
  await page.getByRole('button', { name: /Resume/ }).click(); await app.run(pd => { pd.step(30); pd.renderOnce(); });
  expect(await app.run(pd => !!pd.game)).toBe(true);
  await app.run(pd => pd.endGame());
});

test('PD-191 (c2): reload with no paused game boots to the user\'s table too', async ({ app, page }) => {
  await app.open({ seed: 194, plain: true });
  const before = await mine(app);
  await toStorySetup(app);
  await page.reload(); await page.waitForFunction(() => window.__ready && window.__pd); await app.run(pd => pd.pause());
  expect((await mine(app)).notation).toBe(before.notation);
  await app.nav.openGames(); await expect(page.getByRole('button', { name: /Resume/ })).toHaveCount(0);
  expect(await storyOn(app)).toMatchObject({ custom: true });
});
