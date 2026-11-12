// Dice bag phase 4 (PD-102.4): bag sets, opening a set onto the roll mat, quick roll, and the roll log (PD-68).
import { test, expect } from './helpers/app.mjs';

const SETUP = async pd => {
  const mk = (shape, substrate, name) => ({ ...pd.designToJSON(), shape, substrate, name });
  await pd.importBag({ format: 'pretty-dice-bag', version: 1, name: 'Test bag', designs: [
    { id: 'amethyst', name: 'Amethyst', design: mk('d20', 'swirl', 'Amethyst') },
    { id: 'bone', name: 'Bone', design: mk('d6', 'solid', 'Bone') }],
  sets: [{ id: 'dmg', name: 'Damage', terms: [{ count: 2, sides: 6, design: 'bone' }, { count: 1, sides: 8 }], mod: 3 }, { id: 'adv', name: 'Advantage', terms: [{ count: 2, sides: 20, design: 'amethyst' }], mod: 0 }],
  active: { design: 'bone' } }, { replace: true });
};

test.beforeEach(async ({ shared }) => { await shared.reset(1); await shared.run(SETUP); });

test('save, rename, reorder and delete bag sets; they export and re-import', async ({ shared: app }) => {
  const r = await app.run(async pd => {
    const out = {}; out.start = pd.bag.sets.map(s => s.id);
    pd.state.notation = '3d6+d10@amethyst+2'; pd.state.shape = 'custom';
    const id = pd.setOps.saveCurrent('Fireball'); out.saved = pd.bag.sets.find(s => s.id === id);
    pd.setOps.rename(id, '  Fire  '); out.renamed = pd.bag.sets.find(s => s.id === id).name;
    pd.setOps.move(id, 0); out.order = pd.bag.sets.map(s => s.id);
    const file = pd.bagFileJSON(); out.inFile = file.sets.length;
    await pd.importBag(file, { replace: true }); out.after = pd.bag.sets.map(s => s.name);
    pd.setOps.remove(id); out.removed = pd.bag.sets.map(s => s.id);
    return out;
  });
  expect(r.start).toEqual(['dmg', 'adv']);
  expect(r.saved).toMatchObject({ id: 'fireball', mod: 2, terms: [{ count: 3, sides: 6 }, { count: 1, sides: 10, design: 'amethyst' }] });
  expect(r.renamed).toBe('Fire'); expect(r.order[0]).toBe('fireball'); expect(r.inFile).toBe(3);
  expect(r.after).toEqual(['Fire', 'Damage', 'Advantage']);
  expect(r.removed).toEqual(['dmg', 'adv']);
});

test('opening a set puts its dice on the mat, rolls them and logs the result with the set name', async ({ shared: app }) => {
  const r = await app.run(pd => {
    pd.setOps.open('dmg');
    const a = { shape: pd.state.shape, notation: pd.state.notation, dice: pd.dice.length, active: pd.bag.active.set };
    const roll = pd.simRoll(); const last = pd.bag.log[pd.bag.log.length - 1], set = pd.bag.sets.find(s => s.id === 'dmg');
    return { a, log: last, total: set.last && set.last.total, resultText: document.querySelector('#result .tot').textContent, count: pd.bag.log.length, settled: !!roll };
  });
  expect(r.a).toEqual({ shape: 'custom', notation: '2d6@bone+1d8+3', dice: 3, active: 'dmg' });
  expect(r.log.set).toBe('Damage'); expect(r.log.notation).toBe('2d6@bone+1d8+3'); expect(r.log.total).toBe(r.resultText); expect(r.total).toBe(+r.resultText);
  expect(r.count).toBe(1);
  expect(+r.resultText).toBeGreaterThanOrEqual(6); expect(+r.resultText).toBeLessThanOrEqual(23);
});

test('quick roll gives a total and logs it without leaving the screen', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const t = pd.setOps.quick('adv'), set = pd.bag.sets.find(s => s.id === 'adv'), e = pd.bag.log[0];
    return { t, rolling: pd.rolling, last: set.last.total, e, shape: pd.state.shape };
  });
  expect(r.t).toBeGreaterThanOrEqual(2); expect(r.t).toBeLessThanOrEqual(40); expect(r.last).toBe(r.t);
  expect(r.e).toMatchObject({ set: 'Advantage', quick: true, total: String(r.t) }); expect(r.e.detail).toMatch(/^2d20: \d+\+\d+ = \d+$/);
  expect(r.rolling).toBeFalsy(); expect(r.shape).not.toBe('custom');
});

test('the roll log keeps the last 200 rolls and rolls without a set are logged too', async ({ shared: app }) => {
  const r = await app.run(pd => {
    for (let i = 0; i < 205; i++) pd.setOps.quick('dmg');
    const n = pd.bag.log.length; pd.state.shape = 'd20'; pd.buildDice(); pd.simRoll();
    const e = pd.bag.log[pd.bag.log.length - 1];
    return { n, after: pd.bag.log.length, e };
  });
  expect(r.n).toBe(200); expect(r.after).toBe(200); expect(r.e.set).toBeNull(); expect(r.e.notation).toBe('d20');
});

test('Sets tab: save the current dice, quick roll, open on the mat, delete from the menu @slow', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.click('#bagbtn');
  await page.locator('#sheettabs button[data-tab="sets"]').click();
  await expect(page.locator('#setlist .setrow')).toHaveCount(2);
  await page.locator('#setsave').click();
  await page.locator('#setlist input.nmedit').fill('Mine'); await page.keyboard.press('Enter');
  await expect(page.locator('#setlist .setrow')).toHaveCount(3);
  await expect(page.locator('#setlist .setrow .nm', { hasText: 'Mine' })).toBeVisible();
  await expect(page.locator('#setlist .setrow[data-id="adv"] .term')).toHaveText('d20 ×2');   // a tinted dummy d20 per term
  await page.locator('#setlist .setrow[data-id="adv"] .quick').click();
  await expect(page.locator('#setlist .setrow[data-id="adv"] small')).toContainText('last ');
  expect(await app.run(pd => pd.bag.log.length)).toBe(1);
  await page.locator('#setlist .setrow[data-id="dmg"] .dots').click();
  await page.locator('#cardmenu button', { hasText: 'Delete…' }).click();
  await page.locator('#cardmenu button', { hasText: /^Delete$/ }).click();
  expect(await app.run(pd => pd.bag.sets.map(s => s.id))).toEqual(['adv', 'd6']);
  await page.locator('#setlist .setrow[data-id="adv"] .main').click();
  await expect(page.locator('#bagsheet')).toBeHidden();
  expect(await app.run(pd => ({ n: pd.state.notation, rolling: pd.rolling }))).toEqual({ n: '2d20@amethyst', rolling: true });
  await page.locator('#logbtn').click();
  await expect(page.locator('#logpanel .le')).toHaveCount(1);
});

test('saving the current dice names the set after what is selected', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const add = (shape, notation) => { pd.state.shape = shape; if (notation) pd.state.notation = notation; const id = pd.setOps.saveCurrent(); return pd.bag.sets.find(s => s.id === id); };
    const custom = add('custom', '3d6+d10@amethyst+2'), s7 = add('set7'), d12 = add('d12', '4d4'), pct = add('d100');   // the stale custom text is ignored when Custom is not selected
    return { custom: [custom.name, custom.mod], s7: [s7.name, s7.terms.map(t => t.sides)], d12: [d12.name, d12.terms], pct: [pct.name, pct.terms] };
  });
  expect(r.custom).toEqual(['3d6+1d10+2', 2]);
  expect(r.s7).toEqual(['Standard 7', [4, 6, 8, 10, 100, 12, 20]]);
  expect(r.d12).toEqual(['d12', [{ count: 1, sides: 12 }]]);
  expect(r.pct).toEqual(['d%', [{ count: 1, sides: 100 }]]);
});

test('Copy bag JSON puts the bag file text on the clipboard @slow', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); });
  await page.locator('#copybag').click();
  await expect(page.locator('#copybag')).toHaveText('Copied');
  const j = JSON.parse(await page.evaluate(() => window.__copied));
  expect(j.format).toBe('pretty-dice-bag'); expect(j.designs.map(d => d.id)).toEqual(['amethyst', 'bone']); expect(j.sets.length).toBe(2);
});
