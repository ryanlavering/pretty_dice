// Owner artifact comments 2026-11-15 (PD-142.38.6-.10): Sound section with basic controls first; Finish labels flush with the slider; Bag button bottom-left in Play;
// Design | Play in the drawer in Full view; the whole dock chip row on desktop.
import { test, expect } from './helpers/app.mjs';
const box = (p, sel) => p.locator(sel).first().boundingBox();
for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['phone', { width: 390, height: 780 }]]) {
  test(`${name}: Finish end labels line up with the slider ends (.38.7)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open(); await app.nav.toDesign();
    const s = await box(page, '#polish'), m = await box(page, '.slends .ends span:first-child'), g = await box(page, '.slends .ends span:last-child');
    expect(Math.abs(m.x - s.x), 'matte starts at the slider left').toBeLessThanOrEqual(2);
    expect(Math.abs((g.x + g.width) - (s.x + s.width)), 'gloss ends at the slider right').toBeLessThanOrEqual(2);
  });
  test(`${name}: Bag button bottom-left in Play opens the bag and keeps clear of the dock (.38.8)`, async ({ app, page }) => {
    await page.setViewportSize(vp); await app.open();
    await app.nav.toDesign(); await expect(page.locator('#bagbtn')).toBeHidden();
    await app.nav.toPlay(); await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
    const b = await box(page, '#bagbtn'), q = await box(page, '#qbar'); expect(b, 'the button is on screen in Play').toBeTruthy();
    expect(b.x + b.width <= q.x + 1 || b.y + b.height <= q.y || b.y >= q.y + q.height, 'no overlap with the dock').toBe(true);
    const st = await box(page, '#stage'); expect(b.x - st.x, 'at the left edge of the table').toBeLessThan(80); expect(b.y).toBeGreaterThan(vp.height * 0.3);
    await app.run(pd => pd.bagOps.rename(pd.bag.designs[0].id, 'Renamed')); await expect(page.locator('#bagbtn')).toHaveClass(/dirty/);   // the unsaved-changes dot
    await page.locator('#bagbtn').click();
    await expect(page.locator('#bagsheet')).toBeVisible();
    await expect(page.locator('#tiles')).toBeVisible();
  });
}
test('Full view: the drawer carries Design | Play, and only in Full view (.38.9)', async ({ app, page }) => {
  await app.open(); await app.nav.toPlay();
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeHidden(); await app.nav.closeDrawer();
  await app.nav.fullView(true);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toBeVisible(); await expect(page.locator('#roomsw')).toContainText('Design');
  await page.locator('#roomsw').click();
  await expect(page.locator('body')).toHaveClass(/design/);
  await app.nav.openDrawer(); await expect(page.locator('#roomsw')).toContainText('Play');
});
test('desktop: the dock shows all seven dice and Adv/Dis without scrolling (.38.10)', async ({ app, page }) => {
  await page.setViewportSize({ width: 1280, height: 800 }); await app.open(); await app.nav.toPlay();
  await app.run(pd => pd.simRoll()); await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const c = document.getElementById('qchips'); return { fits: c.scrollWidth <= c.clientWidth + 1, n: c.querySelectorAll('[data-die]').length, adv: c.querySelectorAll('[data-adv]').length }; });
  expect(r.n).toBe(7); expect(r.adv).toBe(2); expect(r.fits, 'no horizontal scroll needed on desktop').toBe(true);
});
