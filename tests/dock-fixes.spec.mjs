// Playtest 3 dock cards (PD-142.14.3.1): .1 the box is readable unfocused, .2 Roll never scrolls away with the chips, .3 a set chip replaces typed text, .5 Adv/Dis explains itself without a d20.
import { test, expect } from './helpers/app.mjs';
test.use({ viewport: { width: 390, height: 844 } });
const open = async app => { await app.open(); await app.nav.toPlay(); await app.run(pd => { pd.setOps.saveCurrent('Goblins'); pd.simRoll(); }); await app.page.waitForTimeout(300); };
test('the unfocused box is readable and Roll stays put while the chips scroll (.1 .2)', async ({ app, page }) => {
  await open(app);
  const box = await page.locator('#rollbox').boundingBox(); expect(box.width, 'box is not a sliver').toBeGreaterThanOrEqual(100);
  const r0 = await page.locator('#rollbtn').boundingBox();
  await page.locator('#qchips').evaluate(e => { e.scrollLeft = 1e5; });
  const r1 = await page.locator('#rollbtn').boundingBox();
  expect(r1.x).toBe(r0.x); expect(r1.x + r1.width).toBeLessThanOrEqual(390);
  expect(await page.locator('#qchips').evaluate(e => e.scrollWidth > e.clientWidth), 'the chips are the part that scrolls').toBe(true);
  await page.locator('#rollbox').focus();
  const r2 = await page.locator('#rollbtn').boundingBox(); expect(r2.x + r2.width, 'Roll still on screen with the box focused').toBeLessThanOrEqual(390);
  await page.locator('#rollbtn').click();   // a plain click rolls: it does not just scroll the dock
});
test('a set chip replaces the typed dock text (.3)', async ({ app, page }) => {
  await open(app);
  await page.fill('#rollbox', '5d10+2');
  const chip = page.locator('#qbar .dchip[data-set]').first(); await chip.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await chip.click();
  await expect(page.locator('#rollbox')).toHaveValue('');
  expect(await app.run(pd => pd.state.notation)).not.toBe('5d10+2');
});
test('dock Adv/Dis insert d20adv like the Custom chips: tap replaces, double-click adds, never edits an existing die (PD-142.38.46)', async ({ app, page }) => {
  await open(app);
  const adv = page.locator('#qbar .dchip[data-adv="h"]'), dis = page.locator('#qbar .dchip[data-adv="l"]'), box = page.locator('#rollbox');
  await adv.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
  await box.fill(''); await adv.click(); await expect(box, 'empty box, tap').toHaveValue('2d20kh1');
  await box.fill('1d20'); await page.waitForTimeout(300); await adv.click(); await expect(box, '1d20, tap: replaced, not modified').toHaveValue('2d20kh1');
  await box.fill('1d20'); await page.waitForTimeout(500); await adv.dblclick(); await expect(box, '1d20, double-click: added').toHaveValue('1d20+2d20kh1');
  await box.fill('2d6+3'); await page.waitForTimeout(500); await adv.click(); await expect(box, '2d6+3, tap: replaced').toHaveValue('2d20kh1');
  await box.fill('2d6+3'); await page.waitForTimeout(500); await dis.dblclick(); await expect(box, '2d6+3, double-click: added, modifier kept').toHaveValue('2d6+2d20kl1+3');
  await box.fill('2d20kh1'); await page.waitForTimeout(500); await dis.click(); await expect(box, 'existing adv, tap Dis: replaced').toHaveValue('2d20kl1');
  await box.fill('2d20kh1'); await page.waitForTimeout(500); await dis.dblclick(); await expect(box, 'existing adv, double-click Dis: added').toHaveValue('2d20kh1+2d20kl1');
  await expect(page.locator('#qerr')).toHaveText('');
});
test('picking a set by any path empties the box, so Roll throws the set, not the stale chip formula (PD-225)', async ({ app, page }) => {
  await open(app);
  const id = await app.run(pd => pd.setOps.create({ name: 'Animals', terms: [{ count: 1, sides: 12 }], mod: 0, table: '1-6 Goat\n7-12 Horse' }));
  const box = page.locator('#rollbox'), st = () => app.run(pd => ({ n: pd.state.notation, set: pd.bag.active.set }));
  await page.locator('#qbar .dchip[data-die="20"]').click(); await page.waitForTimeout(400);
  await expect(box).toHaveValue('1d20');
  await app.run((pd, id) => { pd.setOps.open(id); }, id);   // what a sheet row or the Open menu does (the hotbar set chip already cleared the box)
  await expect(box).toHaveValue('');
  await page.locator('#rollbtn').click();
  expect(await st(), 'Roll threw the set, not 1d20').toMatchObject({ n: '1d12', set: id });
});
