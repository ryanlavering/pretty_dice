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
test('Adv and Dis on a roll with no d20 explain instead of adding one (.5)', async ({ app, page }) => {
  await open(app);
  await page.fill('#rollbox', '3d6');
  const adv = page.locator('#qbar .dchip[data-adv="h"]'); await adv.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await adv.click();
  await expect(page.locator('#rollbox')).toHaveValue('3d6');
  await expect(page.locator('#qerr')).toContainText('d20');
  await page.fill('#rollbox', '1d20+3'); await adv.click();
  await expect(page.locator('#rollbox')).toHaveValue('2d20kh1+3');
});
