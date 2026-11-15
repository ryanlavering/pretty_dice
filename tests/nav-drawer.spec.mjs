// Navigation slice 1 (PD-142.38): utility drawer, Reset view, Full view.
import { test, expect } from './helpers/app.mjs';

const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };

const items = page => page.evaluate(() => [...document.querySelectorAll('#dmenu .di')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.id));

for (const [name, vp] of Object.entries(SIZES)) {
  test.describe(name, () => {
    test.use({ viewport: vp });

    test('the drawer is a closed button until tapped, holds Sound, Reset view, Full view and Hints, never one item', async ({ app, page }) => {
      await app.open();
      expect(await page.locator('#drawer.open').count(), 'closed by default under test').toBe(0);
      expect(await app.nav.shown('sound'), 'items are hidden while closed').toBe(false);
      await page.locator('#drawerbtn').click();
      await expect(page.locator('#drawer.open')).toHaveCount(1);
      const design = await items(page);
      expect(design).toEqual(expect.arrayContaining(['snd', 'resetview', 'layout', 'info', 'spinbtn']));
      await page.keyboard.press('Escape');
      await expect(page.locator('#drawer.open')).toHaveCount(0);
      await app.nav.toPlay();
      await app.nav.openDrawer();
      const roll = await items(page);
      expect(roll, 'Pause spin is a Design-room item').not.toContain('spinbtn');
      expect(roll).toEqual(expect.arrayContaining(['snd', 'resetview', 'layout', 'info']));
      expect(roll.length, 'never a single item').toBeGreaterThan(1);
    });

    test('an outside tap closes the drawer; an item pick closes it too', async ({ app, page }) => {
      await app.open();
      await app.nav.openDrawer();
      await page.mouse.click(vp.width / 2, vp.height / 3);
      await expect(page.locator('#drawer.open')).toHaveCount(0);
      await app.nav.sound();
      await expect(page.locator('#drawer.open')).toHaveCount(0);
      expect(await app.run(pd => pd.state.sound)).toBe(true);
    });

    test('Reset view restores angle and zoom', async ({ app }) => {
      await app.open();
      await app.run(pd => { pd.orbit.az = 1.2; pd.orbit.el = 0.7; });
      expect(await app.run(pd => pd.orbit.az)).toBeCloseTo(1.2, 3);
      await app.nav.resetView();
      expect(await app.run(pd => [pd.orbit.az, pd.orbit.el])).toEqual([0, 0]);
    });

    test('Full view hides the pane and either handle, the drawer item or H brings it back; the drawer stays reachable', async ({ app, page }) => {
      await app.open();
      expect(await app.nav.shown('panel')).toBe(true);
      await app.nav.fullView(true);
      expect(await app.nav.shown('panel')).toBe(false);
      expect(await app.nav.shown('drawer'), 'drawer still on screen').toBe(true);
      await app.nav.openDrawer();
      expect(await page.locator('#layout').textContent()).toContain('Show pane');
      await app.nav.layout();                       // the drawer item restores it
      expect(await app.nav.shown('panel')).toBe(true);
      await app.nav.fullView(true);
      await page.locator('#paneopen').click();      // the edge handle restores it
      expect(await app.nav.shown('panel')).toBe(true);
      await page.keyboard.press('h'); expect(await app.nav.shown('panel')).toBe(false);
      await page.keyboard.press('h'); expect(await app.nav.shown('panel')).toBe(true);
    });
  });
}

test('the Sound effects checkbox is gone from the panel (the drawer item is the switch)', async ({ app, page }) => {
  await app.open();
  expect(await page.locator('#sound').count()).toBe(0);
});

test('the drawer opens as a pill once when a session starts, then slides shut', async ({ app, page }) => {
  // a slow boot can outlast the pill, so record that it opened instead of polling for the moment
  await page.addInitScript(() => { window.__pillSeen = false; new MutationObserver(() => { const d = document.getElementById('drawer'); if (d && d.classList.contains('open')) window.__pillSeen = true; }).observe(document, { subtree: true, attributes: true, childList: true }); });
  await app.open({ query: 'pill=1' });
  await expect.poll(() => page.evaluate(() => window.__pillSeen), { timeout: 10_000 }).toBe(true);
  await expect(page.locator('#drawer.open')).toHaveCount(0, { timeout: 10_000 });
});

// PD-142.38.1: on a phone the Full view handles are centred up/down chevrons that never overlap a round mat button.
test.describe('phone handles', () => {
  test.use({ viewport: SIZES.phone });
  const overlaps = async (page, handle) => page.evaluate(h => {
    const r = document.querySelector(h).getBoundingClientRect(), hit = [];
    for (const b of document.querySelectorAll('#tools button, #shelf, #drawerbtn')) {
      if (!b.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const q = b.getBoundingClientRect();
      if (q.width && r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top) hit.push(b.id || b.className || b.tagName);
    }
    return hit;
  }, handle);

  test('close and open handles are centred, clear of the round buttons, and point up/down', async ({ app, page }) => {
    await app.open();
    const c = await page.locator('#paneclose').boundingBox();
    expect(Math.abs(c.x + c.width / 2 - 195), 'centred').toBeLessThan(2);
    expect(await overlaps(page, '#paneclose'), 'pane open: close handle overlaps nothing').toEqual([]);
    expect(await page.locator('#paneclose svg').evaluate(e => getComputedStyle(e).transform), 'chevron points down').not.toBe('none');
    await app.nav.fullView(true);
    const o = await page.locator('#paneopen').boundingBox();
    expect(Math.abs(o.x + o.width / 2 - 195), 'centred').toBeLessThan(2);
    expect(await overlaps(page, '#paneopen'), 'full view: open handle overlaps nothing').toEqual([]);
    expect(o.y + o.height, 'sits on the bottom edge').toBeGreaterThan(844 - 2);
  });
});
