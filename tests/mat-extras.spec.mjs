// PD-142.8: long-press (or right-click) the roll/showcase button on the stage slides out extras (Games).
import { test, expect } from './helpers/app.mjs';

test('extras: long-press opens the tray without toggling the view; tap closes it; Games fires the event', async ({ shared: app }) => {
  await app.reset(31);
  const page = app.page, box = await page.locator('#mode').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  const rolling = () => app.run(pd => pd.rolling);
  expect(await rolling()).toBe(false);
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
  expect(await app.run(pd => pd.extrasOpen), 'tray open').toBe(true);
  expect(await rolling(), 'a long-press does not roll').toBe(false);
  await page.evaluate(() => { window.__gamesEv = 0; document.addEventListener('pd-open-games', () => window.__gamesEv++); });
  await page.click('#xgames');
  expect(await page.evaluate(() => window.__gamesEv)).toBe(1);
  expect(await app.run(pd => pd.extrasOpen), 'closes after choosing').toBe(false);
  await page.click('#mode', { button: 'right' });
  expect(await app.run(pd => pd.extrasOpen), 'right-click opens').toBe(true);
  await page.keyboard.press('Escape');
  expect(await app.run(pd => pd.extrasOpen)).toBe(false);
  await page.click('#mode');   // a plain tap still toggles the view
  expect(await rolling()).toBe(true);
});
