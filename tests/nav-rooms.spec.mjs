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

test('Undo and Redo sit in the settings pane\'s sticky top strip in the Design room, are absent in Full view and in Play (PD-142.38.41)', async ({ shared: app }) => {
  await app.nav.toDesign();
  const u = await app.page.locator('#undo').boundingBox(), r = await app.page.locator('#redo').boundingBox(), strip = await app.page.locator('#paneltabs').boundingBox();
  expect(u && r, 'undo and redo visible').toBeTruthy();
  expect(await app.page.locator('#paneltabs #undo, #paneltabs #redo').count(), 'inside the strip').toBe(2);
  expect(u.y).toBeGreaterThanOrEqual(strip.y - 1); expect(u.y + u.height).toBeLessThanOrEqual(strip.y + strip.height + 1);
  expect(r.x, 'Redo right of Undo').toBeGreaterThan(u.x);
  expect(await app.page.locator('#paneltabs [data-pane=look], #paneltabs [data-pane=bag], #paneltabs [data-pane=sets]').count(), 'no Look/Bag/Sets tabs in Design').toBe(0);
  expect(await app.page.locator('#shelf #undo, #shelf #redo, #actions #undo').count(), 'not on the mat').toBe(0);
  await app.nav.fullView(true);
  await expect(app.page.locator('#undo')).toBeHidden(); await expect(app.page.locator('#redo')).toBeHidden();
  await app.nav.fullView(false);
  await app.run(pd => pd.randomize()); await expect(app.page.locator('#undo')).toBeEnabled();
  await app.page.locator('#undo').click();
  await app.nav.toPlay(); await expect(app.page.locator('#undo')).toBeHidden();
});
test('phone: the cube menu button switches rooms, the strip middle holds top-down in Play, and the desktop keeps the switch at the top of the panel (PD-142.38.22)', async ({ shared: app }) => {
  const page = app.page;
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  try {
    await expect(page.locator('#roomround'), 'no switch or round button on the mat').toHaveCount(0); await expect(page.locator('aside #modesw')).toBeHidden();
    const nm = await page.locator('#name').boundingBox(); expect(nm.y, 'the title line is the only thing in the top strip').toBeLessThan(40);
    await page.locator('#drawerbtn').click(); await expect(page.locator('#roomsw')).toBeVisible(); await expect(page.locator('#roomsw')).toContainText('Play');
    await page.locator('#roomsw').click(); await expect(page.locator('body')).not.toHaveClass(/design/);
    await page.locator('#drawerbtn').click(); await expect(page.locator('#roomsw')).toContainText('Design'); await page.locator('#roomsw').click(); await expect(page.locator('body')).toHaveClass(/design/);
    await app.nav.toPlay();
    const m = await page.locator('#stripmid').boundingBox();
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2); await page.mouse.down();
    await expect(page.locator('body')).toHaveClass(/peek/);
    await page.mouse.up(); await expect(page.locator('body')).not.toHaveClass(/peek/);
    await app.nav.toDesign();
  } finally { await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(150); }
  await expect(page.locator('aside #modesw')).toHaveCount(1);
  const top = await app.run(() => { const a = document.querySelector('aside'), kids = [...a.children].map(e => e.id); return { i: kids.indexOf('modesw'), t: kids.indexOf('paneltabs') }; });
  expect(top.i, 'desktop: the Design | Play switch sits above the tabs').toBeLessThan(top.t);
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

test('phone: Undo and Redo are in the pane strip (single slim row), not on the mat; the Bag button is at the bottom left clear of the cards (PD-142.38.41/.43)', async ({ shared: app }) => {
  const page = app.page; await page.setViewportSize({ width: 390, height: 740 }); await page.waitForTimeout(150);
  try {
    await app.nav.toDesign();
    await app.run(() => window.dispatchEvent(new Event('resize')));
    await expect(page.locator('#undo')).toBeVisible();
    const u = await page.locator('#undo').boundingBox(), r = await page.locator('#redo').boundingBox(), st = await page.locator('#paneltabs').boundingBox(), aside = await page.locator('aside').boundingBox();
    expect(Math.abs(u.y - r.y), 'one row').toBeLessThan(2); expect(st.height, 'slim strip').toBeLessThanOrEqual(60); expect(u.y).toBeGreaterThanOrEqual(aside.y);
    // PD-142.38.56: on the phone the strip scrolls away with the pane (Play's tab strip stays sticky); desktop keeps it sticky
    await app.run(() => { document.querySelector('aside').scrollTop = 400; }); await page.waitForTimeout(150);
    const gone = await page.locator('#paneltabs').boundingBox(); expect(gone.y + gone.height, 'strip scrolled off the top of the pane').toBeLessThanOrEqual(aside.y + 1);
    await app.run(() => { document.querySelector('aside').scrollTop = 0; });
    const bag = await page.locator('#bagbtn').boundingBox(), sh = await page.locator('#shelf').boundingBox();
    expect(bag.x + bag.width, 'Bag button clear of the cards').toBeLessThanOrEqual(sh.x + 1); expect(bag.x).toBeLessThan(60);
    await app.nav.toPlay(); await expect(page.locator('#undo')).toBeHidden(); await expect(page.locator('#bagbtn')).toBeVisible();
  } finally { await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(150); }
});
