// PD-142.38.3: 'New' callouts. Review builds only (?new=1 here; the artifact build sets __PD_REVIEW). A pulsing dot on the control; press it for the comment;
// tapping the dot / header / outside / Esc collapses it and keeps it unseen; 'Got it' and 'Seen all' retire it, and that persists across a reload.
import { test, expect } from './helpers/app.mjs';
const dots = p => p.locator('.nfdot:not([hidden])');
test('review flag off: nothing is rendered', async ({ app, page }) => {
  await app.open();
  expect(await page.evaluate(() => window.__nf.on)).toBe(false);
  await expect(page.locator('.nfdot')).toHaveCount(0);
  await expect(page.locator('#nfall')).toHaveCount(0);
});
test('dot expands to the comment, collapse keeps it unseen, Got it retires and persists', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.toDesign();
  await expect(dots(page).first()).toBeVisible();
  const n0 = (await page.evaluate(() => window.__nf.unseen())).length; expect(n0).toBeGreaterThan(2);
  const d = dots(page).first(); await d.click();
  await expect(page.locator('.nfbox')).toBeVisible();
  await expect(page.locator('.nfbox .nfgot')).toBeVisible();
  await page.keyboard.press('Escape');                                   // collapse, not retire
  await expect(page.locator('.nfbox')).toBeHidden();
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0);
  await dots(page).first().click(); await page.locator('.nfbox .nfh').click();   // header collapses too
  await expect(page.locator('.nfbox')).toBeHidden();
  await dots(page).first().click(); await page.locator('.nfbox .nfgot').click();   // Got it retires
  await expect(page.locator('.nfbox')).toBeHidden();
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0 - 1);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  expect((await page.evaluate(() => window.__nf.unseen())).length).toBe(n0 - 1);
});
test('Seen all in the drawer retires everything', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.openDrawer();
  await expect(page.locator('#nfall')).toContainText('new');
  await page.locator('#nfall').click();
  expect(await page.evaluate(() => window.__nf.unseen())).toEqual([]);
  await expect(page.locator('.nfdot')).toHaveCount(0);
});
test('the overlay stays inside the phone viewport', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await page.setViewportSize({ width: 390, height: 780 });
  await expect(dots(page).first()).toBeVisible();
  await dots(page).last().click();
  const b = await page.locator('.nfbox').boundingBox();
  expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(390); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(780);
});
