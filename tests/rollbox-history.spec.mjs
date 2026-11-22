// PD-198: the quick roll box remembers formulas and set names (Up/Down, long press on a phone) and calls sets up by name.
import { test, expect } from './helpers/app.mjs';
import { createRollHistory } from '../src/rollhist.js';

const open = async (app, opts) => { await app.open({ plain: true, ...opts }); await app.nav.toPlay(); };
const roll = async (page, text) => { const box = page.locator('#rollbox'); await box.fill(text); await box.press('Enter'); };
const hist = page => page.evaluate(() => JSON.parse(localStorage.getItem('prettydice.rollhist.v1') || '[]'));

test('@quick model: most recent first, no repeats, capped at 20, bad storage ignored', () => {
  const mem = {}; const st = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const h = createRollHistory({ storage: st });
  for (let i = 1; i <= 25; i++) h.push(`${i}d6`);
  expect(h.entries().length).toBe(20); expect(h.entries()[0]).toBe('25d6');
  h.push('10d6'); expect(h.entries().slice(0, 2)).toEqual(['10d6', '25d6']); expect(h.entries().length).toBe(20);
  expect(h.push('   ')).toBe(false);
  expect(createRollHistory({ storage: st }).entries()[0]).toBe('10d6');
  expect(createRollHistory({ storage: { getItem: () => '{oops', setItem() {} } }).entries()).toEqual([]);
  const g = createRollHistory({ storage: null }); g.push('2d4'); g.push('1d8');
  expect(g.older('draft')).toBe('1d8'); expect(g.older('x')).toBe('2d4'); expect(g.older('x')).toBeNull();
  expect(g.newer()).toBe('1d8'); expect(g.newer()).toBe('draft'); expect(g.newer()).toBeNull();
});

test('Up/Down step through history and Down past the newest restores the draft', async ({ app, page }) => {
  await open(app);
  await roll(page, '2d6'); await roll(page, '1d20+3'); await roll(page, '3d8');
  const box = page.locator('#rollbox');
  await box.fill('my draft'); await box.focus();
  await box.press('ArrowUp'); await expect(box).toHaveValue('3d8');
  await box.press('ArrowUp'); await expect(box).toHaveValue('1d20+3');
  await box.press('ArrowUp'); await expect(box).toHaveValue('2d6');
  await box.press('ArrowUp'); await expect(box, 'oldest stays').toHaveValue('2d6');
  await box.press('ArrowDown'); await expect(box).toHaveValue('1d20+3');
  await box.press('ArrowDown'); await box.press('ArrowDown'); await expect(box, 'draft back').toHaveValue('my draft');
  await box.press('ArrowDown'); await expect(box).toHaveValue('my draft');
  await box.press('ArrowUp'); await box.type('x'); await box.press('ArrowUp'); await expect(box, 'typing starts a new browse; the edit is the draft').toHaveValue('3d8');
  await box.press('ArrowDown'); await expect(box).toHaveValue('3d8x');
});

test('Enter rolls and records; empty and failed formulas leave no entry; repeats move to the front', async ({ app, page }) => {
  await open(app);
  await roll(page, '2d6'); await roll(page, 'nonsense!!'); await roll(page, '   '); await roll(page, '');
  expect(await hist(page)).toEqual(['2d6']);
  await expect(page.locator('#rollbox')).toHaveClass(/bad|^$/);
  await roll(page, '1d8'); await roll(page, '2d6');
  expect(await hist(page)).toEqual(['2d6', '1d8']);
  expect(await app.run(pd => pd.state.notation)).toBe('2d6');
  await page.locator('#rollbox').fill('4d4'); await page.locator('#rollbtn').click();
  expect((await hist(page))[0], 'the Roll button records too').toBe('4d4');
});

test('history persists across reload, and stays out of the settings store and the bag', async ({ app, page }) => {
  await open(app);
  await roll(page, '5d10'); await roll(page, '2d6');
  const blobs = await page.evaluate(() => ({ s: localStorage.getItem('prettydice.v1') || '', b: localStorage.getItem('prettydice.bag.v1') || '' }));
  expect(blobs.s).not.toContain('5d10'); expect(blobs.b).not.toContain('5d10');
  const json = await app.run(pd => JSON.stringify(pd.bagToJSON ? pd.bagToJSON() : pd.bag));
  expect(json).not.toContain('rollhist'); expect(JSON.parse(json).version ?? 1).toBe(1);
  await page.reload(); await app.ready(); await app.nav.toPlay();
  const box = page.locator('#rollbox'); await box.focus(); await box.press('ArrowUp'); await expect(box).toHaveValue('2d6'); await box.press('ArrowUp');
  await expect(box).toHaveValue('5d10');
});

test('a set name calls the set up and throws it; set names win ties with a valid formula; recorded as the set name', async ({ app, page }) => {
  await open(app);
  const ids = await app.run(pd => [pd.setOps.create({ name: 'Goblins', terms: [{ count: 4, sides: 10 }], mod: 0 }), pd.setOps.create({ name: '2d6', terms: [{ count: 3, sides: 8 }], mod: 0 })]);
  await app.page.waitForTimeout(200);
  await roll(page, 'goblins');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('4d10');
  expect(await app.run(pd => pd.dice.length)).toBe(4);
  expect(await hist(page)).toEqual(['Goblins']);
  await roll(page, '2d6');   // a tie: the set named "2d6" wins over the formula
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('3d8');
  await roll(page, '1d6');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('1d6');
  expect(await hist(page)).toEqual(['1d6', '2d6', 'Goblins']);
  const box = page.locator('#rollbox'); await box.focus(); await box.press('ArrowUp'); await box.press('ArrowUp'); await box.press('ArrowUp');
  await expect(box).toHaveValue('Goblins'); await box.press('Enter'); await expect(box, 'the box clears like a chip pick').toHaveValue('');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('4d10');
  expect(ids.length).toBe(2);
});

test('a set name in the Story lobby releases the hold like a set pick; a typed formula rolls its own dice', async ({ app, page }) => {
  await open(app);
  await app.run(pd => { pd.setOps.create({ name: 'Wolves', terms: [{ count: 2, sides: 12 }], mod: 0 }); });
  await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'yahtzee');
  await app.run(pd => { pd.step(20); pd.renderOnce(); });
  expect(await app.run(pd => !!pd.bag.hold)).toBe(true);
  await roll(page, 'wolves');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('2d12');
  expect(await app.run(pd => !!pd.bag.hold)).toBe(false);
  await app.run(pd => pd.openGames()); await app.page.selectOption('#scorepane select >> nth=0', 'farkle');
  await app.run(pd => { pd.step(20); pd.renderOnce(); });
  await roll(page, '3d4');
  await expect.poll(() => app.run(pd => pd.state.notation)).toBe('3d4');
  expect(await app.run(pd => !!pd.bag.hold)).toBe(false);
});

test('Up/Down in other inputs are untouched; only the roll box browses', async ({ app, page }) => {
  await open(app);
  await roll(page, '2d6');
  await app.run(pd => { const i = document.createElement('input'); i.id = 'probe'; i.type = 'number'; i.value = '5'; document.body.append(i); });
  const probe = page.locator('#probe'); await probe.focus(); await probe.press('ArrowUp');
  await expect(probe).toHaveValue('6');
  await page.locator('#rollbox').fill('');
  await page.locator('#probe').focus(); await page.keyboard.press('ArrowUp');
  await expect(page.locator('#rollbox')).toHaveValue('');
  const box = page.locator('#rollbox'); await box.focus(); await box.press('Shift+ArrowUp'); await expect(box, 'modified arrows are left alone').toHaveValue('');
});

test.describe('phone', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const press = (page, type, x = 100, y = 800) => page.locator('#rollbox').evaluate((el, [type, x, y]) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', bubbles: true, clientX: x, clientY: y, pointerId: 7 })), [type, x, y]);
  test('long press opens the history list; tapping an entry fills the box; outside tap closes; empty history opens nothing', async ({ app, page }) => {
    await open(app);
    await press(page, 'pointerdown'); await page.waitForTimeout(650); await press(page, 'pointerup');
    await expect(page.locator('#rollhist'), 'nothing to list yet').toHaveCount(0);
    await roll(page, '2d6'); await roll(page, '3d8');
    await page.locator('#rollbox').blur();
    await press(page, 'pointerdown'); await page.waitForTimeout(650); await press(page, 'pointerup');
    const list = page.locator('#rollhist'); await expect(list).toBeVisible();
    await expect(list.locator('button')).toHaveText(['3d8', '2d6']);
    const b = await list.boundingBox(); expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(390);
    await list.locator('button', { hasText: '2d6' }).tap();
    await expect(list).toHaveCount(0); await expect(page.locator('#rollbox')).toHaveValue('2d6');
    // a short tap does not open it; an outside tap closes it
    await press(page, 'pointerdown'); await page.waitForTimeout(100); await press(page, 'pointerup'); await page.waitForTimeout(600);
    await expect(page.locator('#rollhist')).toHaveCount(0);
    await press(page, 'pointerdown'); await page.waitForTimeout(650); await press(page, 'pointerup');
    await expect(page.locator('#rollhist')).toBeVisible();
    await page.mouse.click(200, 300); await expect(page.locator('#rollhist')).toHaveCount(0);
  });
});
