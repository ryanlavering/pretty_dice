// Owner phone cards, verified with touch emulation at 390px: PD-142.1.1 (held / lean chips sit below the caption, never over it),
// PD-142.14.1.6.3 (a touch on Roll, or a touch outside the dock, dismisses the keyboard; a mouse click on Roll keeps focus).
import { test, expect } from './helpers/app.mjs';
test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
const rect = (p, sel) => p.locator(sel).first().boundingBox();
test('phone: the held chip does not overlap the caption', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  await app.run(async pd => { pd.state.shape = 'custom'; pd.state.notation = '3d6'; await pd.buildDice(); pd.simRoll(); window.__i = [0, 1, 2].find(i => pd.toggleHold(i)); });
  expect(await page.evaluate(() => window.__i)).not.toBeUndefined();
  const chip = page.locator('#result .heldnote'); await expect(chip).toBeVisible();
  const cap = await rect(page, '#name'), c = await chip.boundingBox();
  if (cap && cap.height > 0) { const hit = !(c.y >= cap.y + cap.height || c.y + c.height <= cap.y || c.x >= cap.x + cap.width || c.x + c.width <= cap.x); expect(hit, 'held chip clear of the caption').toBe(false); }
  expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x + c.width).toBeLessThanOrEqual(390);
});
test('phone: a touch on Roll dismisses the keyboard; a touch outside the dock too', async ({ app, page }) => {
  await app.open();
  await app.nav.toPlay();
  await app.run(pd => pd.simRoll());
  const focused = () => page.evaluate(() => document.activeElement && document.activeElement.id);
  await page.locator('#rollbox').tap(); expect(await focused()).toBe('rollbox');
  await page.fill('#rollbox', '2d6');
  const g = await rect(page, '#rollbtn'); await page.touchscreen.tap(g.x + g.width / 2, g.y + g.height / 2);
  await expect.poll(focused).not.toBe('rollbox');
  await app.run(pd => pd.simRoll());
  await page.locator('#rollbox').tap(); expect(await focused()).toBe('rollbox');
  await page.touchscreen.tap(195, 330);   // the mat, well above the dock
  await expect.poll(focused).not.toBe('rollbox');
});
