// PD-191: the Story Dice look is held while the Games tab shows it and released when the user leaves it (no game running).
import { test, expect } from './helpers/app.mjs';

const mine = app => app.run(pd => ({ look: JSON.stringify(pd.designToJSON()), notation: pd.state.notation, shape: pd.state.shape, n: pd.dice.length, pending: JSON.stringify(pd.bag.pending), active: JSON.stringify(pd.bag.active), sets: JSON.stringify(pd.bag.sets), view: JSON.stringify(pd.view || null) }));
const dock = app => app.page.locator('#qbar').boundingBox().then(b => b && Math.round(b.height));
const storyOn = app => app.run(pd => ({ sub: pd.state.substrate, custom: pd.state.shape === 'custom', n: pd.dice.length }));
const pick = (app, id) => app.page.selectOption('#scorepane select >> nth=0', id);
const toStorySetup = async app => { await app.run(pd => pd.openGames()); await pick(app, 'story'); await app.run(pd => { pd.step(30); pd.renderOnce(); }); };
const startStory = async app => { await toStorySetup(app); await app.nav.roll(); await app.run(pd => pd.simRoll({ rerolls: 6 })); };
const endButton = async app => { await app.page.getByRole('button', { name: 'End game' }).first().click(); const yes = app.page.locator('#endyes'); if (await yes.count()) await yes.click(); await app.page.waitForTimeout(700); };   // PD-192: mid-game End game asks first
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

// PD-192 B: Start game in view, quick roll with a game selected but not started.
const gameSel = app => app.page.locator('#scorepane select').first();
const startInView = async app => {
  const r = await app.page.evaluate(() => { const b = [...document.querySelectorAll('#scorepane button')].find(x => x.textContent.trim() === 'Start game'); if (!b) return null; const a = b.getBoundingClientRect(), p = b.closest('aside').getBoundingClientRect(); return { top: a.top, bottom: a.bottom, pTop: p.top, pBottom: p.bottom, vh: innerHeight }; });
  expect(r, 'Start game button exists').not.toBeNull();
  expect(r.bottom, 'Start game inside the panel and the window').toBeLessThanOrEqual(Math.min(r.pBottom, r.vh) + 1);
  expect(r.top).toBeGreaterThanOrEqual(r.pTop - 1);
};

test('PD-192 B1: leaving by the Table tab or another game releases a selected game look; the selection stays and reopening Games previews it again', async ({ shared: app }) => {
  await app.reset(1921, { plain: true }); await app.nav.toPlay();
  const before = await mine(app), dock0 = await dock(app);
  await app.run(pd => pd.openGames());
  expect(await gameSel(app).locator('option[value=none]').count(), 'no "none" entry').toBe(0);
  await pick(app, 'story'); await app.run(pd => { pd.step(20); pd.renderOnce(); });
  expect(await storyOn(app)).toMatchObject({ custom: true });
  await app.page.click('#paneltabs [data-pane=table]'); await app.run(pd => { pd.step(20); pd.renderOnce(); });
  await own(app, before, dock0, null);
  await app.page.click('#paneltabs [data-pane=games]'); await app.run(pd => { pd.step(30); pd.renderOnce(); });
  expect(await gameSel(app).inputValue(), 'selection kept').toBe('story');
  expect(await storyOn(app), 'previewed again on reopen').toMatchObject({ custom: true });
  await pick(app, 'yahtzee'); await app.run(pd => { pd.step(20); pd.renderOnce(); });
  await own(app, before, dock0, null);
});

test('PD-192 B1: a running game keeps running when the setup is opened', async ({ shared: app }) => {
  await app.reset(1922, { plain: true });
  await startStory(app);
  await app.run(pd => document.dispatchEvent(new CustomEvent('pd-open-games')));
  await pick(app, 'yahtzee'); expect(await app.run(pd => !!pd.game)).toBe(true);
  await expect(app.page.getByRole('button', { name: 'Back to game' })).toHaveCount(1);
  await app.run(pd => pd.endGame());
});

test('PD-192 B1: a saved "none" game choice from an earlier build falls back to Yahtzee on load', async ({ shared: app }) => {
  await app.reset(1926, { plain: true }); const page = app.page;
  await page.evaluate(() => { const k = 'prettydice.games', o = JSON.parse(localStorage.getItem(k) || '{}'); o.gameId = 'none'; localStorage.setItem(k, JSON.stringify(o)); });
  await page.reload(); await app.ready();
  await app.nav.toPlay(); await app.run(pd => pd.openGames());
  expect(await gameSel(app).inputValue()).toBe('yahtzee');
  await expect(app.page.getByRole('button', { name: 'Start game' })).toHaveCount(1);
});

for (const [w, h, name] of [[1280, 800, 'desktop'], [390, 844, 'phone']]) {
  test(`PD-192 B2 ${name}: Start game is in view (1 and 2 players, Story Dice)`, async ({ shared: app }) => {
    await app.reset(1923, { plain: true }); await app.page.setViewportSize({ width: w, height: h });
    await app.nav.toPlay(); await app.run(pd => pd.openGames());
    await pick(app, 'story'); await app.page.waitForTimeout(150);
    await startInView(app);
    await app.page.locator('#scorepane select').nth(1).selectOption('2'); await app.page.waitForTimeout(150);
    await startInView(app);
    await app.page.locator('#scorepane select').nth(1).selectOption('1');
    await pick(app, 'yahtzee'); await startInView(app);
    await app.page.setViewportSize({ width: 1280, height: 800 });
  });
}

test('PD-192 B3: Start game stays sticky in view when the panel scrolls (6 players)', async ({ shared: app }) => {
  await app.reset(1924, { plain: true }); await app.page.setViewportSize({ width: 390, height: 844 });
  await app.nav.toPlay(); await app.run(pd => pd.openGames()); await pick(app, 'story');
  const sel = app.page.locator('#scorepane select').nth(1); await sel.selectOption({ index: (await sel.locator('option').count()) - 1 });
  await app.page.waitForTimeout(150);
  await startInView(app);
  await app.page.evaluate(() => { const a = document.querySelector('#scorepane').closest('aside'); a.scrollTop = 0; });
  await startInView(app);
  await app.page.setViewportSize({ width: 1280, height: 800 });
});

for (const size of ['desktop', 'phone']) {
  test(`PD-192 B4 ${size}: quick roll with Story Dice selected, not started: own table, own dice, selection kept`, async ({ shared: app }) => {
    await app.reset(1925, { plain: true });
    if (size === 'phone') await app.page.setViewportSize({ width: 390, height: 780 });
    await app.nav.toPlay();
    const before = await mine(app), dock0 = await dock(app);
    await toStorySetup(app);
    expect(await storyOn(app)).toMatchObject({ custom: true });
    await app.page.locator('#rollbox').fill('2d6'); await app.page.locator('#rollbtn').click();
    await app.run(pd => { pd.step(30); pd.renderOnce(); });
    expect(await app.run(pd => pd.dice.length), 'the two d6 of the formula').toBe(2);
    expect(await app.run(pd => pd.state.substrate)).not.toBe('solid-story');
    expect(await dock(app), 'dock one row').toBe(dock0);
    await expect(app.page.locator('#paneltabs [data-pane=table]')).toHaveAttribute('aria-selected', 'true');
    await app.page.click('#paneltabs [data-pane=games]');
    expect(await gameSel(app).inputValue(), 'selection unchanged').toBe('story');
    expect(await app.run(pd => !!pd.game)).toBe(false);
    await app.run(pd => { pd.step(30); pd.renderOnce(); });
    expect(await storyOn(app), 'reopening Games previews the selection again').toMatchObject({ custom: true });
    await app.page.setViewportSize({ width: 1280, height: 800 });
  });
}

// PD-200: the same with an EMPTY formula box: Roll releases the game look and rolls the player's own dice.
for (const how of ['button', 'enter', 'key r']) {
  test(`PD-200 ${how}: quick roll with an empty box, Story Dice selected not started: own dice, no 5d12, selection kept`, async ({ shared: app }) => {
    await app.page.evaluate(() => { const b = document.getElementById('rollbox'); if (b) b.value = ''; document.querySelector('#paneltabs [data-pane=table]')?.click(); });   // an earlier test may have left a formula in the box and the Story preview on (its stale look snapshot would be restored)
    await app.reset(2000, { plain: true });
    await app.nav.toPlay();
    const before = await mine(app), log0 = await app.run(pd => pd.bag.log.length);
    await toStorySetup(app);
    expect(await storyOn(app)).toMatchObject({ custom: true });
    const logN = await app.run(pd => pd.state.shape + '|' + pd.state.notation);
    expect(logN).toContain('d');
    await app.page.locator('#rollbox').fill('');
    if (how === 'button') await app.page.locator('#rollbtn').click();
    else if (how === 'enter') { await app.page.locator('#rollbox').focus(); await app.page.keyboard.press('Enter'); }
    else { await app.page.locator('#rollbox').blur(); await app.page.keyboard.press('r'); }
    await app.run(pd => { pd.step(30); pd.renderOnce(); });
    const after = await mine(app);
    expect(after.shape, 'the player\'s own dice, not the preview 5d12').toBe(before.shape);
    if (before.shape === 'custom') expect(after.notation).toBe(before.notation);
    expect(after.n).toBe(before.n);
    expect(await app.run(pd => pd.state.substrate)).not.toBe('solid-story');
    expect(await app.run((pd, n) => JSON.stringify(pd.bag.log.slice(Math.min(n, pd.bag.log.length))), log0), 'no 5d12 log entry').not.toMatch(/5d12/);
    await expect(app.page.locator('#paneltabs [data-pane=table]')).toHaveAttribute('aria-selected', 'true');
    await app.page.click('#paneltabs [data-pane=games]');
    expect(await gameSel(app).inputValue(), 'selection unchanged').toBe('story');
    await app.run(pd => { pd.step(30); pd.renderOnce(); });
    expect(await storyOn(app), 'reopening Games previews again').toMatchObject({ custom: true });
  });
}
