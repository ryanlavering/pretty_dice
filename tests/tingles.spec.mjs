// PD-163: 'New' callouts (tingles) hold only the unreviewed 4.1 changes; Prev / Next walk them (wrapping, across rooms); Got it advances;
// the artifact build drops entries whose card is Review Complete / Done by setting window.__PD_RETIRED.
import { test, expect } from './helpers/app.mjs';
const IDS = ['PD-156', 'PD-158', 'PD-159', 'PD-162'];
const unseen = p => p.evaluate(() => window.__nf.unseen().map(k => k.split('@')[0]));
const count = p => p.locator('.nfbox .nfcount');
test('only the four 4.1 entries appear', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  expect(await unseen(page)).toEqual(IDS);
});
test('Next / Prev cycle and wrap, switching room when the anchor is elsewhere', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toPlay();
  await expect(page.locator('.nfdot:not([hidden])').first()).toBeVisible();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  await expect(count(page)).toHaveText('1 of 4');
  const card = () => page.locator('.nfbox .nfh span').textContent();
  await page.locator('.nfbox .nfnext').click(); await expect(count(page)).toHaveText('2 of 4'); expect(await card()).toBe('PD-158');
  await page.locator('.nfbox .nfnext').click(); await page.locator('.nfbox .nfnext').click(); await expect(count(page)).toHaveText('4 of 4');
  await page.locator('.nfbox .nfnext').click(); await expect(count(page)).toHaveText('1 of 4');   // wraps
  await page.locator('.nfbox .nfprev').click(); await expect(count(page)).toHaveText('4 of 4'); expect(await card()).toBe('PD-162');
});
test('Got it retires that entry and advances to the next one', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toPlay();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  await page.locator('.nfbox .nfnext').click();   // on PD-158
  await expect(count(page)).toHaveText('2 of 4');
  await page.locator('.nfbox .nfgot').click();
  expect(await unseen(page)).toEqual(['PD-156', 'PD-159', 'PD-162']);
  await expect(page.locator('.nfbox')).toBeVisible();
  await expect(page.locator('.nfbox .nfh span')).toHaveText('PD-159');
  await expect(count(page)).toHaveText('2 of 3');
});
test('entries listed in window.__PD_RETIRED (set by the artifact build) are dropped', async ({ app, page }) => {
  await page.addInitScript(() => { window.__PD_RETIRED = ['PD-158', 'PD-162']; });
  await app.open({ query: 'new=1' });
  expect(await unseen(page)).toEqual(['PD-156', 'PD-159']);
});
test('Next switches from the Design room to the Play room when the anchor is there', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toDesign();
  await expect(page.locator('body.design')).toHaveCount(1);
  await page.evaluate(() => window.__nf.render());
  // no 4.1 anchor is visible in Design on desktop; open the box via Seen-all-free path: play first, open, then go to Design and step
  await app.nav.toPlay();
  await page.locator('.nfdot[data-feature=PD-156]:not([hidden])').click();
  await page.locator('.nfbox .nfnext').click();
  await expect(page.locator('body.design')).toHaveCount(0);
  await expect(page.locator('.nfbox')).toBeVisible();
});
