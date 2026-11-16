// Playtest 3 (PD-142.14.3.1): .4 saving a set says so and shows Save; .12 the bag heading does not wrap one word per line.
import { test, expect } from './helpers/app.mjs';
test('bag heading stays on one line; saving a set says so (.12 .4)', async ({ app, page }) => {
  await app.open(); await app.nav.openBag();
  const h = await page.locator('#sheettitle').evaluate(e => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || 20 }));
  expect(h.h).toBeLessThan(h.lh * 1.6 + 4);
  await page.locator('#paneltabs [data-pane="sets"]').click();
  await page.locator('#setsave').click();
  await expect(page.locator('#toast')).toContainText('added to the bag');
  const save = page.locator('#setlist .seted .sesave'); await expect(save).toBeInViewport();
  await save.click(); await expect(page.locator('#toast')).toContainText('Saved');
});
