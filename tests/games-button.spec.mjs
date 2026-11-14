// PD-142.29: a dedicated, always-visible Games button sits beside the bag button (the long-press tray is gone).
import { test, expect } from './helpers/app.mjs';

test('games button: visible beside the bag button, opens the Games panel, roll button still toggles the view', async ({ shared: app }) => {
  await app.reset(31);
  const page = app.page;
  await expect(page.locator('#gamesbtn')).toBeVisible();
  const g = await page.locator('#gamesbtn').boundingBox(), b = await page.locator('#bagbtn').boundingBox();
  expect(Math.abs(g.x - b.x), 'same column as the bag button').toBeLessThan(2);
  expect(g.width).toBeGreaterThanOrEqual(40);
  expect(await app.run(() => document.getElementById('extras'))).toBe(null);   // the tray is gone
  await page.click('#gamesbtn');
  await expect(page.locator('#gamepanel')).toBeVisible();
  await expect(page.locator('#gamepanel h2')).toHaveText('Games');
  expect(await app.run(pd => pd.rolling)).toBe(false);
  await page.click('#mode');   // a plain tap toggles the view
  expect(await app.run(pd => pd.rolling)).toBe(true);
  await app.run(pd => { pd.exitRoll(true); });
});
