// Navigation slice 4 (PD-142.38): two rooms, Design | Play. The switch never throws dice, a running game survives a visit to Design,
// Randomize and Space belong to the Design room only.
import { test, expect } from './helpers/app.mjs';

const st = app => app.run(pd => ({ rolling: pd.rolling, settled: pd.settled, placed: pd.placed, game: !!pd.game, cls: document.body.className, state: JSON.stringify(pd.state) }));

test.beforeEach(async ({ shared }) => { await shared.reset(7); await shared.run(pd => pd.endGame()); });

test('the Design | Play switch never throws: Play puts the dice down unrolled, Design returns to the showcase', async ({ shared: app }) => {
  await expect(app.page.locator('#back')).toHaveText('Design'); await expect(app.page.locator('#roll')).toHaveText('Play');
  expect(await app.page.locator('#mode').count(), 'the round mode button is gone').toBe(0);
  await app.nav.toPlay();
  expect(await st(app)).toMatchObject({ rolling: true, placed: true, settled: true });
  await expect(app.page.locator('#roll')).toHaveClass(/on/); await expect(app.page.locator('#qbar')).toBeVisible();
  await app.nav.toPlay();   // a second tap on the active half does nothing
  expect(await st(app)).toMatchObject({ rolling: true, placed: true });
  await app.nav.toDesign();
  expect(await st(app)).toMatchObject({ rolling: false }); await expect(app.page.locator('#back')).toHaveClass(/on/);
  await expect(app.page.locator('#qbar')).toBeHidden();
  await app.nav.toDesign(); expect(await st(app)).toMatchObject({ rolling: false });
});

test('a running game survives a visit to Design; Play carries a dot meanwhile; both halves work in a game', async ({ shared: app }) => {
  await app.run(pd => pd.startGame('farkle', ['P1'], {}, []));
  expect(await st(app)).toMatchObject({ game: true, rolling: true });
  const before = await app.run(pd => JSON.stringify(pd.game.state));
  await app.page.locator('#back').click();
  expect(await st(app)).toMatchObject({ game: true, rolling: false }); expect((await st(app)).cls).toContain('design');
  await expect(app.page.locator('#roll')).toHaveClass(/gamelive/); await expect(app.page.locator('#qbar')).toBeHidden();
  expect(await app.run(pd => JSON.stringify(pd.game.state))).toBe(before);
  await app.page.locator('#roll').click();
  expect(await st(app)).toMatchObject({ game: true, rolling: true }); await expect(app.page.locator('#roll')).not.toHaveClass(/gamelive/);
  await expect(app.page.locator('#qbar')).toBeVisible();
  expect(await app.run(pd => JSON.stringify(pd.game.state))).toBe(before);
});

test('Randomize and Space belong to the Design room', async ({ shared: app }) => {
  await app.nav.toDesign(); await expect(app.page.locator('#rand')).toBeVisible();
  const d0 = await app.run(pd => JSON.stringify(pd.designToJSON()));
  await app.page.keyboard.press('Space');
  expect(await app.run(pd => JSON.stringify(pd.designToJSON())), 'Space randomizes in Design').not.toBe(d0);
  await app.nav.toPlay(); await expect(app.page.locator('#rand')).toBeHidden();
  const d1 = await app.run(pd => JSON.stringify(pd.designToJSON()));
  await app.page.keyboard.press('Space');
  expect(await app.run(pd => JSON.stringify(pd.designToJSON())), 'Space is inert in Play').toBe(d1);
});

test('Undo and Redo sit on the shelf row in the Design room (also in Full view) and are not shown in Play', async ({ shared: app }) => {
  await app.nav.toDesign();
  for (const full of [false, true]) {
    await app.nav.fullView(full);
    const u = await app.page.locator('#undo').boundingBox(), r = await app.page.locator('#redo').boundingBox(), cards = await app.page.locator('#cards').boundingBox();
    expect(u && r, `undo and redo visible (full view ${full})`).toBeTruthy();
    expect(Math.abs((u.y + u.height / 2) - (cards.y + cards.height / 2)), 'same row as the shelf').toBeLessThan(cards.height);
    expect(u.x + u.width, 'left of the shelf cards').toBeLessThanOrEqual(cards.x + 1);
  }
  await app.nav.fullView(false);
  expect(await app.page.locator('#actions #undo, #actions #redo').count(), 'no longer in the panel').toBe(0);
  const before = await app.run(pd => pd.state.shape);
  await app.run(pd => pd.randomize()); await expect(app.page.locator('#undo')).toBeEnabled();
  await app.page.locator('#undo').click();
  await app.nav.toPlay(); await expect(app.page.locator('#undo')).toBeHidden();
  void before;
});

// Slice 4c
test('phone: the switch sits in the top strip, the strip middle holds top-down in Play, and the desktop keeps it in the panel', async ({ shared: app }) => {
  const page = app.page;
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  try {
    await expect(page.locator('#topstrip #modesw')).toBeVisible();
    const b = await page.locator('#modesw').boundingBox(); expect(b.y).toBeLessThan(60);
    await app.nav.toPlay();
    const m = await page.locator('#stripmid').boundingBox();
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2); await page.mouse.down();
    await expect(page.locator('body')).toHaveClass(/peek/);
    await page.mouse.up(); await expect(page.locator('body')).not.toHaveClass(/peek/);
    await app.nav.toDesign();
  } finally { await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(150); }
  await expect(page.locator('aside #modesw')).toHaveCount(1);
});

test('[+] Blank and Random both open the same draft; Blank is a plain starting look', async ({ shared: app }) => {
  const before = await app.run(pd => pd.bag.designs.length);
  await app.run(() => document.querySelector('#shelf .plus, #shelf .card.plus')?.click());
  await app.page.locator('#cardmenu button', { hasText: 'Blank draft' }).click();
  await app.page.waitForTimeout(300);
  const r = await app.run(pd => ({ n: pd.bag.designs.length, draft: pd.bag.active.draft, sub: pd.state.substrate }));
  expect(r).toMatchObject({ n: before, draft: true, sub: 'solid' });
});

test('Play puts the dice back as they last lay', async ({ shared: app }) => {
  await app.nav.toPlay(); await app.nav.roll();
  await app.run(pd => pd.simRoll());
  const lay = () => app.run(pd => pd.dice.map(d => [d.mesh.position.x, d.mesh.position.z].map(v => +v.toFixed(2))));
  const a = await lay();
  await app.nav.toDesign(); await app.nav.toPlay();
  expect(await lay()).toEqual(a);
});

// Slice 6 (games-ui): the Games tab replaces the round Games button; the scorecard lives in the panel
test('Games tab opens setup, shows the scorecard in the panel, and the Design | Play switch stays reachable', async ({ shared: app }) => {
  const page = app.page;
  expect(await page.locator('#gamesbtn').count(), 'the round Games button is gone').toBe(0);
  await app.nav.openGames();
  await expect(page.locator('#scorepane')).toBeVisible(); await expect(page.locator('#scorepane h2')).toHaveText('Games');
  await expect(page.locator('#modesw')).toBeVisible();
  await page.selectOption('#scorepane select >> nth=0', 'yahtzee'); await app.nav.roll();
  await expect(page.locator('#gamestab')).toHaveText('Scorecard'); await expect(page.locator('#scorepane table')).toBeVisible();
  await page.locator('#back').click(); await expect(page.locator('#back')).toHaveClass(/on/);
  await page.locator('#roll').click(); await expect(page.locator('#roll')).toHaveClass(/on/);
});
