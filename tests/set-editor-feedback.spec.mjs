// Playtest 3 (PD-142.14.3.1): .4 the set editor is draft-first (nothing is in the bag until Save; Close discards; New set opens an empty draft); .12 the bag heading does not wrap one word per line.
import { test, expect } from './helpers/app.mjs';
const sets = app => app.run(pd => pd.bag.sets.length);
test('bag heading stays on one line (.12)', async ({ app, page }) => {
  await app.open(); await app.nav.openBag();
  const h = await page.locator('#sheettitle').evaluate(e => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || 20 }));
  expect(h.h).toBeLessThan(h.lh * 1.6 + 4);
});
test('Save the current dice as a set opens a draft; the bag changes only on Save (.4)', async ({ app, page }) => {
  await app.open(); await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click();
  const n0 = await sets(app);
  await page.locator('#setsave').click();
  await expect(page.locator('#setlist .seted')).toBeVisible();
  expect(await sets(app), 'a draft is not in the bag yet').toBe(n0);
  await expect(page.locator('#setlist .seted .sesave')).toBeInViewport();
  await page.locator('#setlist .seted .sename').fill('Draft one');
  await page.locator('#setlist .seted .sesave').click();
  await expect(page.locator('#toast')).toContainText('Saved');
  expect(await sets(app)).toBe(n0 + 1);
  expect(await app.run(pd => pd.bag.sets.at(-1).name)).toBe('Draft one');
});
test('closing a draft discards it (.4)', async ({ app, page }) => {
  await app.open(); await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click();
  const n0 = await sets(app);
  await page.locator('#setsave').click(); await page.locator('#setlist .seted .sename').fill('Never kept');
  await page.locator('#setlist .seted .seclose').click();
  await page.locator('.menu button, #cardmenu button', { hasText: 'Discard' }).first().click();
  await expect(page.locator('#setlist .seted')).toHaveCount(0);
  expect(await sets(app)).toBe(n0);
});
test('New set opens an empty blank draft; Save needs a die (.4)', async ({ app, page }) => {
  await app.open(); await app.nav.openBag(); await page.locator('#sheettabs [data-tab="sets"]').click();
  const n0 = await sets(app);
  await page.locator('#setnew').click();
  await expect(page.locator('#setlist .seted')).toBeVisible();
  expect(await sets(app)).toBe(n0);
  await expect(page.locator('#setlist .seted .senote')).toHaveValue('');
  await page.locator('#setlist .seted .sesave').click();
  await expect(page.locator('#setlist .seted .seerr')).toContainText('at least one die');
  expect(await sets(app)).toBe(n0);
  await page.locator('#setlist .seted .presets button', { hasText: 'd8' }).first().click();
  await page.locator('#setlist .seted .sesave').click();
  expect(await sets(app)).toBe(n0 + 1);
  expect(await app.run(pd => pd.bag.sets.at(-1).terms.length)).toBe(1);
});
