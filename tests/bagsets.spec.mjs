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

test('opening a set with a roll puts its dice on the mat, rolls them and logs the result with the set name', async ({ shared: app }) => {
  const r = await app.run(pd => {
    pd.setOps.open('dmg', { roll: true });
    const a = { shape: pd.state.shape, notation: pd.state.notation, dice: pd.dice.length, active: pd.bag.active.set };
    const roll = pd.simRoll(); const last = pd.bag.log[pd.bag.log.length - 1], set = pd.bag.sets.find(s => s.id === 'dmg');
    return { a, log: last, total: set.last && set.last.total, resultText: document.querySelector('#result .tot').textContent, count: pd.bag.log.length, settled: !!roll, chips: document.querySelectorAll('#result .brk .rt .chip').length };
  });
  expect(r.a).toEqual({ shape: 'custom', notation: '2d6@bone+1d8+3', dice: 3, active: 'dmg' });
  expect(r.log.set).toBe('Damage'); expect(r.log.notation).toBe('2d6@bone+1d8+3'); expect(r.log.total).toBe(r.resultText); expect(r.total).toBe(+r.resultText);
  expect(r.count).toBe(1); expect(r.chips).toBe(2);   // a mini die chip in front of each term of the breakdown
  expect(+r.resultText).toBeGreaterThanOrEqual(6); expect(+r.resultText).toBeLessThanOrEqual(23);
});

test('quick roll gives a total and logs it without leaving the screen', async ({ shared: app }) => {
  const r = await app.run(pd => {
    const t = pd.setOps.quick('adv'), set = pd.bag.sets.find(s => s.id === 'adv'), e = pd.bag.log[0];
    return { t, rolling: pd.rolling, last: set.last.total, e, shape: pd.state.shape };
  });
  expect(r.t).toBeGreaterThanOrEqual(2); expect(r.t).toBeLessThanOrEqual(40); expect(r.last).toBe(r.t);
  expect(r.e).toMatchObject({ set: 'Advantage', quick: true, total: String(r.t) }); expect(r.e.detail).toMatch(/^2d20: \d+\+\d+ = \d+$/); expect(r.e.items[0].sides).toBe(20);
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
  await expect(page.locator('#setlist .setrow[data-id="adv"] .term')).toHaveText('2d20');   // a tinted dummy d20 per term
  await page.locator('#setlist .setrow[data-id="adv"] .quick').click();
  await expect(page.locator('#quickres')).toHaveClass(/on/);   // big gold total over the sheet
  await expect(page.locator('#quickres .tot')).toHaveText(/^\d+$/);
  expect(await page.locator('#quickres .tot').evaluate(e => getComputedStyle(e).fontFamily)).toContain('Cinzel');
  await expect(page.locator('#setlist .setrow[data-id="adv"] .main > small')).toContainText('last ');
  expect(await app.run(pd => pd.bag.log.length)).toBe(1);
  await page.locator('#setlist .setrow[data-id="dmg"] .dots').click();
  await page.locator('#cardmenu button', { hasText: 'Delete…' }).click();
  await page.locator('#cardmenu button', { hasText: /^Delete$/ }).click();
  expect(await app.run(pd => pd.bag.sets.map(s => s.id))).toEqual(['adv', 'd6']);
  await page.locator('#setlist .setrow[data-id="adv"] .main').click();
  await expect(page.locator('#bagsheet')).toBeHidden();
  expect(await app.run(pd => ({ n: pd.state.notation, rolling: pd.rolling, placed: pd.placed, log: pd.bag.log.length }))).toEqual({ n: '2d20@amethyst', rolling: true, placed: true, log: 1 });   // placed, not thrown
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

test('opening a set places the dice on the mat at rest; a second action throws them', async ({ shared: app }) => {
  const r = await app.run(pd => {
    pd.setOps.open('dmg');
    const placed = { placed: pd.placed, rolling: pd.rolling, settled: pd.settled, log: pd.bag.log.length, dice: pd.dice.length, result: document.querySelector('#result').textContent };
    const speeds = pd.bodies.map(b => b.velocity.length()), lows = pd.bodies.map(b => b.position.y);
    pd.startRoll(pd.placed); pd.step(1500);
    const after = { placed: pd.placed, log: pd.bag.log.length, set: pd.bag.log[0] && pd.bag.log[0].set, total: document.querySelector('#result .tot') && document.querySelector('#result .tot').textContent };
    return { placed, still: Math.max(...speeds) < 0.5, onTable: Math.max(...lows) < pd.TABLE_Y + 3, after };
  });
  expect(r.placed).toMatchObject({ placed: true, rolling: true, settled: true, log: 0, dice: 3 });
  expect(r.placed.result).toContain('tap Roll'); expect(r.still).toBe(true); expect(r.onTable).toBe(true);
  expect(r.after.placed).toBe(false); expect(r.after.log).toBe(1); expect(r.after.set).toBe('Damage'); expect(+r.after.total).toBeGreaterThan(0);
});

test('the dice-use design recolours the stepper chips, and the stepper cells do not overflow @slow', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await app.run(pd => { pd.bag.designs.find(d => d.id === 'amethyst').design.colors = ['#ff2020', '#20ff20', '#2020ff']; pd.save(); });
  await page.locator('#shapes button[data-id="custom"]').click();
  const bg = () => page.locator('#steppers .step .chip').first().evaluate(e => e.style.backgroundImage);
  const before = await bg();
  await page.locator('#stepdesign').selectOption('amethyst');
  await expect.poll(bg).not.toBe(before);
  for (const vp of [{ width: 1100, height: 800 }, { width: 390, height: 780 }]) {
    await page.setViewportSize(vp);
    const over = await page.locator('#steppers .step').evaluateAll(n => n.filter(e => { const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect(); return e.scrollWidth > e.clientWidth + 1 || r.right > p.right + 1; }).length);
    expect(over).toBe(0);
  }
});

test('the roll log button is only there in roll view @slow', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await expect(page.locator('#logbtn')).toBeHidden();
  await app.run(pd => pd.startRoll());
  await expect(page.locator('#logbtn')).toBeVisible();
  await app.run(pd => { pd.setOps.quick('dmg'); });
  await page.locator('#logbtn').click();
  await expect(page.locator('#logpanel .le .ttl', { hasText: 'Damage' }).first()).toHaveText('Damage ⚡');   // the set's name only; the terms are shown below it
  await page.locator('#logpanel button[aria-label="Close the roll log"]').click();
  await expect(page.locator('#logpanel')).toBeHidden();
  await app.run(pd => pd.exitRoll());
  await expect(page.locator('#logbtn')).toBeHidden();
});

test('Save under the Custom controls adds a new set (a copy) from the current dice', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.locator('#shapes button[data-id="custom"]').click();
  await page.locator('#notation').fill('3d6+2'); await page.locator('#notapply').click();
  await expect(page.locator('#setname')).toHaveAttribute('placeholder', '3d6+2');
  await page.locator('#setsavebtn').click();   // blank name: the formula
  await page.locator('#setname').fill('Sneak attack'); await page.keyboard.press('Enter');
  const r = await app.run(pd => pd.bag.sets.slice(2).map(s => ({ name: s.name, mod: s.mod, terms: s.terms })));
  expect(r).toEqual([{ name: '3d6+2', mod: 2, terms: [{ count: 3, sides: 6 }] }, { name: 'Sneak attack', mod: 2, terms: [{ count: 3, sides: 6 }] }]);
  await expect(page.locator('#setsavebtn')).toHaveText('Saved');
});

test('the bag sheet has Save, Load and Copy icon buttons beside Close', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copied = t; } }, configurable: true }); });
  await page.click('#bagbtn');
  for (const id of ['sheetsave', 'sheetload', 'sheetcopy', 'sheetclose']) await expect(page.locator('#' + id)).toBeVisible();
  const order = await page.locator('#sheethead > *').evaluateAll(n => n.map(e => e.id));
  expect(order.slice(-2)).toEqual(['sheetact', 'sheetclose']);   // the buttons sit right next to Close
  await page.click('#sheetcopy');
  await expect(page.locator('#sheetcopy')).toHaveClass(/ok/);
  expect(JSON.parse(await page.evaluate(() => window.__copied)).format).toBe('pretty-dice-bag');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sheetsave')]);
  expect(dl.suggestedFilename()).toMatch(/\.json$/);
  await app.run(pd => { pd.markBagSaved && pd.markBagSaved(); });
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#sheetload')]).catch(() => [null]);
  if (!fc) await expect(page.locator('#bagask')).toBeVisible();   // a bag with unsaved changes asks first
  await page.setViewportSize({ width: 390, height: 780 });
  const over = await page.locator('#sheethead').evaluate(e => e.scrollWidth > e.clientWidth + 1);
  expect(over).toBe(false);
});

test('the bag name is editable in the sheet title and names the saved file', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  await page.click('#bagbtn');
  await page.locator('#sheettitle .bn').click();
  await page.locator('#sheettitle input').fill('Dungeon night!'); await page.keyboard.press('Enter');
  await expect(page.locator('#sheettitle .bn')).toHaveText('Dungeon night!');
  expect(await app.run(pd => pd.bag.name)).toBe('Dungeon night!');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sheetsave')]);
  expect(dl.suggestedFilename()).toBe('dungeon-night.bag.json');
  await page.locator('#sheetclose').click();
  await expect(page.locator('#bagpos')).toContainText('in Dungeon night!');
  await page.click('#bagbtn'); await page.locator('#sheettitle .bn').click();
  await page.locator('#sheettitle input').fill('Nope'); await page.keyboard.press('Escape');
  expect(await app.run(pd => pd.bag.name)).toBe('Dungeon night!');   // Escape keeps the old name
});

test('scrollbars are thin and dark, and the roll log never scrolls sideways', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  const sb = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('aside')); return { w: c.scrollbarWidth, col: c.scrollbarColor }; });
  expect(sb.w).toBe('thin'); expect(sb.col).toContain('58, 64, 82');
  await app.run(pd => { pd.startRoll(); for (let i = 0; i < 30; i++) pd.setOps.quick('dmg'); });
  await page.locator('#logbtn').click();
  const over = await page.locator('#logpanel').evaluate(e => ({ x: e.scrollWidth > e.clientWidth + 1, y: e.scrollHeight > e.clientHeight }));
  expect(over.x).toBe(false);
});

// PD-124: copy a set, and edit one in place with the Custom controls + single-shape presets.
test('a set can be copied, and edited inline without touching the live Custom selection', async ({ app, page }) => {
  await app.open();
  await app.run(SETUP);
  const live = await app.run(pd => pd.state.notation);
  await page.click('#bagbtn'); await page.locator('#sheettabs button[data-tab="sets"]').click();
  await page.locator('#setlist .setrow[data-id="dmg"] .dots').click();
  await page.locator('#cardmenu button', { hasText: 'Make a copy' }).click();
  expect(await app.run(pd => pd.bag.sets.map(s => [s.id, s.name]))).toEqual([['dmg', 'Damage'], ['damage-copy', 'Damage copy'], ['adv', 'Advantage']]);
  // edit
  await page.locator('#setlist .setrow[data-id="dmg"] .dots').click();
  await page.locator('#cardmenu button', { hasText: 'Edit…' }).click();
  const ed = page.locator('#setlist .seted');
  await expect(ed).toBeVisible();
  await expect(ed.locator('.senote')).toHaveValue('2d6@bone+1d8+3');
  await ed.locator('.presets button', { hasText: /^d12$/ }).click();            // a single-shape preset
  await expect(ed.locator('.senote')).toHaveValue('1d12+3');
  await ed.locator('button[aria-label="Add a d6"]').click();                    // steppers
  await expect(ed.locator('.senote')).toHaveValue('1d6+1d12+3');
  await ed.locator('select').selectOption('amethyst');                          // dice use: the next dice take another design
  await ed.locator('button[aria-label="Add a d4"]').click();
  await expect(ed.locator('.senote')).toHaveValue('1d6+1d12+1d4@amethyst+3');
  await expect(ed.locator('.tch button')).toHaveCount(3);                       // one chip per term
  await ed.locator('button[aria-label="Modifier up"]').click();
  await ed.locator('.sename').fill('Big damage');
  await ed.locator('.acts .primary').click();
  await expect(page.locator('#setlist .seted')).toHaveCount(0);
  const r = await app.run(pd => ({ s: pd.bag.sets[0], live: pd.state.notation }));
  expect(r.s).toMatchObject({ id: 'dmg', name: 'Big damage', mod: 4, terms: [{ count: 1, sides: 6 }, { count: 1, sides: 12 }, { count: 1, sides: 4, design: 'amethyst' }] });
  expect(r.live).toBe(live);                                                    // the live Custom selection was never touched
  // typed formulas and Cancel
  await page.locator('#setlist .setrow[data-id="adv"] .dots').click();
  await page.locator('#cardmenu button', { hasText: 'Edit…' }).click();
  await ed.locator('.senote').fill('d6@nope'); await page.keyboard.press('Enter');
  await expect(ed.locator('.seerr')).toContainText('No design');
  await ed.locator('.presets button', { hasText: /^d4$/ }).click();
  await ed.locator('.acts button', { hasText: 'Cancel' }).click();
  expect(await app.run(pd => pd.bag.sets.find(s => s.id === 'adv').terms)).toEqual([{ count: 2, sides: 20, design: 'amethyst' }]);
});
