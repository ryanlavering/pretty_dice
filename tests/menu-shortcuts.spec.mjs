// PD-203: the What's new menu entry sits at the far end of the menu from Design | Play, resumes the callouts, and a double click on the menu button is the Design | Play switch.
import { test, expect } from './helpers/app.mjs';
const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
const unseen = page => page.evaluate(() => window.__nf.unseen());
const room = page => page.evaluate(() => (document.body.classList.contains('design') ? 'design' : 'play'));

for (const [name, vp] of Object.entries(SIZES)) {
  test(`${name}: What's new is first in the DOM and farthest on screen from Design | Play`, async ({ app, page }) => {
    await page.setViewportSize(vp);
    await app.open({ query: 'new=1' });
    await app.nav.openDrawer();
    const ids = await page.evaluate(() => [...document.querySelectorAll('#dmenu .di')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.id));
    expect(ids[0]).toBe('nfall');
    expect(ids[ids.length - 1]).toBe('roomsw');
    const y = async id => (await page.locator('#' + id).boundingBox()).y;
    const nf = await y('nfall'), sw = await y('roomsw');
    for (const id of ids.filter(i => i !== 'nfall' && i !== 'roomsw')) { const v = await y(id); expect(v).toBeGreaterThan(nf); expect(v).toBeLessThan(sw); }
    expect(Math.abs(nf - sw), 'the two ends are far apart on screen').toBeGreaterThan(100);
  });
}
test('clicking What\'s new opens the lowest remaining item, then resumes the last visited one', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  const un0 = await unseen(page);
  await app.nav.openDrawer(); await page.locator('#nfall').click();
  await expect(page.locator('.nfbox')).toBeVisible();
  await expect(page.locator('.nfcount')).toHaveText(`1 of ${un0.length}`);
  await page.locator('.nfnext').click(); await page.locator('.nfnext').click();
  await expect(page.locator('.nfcount')).toHaveText(`3 of ${un0.length}`);
  await page.keyboard.press('Escape');
  await expect(page.locator('.nfbox')).toBeHidden();
  await app.nav.openDrawer(); await page.locator('#nfall').click();
  await expect(page.locator('.nfcount')).toHaveText(`3 of ${un0.length}`);
  await page.locator('.nfbox .nfgot').click();   // Got it retires item 3 and moves on to the next one, which is now the last visited
  await expect(page.locator('.nfcount')).toHaveText(`3 of ${un0.length - 1}`);
  await page.keyboard.press('Escape');
  await app.nav.openDrawer(); await page.locator('#nfall').click();
  await expect(page.locator('.nfcount')).toHaveText(`3 of ${un0.length - 1}`);
});
test('Clear all needs a double click; a single click shows the hint', async ({ app, page }) => {
  await app.open({ query: 'new=1' });
  await app.nav.openDrawer(); await page.locator('#nfall').click();
  await page.locator('.nfbox .nfclear').click();
  await expect(page.locator('.nfhint')).toHaveText('Double-tap to clear all');
  expect((await unseen(page)).length).toBeGreaterThan(0);
  await page.waitForTimeout(700);
  await page.locator('.nfbox .nfclear').click();   // two slow clicks are not a double
  expect((await unseen(page)).length).toBeGreaterThan(0);
  await page.locator('.nfbox .nfclear').dblclick();
  expect(await unseen(page)).toEqual([]);
});
test('double-click on the menu button switches Design | Play; a single click opens the menu', async ({ app, page }) => {
  await app.open();
  const before = await room(page);
  await page.locator('#drawerbtn').click();
  await expect(page.locator('#drawer.open')).toHaveCount(1);
  expect(await room(page)).toBe(before);
  await page.locator('#drawerbtn').click();
  await expect(page.locator('#drawer.open')).toHaveCount(0);
  await page.locator('#drawerbtn').dblclick();
  await expect.poll(() => room(page)).not.toBe(before);
  await page.waitForTimeout(400);
  await expect(page.locator('#drawer.open')).toHaveCount(0);
  await page.locator('#drawerbtn').dblclick();
  await expect.poll(() => room(page)).toBe(before);
});
test.describe('touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('long-press on the menu button switches rooms and does not open the menu', async ({ app, page }) => {
    await app.open();
    const before = await room(page), b = await page.locator('#drawerbtn').boundingBox();
    const cdp = await page.context().newCDPSession(page), pt = [{ x: b.x + 20, y: b.y + 20 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => room(page)).not.toBe(before);
    await page.waitForTimeout(400);
    await expect(page.locator('#drawer.open')).toHaveCount(0);
  });
});
